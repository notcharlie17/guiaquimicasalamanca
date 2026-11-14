// Latido: Vercel lo llama cada pocos días (ver "crons" en vercel.json) y hace una lectura mínima a Supabase.
// El plan gratuito de Supabase PAUSA el proyecto tras una semana sin actividad (la web deja de funcionar y,
// pasado un tiempo, el proyecto se puede borrar). Esta llamada evita que eso ocurra.
const SB_URL = "https://kjlkrimplppagbkvvqwx.supabase.co";
const SB_KEY = "sb_publishable_vrF0mEiUCL-haBH-zHTjEA_IJ7ui6Az";

module.exports = async (req, res) => {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    const r = await fetch(SB_URL + "/rest/v1/analisis?select=subj&limit=1", { headers: { apikey: SB_KEY } });
    res.statusCode = r.ok ? 200 : 502;
    res.end(JSON.stringify({ ok: r.ok, supabase: r.status, at: new Date().toISOString() }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: String(e && e.message || e), at: new Date().toISOString() }));
  }
};
