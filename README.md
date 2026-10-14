# Química USAL

Guía de estudio y predicción de exámenes del Grado en Química (USAL).

- `index.html`: la web (se publica sola en Vercel con cada cambio en `main`).
- `bdocs/`: apuntes y exámenes incluidos, por asignatura.
- `api/ai.js`: función de servidor que llama a la IA. Necesita la variable `ANTHROPIC_API_KEY` (o `GEMINI_API_KEY`) en Vercel → Settings → Environment Variables. Opcional: `AI_DAILY_LIMIT` (consultas a la IA por persona y día; 40 por defecto, sin límite para administradores).
- Datos, cuentas y archivos: Supabase (proyecto GuiaQuimicaSalamanca).
