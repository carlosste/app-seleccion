-- Enfoque de cada pregunta: del cargo, o social (situaciones cotidianas, no técnicas).
alter table public.preguntas add column enfoque text not null default 'cargo'
  check (enfoque in ('cargo', 'social'));
