# Química USAL

Guía de estudio y predicción de exámenes del Grado en Química (USAL).

- `index.html`: la web (se publica sola en Vercel con cada cambio en `main`).
- `bdocs/`: apuntes y exámenes incluidos, por asignatura.
- `api/ai.js`: función de servidor que llama a la IA. Necesita la variable `ANTHROPIC_API_KEY` (o `GEMINI_API_KEY`) en Vercel → Settings → Environment Variables. Opcional: `ALLOWED_EMAILS` (correos sin @usal.es que pueden usar la IA, separados por comas).
- Datos, cuentas y archivos: Supabase (proyecto GuiaQuimicaSalamanca).
