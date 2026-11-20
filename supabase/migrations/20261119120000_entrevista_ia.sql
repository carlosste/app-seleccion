-- Entrevista analizada con IA (2026-11-19, decisión de Carlos).
-- La entrevista se hace fuera de la app (Teams, Meet, Zoom). Gestión humana pega o sube la
-- transcripción en el detalle del postulante y la IA la analiza con la rúbrica del cargo.
-- La transcripción y el análisis los escribe el servidor con la service role, después de
-- comprobar que la postulación es de la empresa de la sesión.

-- 1. Tarea nueva: el análisis va aparte del puntaje de las preguntas (puntuar_rubrica).
alter type public.tarea_ia add value if not exists 'analizar_entrevista';

-- 2. Una entrevista por postulación (la tabla estaba vacía al aplicar esto).
alter table public.entrevistas
  add constraint entrevistas_postulacion_unica unique (postulacion_id);

-- Quién es el candidato en la transcripción (el nombre del hablante tal como lo escribe
-- Teams), para analizar solo lo que dijo. Y cuándo se guardó por última vez.
alter table public.entrevistas
  add column if not exists hablante_candidato text,
  add column if not exists actualizada_at timestamptz not null default now();

-- Una hora de conversación son unos 60.000 a 80.000 caracteres: 200.000 deja margen.
alter table public.entrevistas
  add constraint entrevistas_transcripcion_largo check (transcripcion is null or char_length(transcripcion) <= 200000),
  add constraint entrevistas_hablante_largo check (hablante_candidato is null or char_length(hablante_candidato) <= 120);
