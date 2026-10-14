// Función de servidor: recibe la petición de la web, comprueba la sesión de Supabase
// y llama a la IA (Claude si hay ANTHROPIC_API_KEY, si no Gemini con GEMINI_API_KEY).
// Las claves secretas viven en Vercel → Settings → Environment Variables, nunca en la página.
const SB_URL = "https://kjlkrimplppagbkvvqwx.supabase.co";
const SB_KEY = "sb_publishable_vrF0mEiUCL-haBH-zHTjEA_IJ7ui6Az";

const SYSTEM = "Eres el asistente de una web de estudio del Grado en Química de la Universidad de Salamanca. Responde en español, con rigor, siguiendo exactamente el formato que pida cada consulta. Usa LaTeX entre $...$ o $$...$$ para las fórmulas.";

function fail(res, status, code, message) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ code, message }));
}

async function sbUser(token) {
  const r = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_KEY, authorization: "Bearer " + token } });
  if (!r.ok) return null;
  return r.json();
}

function merge(messages) {
  const out = [];
  for (const m of messages) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = String(m.content || "");
    if (!content) continue;
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].content += "\n\n" + content;
    else out.push({ role, content });
  }
  if (out.length && out[0].role !== "user") out.unshift({ role: "user", content: "(inicio)" });
  return out;
}

async function* sse(body) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith("data:")) {
        const d = line.slice(5).trim();
        if (d && d !== "[DONE]") { try { yield JSON.parse(d); } catch (e) {} }
      }
    }
  }
}

function errCode(status, text) {
  if (status === 429 || status === 529) return "rate_limited";
  if (status === 413 || /too long|too large|exceeds|maximum context|token count/i.test(text)) return "prompt_too_large";
  return "upstream_error";
}

async function callClaude(key, msgs, images, tier) {
  const model = tier === "complex" ? (process.env.CLAUDE_MODEL_COMPLEX || process.env.CLAUDE_MODEL || "claude-sonnet-5-5")
    : tier === "quick" ? (process.env.CLAUDE_MODEL_QUICK || "claude-haiku-5-5")
    : (process.env.CLAUDE_MODEL || "claude-sonnet-5-5");
  const messages = msgs.map((m, i) => {
    const parts = [];
    if (i === msgs.length - 1 && m.role === "user")
      for (const im of images) parts.push({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } });
    parts.push({ type: "text", text: m.content });
    return { role: m.role, content: parts };
  });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: tier === "complex" ? 16000 : 8000, stream: true, system: SYSTEM, messages }),
  });
  return { r, pick: ev => (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") ? ev.delta.text : (ev.type === "error" ? { error: ev.error } : "") };
}

async function callGemini(key, msgs, images, tier, json) {
  const model = tier === "complex" ? (process.env.GEMINI_MODEL_COMPLEX || process.env.GEMINI_MODEL || "gemini-2.5-flash")
    : (process.env.GEMINI_MODEL || "gemini-2.5-flash");
  const contents = msgs.map((m, i) => {
    const parts = [{ text: m.content }];
    if (i === msgs.length - 1 && m.role === "user") for (const im of images) parts.push({ inline_data: { mime_type: im.type, data: im.data } });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
  const cfg = { maxOutputTokens: 16384 };
  if (json) cfg.responseMimeType = "application/json";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents, generationConfig: cfg,
      safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map(category => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
    }),
  });
  return { r, pick: ev => ((ev.candidates && ev.candidates[0] && ev.candidates[0].content && ev.candidates[0].content.parts) || []).map(p => p.thought ? "" : (p.text || "")).join("") };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "method", "Usa POST");
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return fail(res, 401, "login_required", "Inicia sesión para usar la IA.");
  const user = await sbUser(token).catch(() => null);
  if (!user || !user.email) return fail(res, 401, "login_required", "Tu sesión ha caducado: vuelve a entrar.");
  const allowed = (process.env.ALLOWED_EMAILS || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
  const email = user.email.toLowerCase();
  if (!/@usal\.es$/.test(email) && !allowed.includes(email)) return fail(res, 403, "not_granted", "La IA es solo para cuentas @usal.es.");

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const msgs = merge(Array.isArray(body.messages) ? body.messages : []);
  if (!msgs.length) return fail(res, 400, "bad_request", "Consulta vacía.");
  if (JSON.stringify(msgs).length > 300000) return fail(res, 413, "prompt_too_large", "El material es demasiado largo para una sola consulta.");
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, 6).filter(im => im && im.data && /^image\//.test(im.type || ""));
  const tier = ["quick", "default", "complex"].includes(body.tier) ? body.tier : "default";

  const KA = process.env.ANTHROPIC_API_KEY, KG = process.env.GEMINI_API_KEY;
  if (!KA && !KG) return fail(res, 503, "sampling_disabled", "Falta configurar la clave de la IA en Vercel.");

  let call;
  try { call = KA ? await callClaude(KA, msgs, images, tier) : await callGemini(KG, msgs, images, tier, !!body.json); }
  catch (e) { return fail(res, 502, "upstream_error", "No se ha podido conectar con la IA."); }
  const { r, pick } = call;
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    console.error("IA", r.status, t.slice(0, 500));
    return fail(res, r.status === 429 ? 429 : r.status === 413 ? 413 : 502, errCode(r.status, t), "La IA ha devuelto un error (" + r.status + ").");
  }
  res.statusCode = 200;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("x-accel-buffering", "no");
  let any = false;
  try {
    for await (const ev of sse(r.body)) {
      const x = pick(ev);
      if (x && typeof x === "object" && x.error) { res.write("\n[[ERROR:" + errCode(0, JSON.stringify(x.error)) + "]]"); return res.end(); }
      if (x) { any = true; res.write(x); }
    }
    if (!any) res.write("[[ERROR:refused]]");
  } catch (e) {
    res.write("\n[[ERROR:upstream_error]]");
  }
  res.end();
};
