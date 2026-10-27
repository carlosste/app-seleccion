-- Etapas libres: cada empresa define sus etapas, así que un mismo tipo puede repetirse
-- (por ejemplo, dos entrevistas). Se mantiene unique (vacante_id, orden).
alter table public.vacante_etapas drop constraint vacante_etapas_vacante_id_tipo_key;

-- Orden de creación para listar requisitos y criterios de forma estable.
alter table public.requisitos_oferta add column created_at timestamptz not null default now();
alter table public.criterios add column created_at timestamptz not null default now();
