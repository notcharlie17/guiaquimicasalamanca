# Química USAL

Guía de estudio y predicción de exámenes del Grado en Química (USAL).

- `index.html`: la web (se publica sola en Vercel con cada cambio en `main`).
- `bdocs/`: apuntes y exámenes incluidos, por asignatura (texto extraído y ejercicios).
- `docs/`: PDF originales publicados y `docs/manifest.json` (lista que lee la Biblioteca de PDF). **No se edita a mano**: lo genera `sincronizar.mjs` desde la carpeta `Contenido-QuimicaUSAL` del escritorio.
- `api/ai.js`: función de servidor que llama a la IA. Necesita la variable `ANTHROPIC_API_KEY` (o `GEMINI_API_KEY`) en Vercel → Settings → Environment Variables. Opcional: `AI_DAILY_LIMIT` (consultas a la IA por persona y día; 40 por defecto, sin límite para administradores).
- `api/ping.js`: latido que Vercel ejecuta cada 3 días (`crons` en `vercel.json`) para que Supabase **no pause el proyecto** por inactividad (en el plan gratuito se pausa tras 1 semana sin uso y la web deja de funcionar).
- Datos, cuentas y archivos: Supabase (proyecto GuiaQuimicaSalamanca, `kjlkrimplppagbkvvqwx`).

## Comportamiento

- Se puede usar toda la web **sin cuenta**; el progreso y los horarios se guardan en el navegador. Con cuenta se guardan en Supabase, se sincronizan entre dispositivos y se desbloquean la IA, la subida de documentos y los PDF originales (candado solo visual: `PDF_REQUIERE_CUENTA` en `index.html`).
- Horarios de estudio: botón «Descargar horario en PDF» en el Planificador (jsPDF desde cdnjs).
- Notación química en los textos extraídos de PDF (`H2O` → H₂O, `10-2` → 10⁻², `SO42-` → SO₄²⁻, flechas…): funciones `chemFmt` y `reflowStmt` en `index.html`.

## Añadir PDF o asignaturas

Copia los archivos a `Escritorio\Contenido-QuimicaUSAL\<N.º Curso>\<Asignatura>\…` y ejecuta `sincronizar.bat` (copia a `docs/`, regenera el manifiesto, hace commit y push).
