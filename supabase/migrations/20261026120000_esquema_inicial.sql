-- Esquema inicial: App de selección de personal con IA
-- Fuente: app-seleccion/CLAUDE.md (sección Tablas y Decisiones de datos, 2026-10-26)
-- Nombres en español. RLS activado en todas las tablas.

-- =========================================================
-- Tipos
-- =========================================================
create type rol_empresa as enum ('gestion_humana', 'entrevistador');
create type estado_vacante as enum ('borrador', 'abierta', 'cerrada');
create type tipo_etapa as enum ('cv', 'texto', 'voz', 'entrevista');
create type tipo_pregunta as enum ('texto', 'voz');
create type origen_pregunta as enum ('ia', 'manual');
create type modalidad_respuesta as enum ('texto', 'voz');
create type tipo_consentimiento as enum ('datos', 'grabacion');
create type estado_postulacion as enum ('en_proceso', 'descartada', 'seleccionada');
create type resultado_decision as enum ('pasa', 'no_pasa');
create type tarea_ia as enum ('leer_cv', 'generar_preguntas', 'transcribir_audio', 'puntuar_rubrica');

-- =========================================================
-- Empresas y usuarios de empresa
-- =========================================================
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  logo_url text,
  plan text not null default 'prueba',
  limite_postulantes integer not null default 50 check (limite_postulantes > 0),
  created_at timestamptz not null default now()
);

create table public.usuarios_empresa (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  rol rol_empresa not null,
  nombre text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Plantillas de rúbrica (catálogo global, se copian a cada vacante)
-- =========================================================
create table public.plantillas_rubrica (
  id uuid primary key default gen_random_uuid(),
  tipo_cargo text not null unique,
  nombre text not null
);

create table public.plantilla_criterios (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references public.plantillas_rubrica (id) on delete cascade,
  nombre text not null,
  descripcion text,
  peso integer not null check (peso between 1 and 100)
);

-- =========================================================
-- Vacantes, etapas, requisitos, rúbrica y preguntas
-- =========================================================
create table public.vacantes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cargo text not null,
  descripcion text,
  estado estado_vacante not null default 'borrador',
  enlace_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  creado_por uuid references public.usuarios_empresa (id) on delete set null,
  created_at timestamptz not null default now(),
  cerrada_at timestamptz
);
create index vacantes_empresa_idx on public.vacantes (empresa_id);

create table public.vacante_etapas (
  id uuid primary key default gen_random_uuid(),
  vacante_id uuid not null references public.vacantes (id) on delete cascade,
  tipo tipo_etapa not null,
  orden integer not null check (orden > 0),
  activa boolean not null default true,
  cupo_siguiente integer check (cupo_siguiente is null or cupo_siguiente > 0),
  unique (vacante_id, orden),
  unique (vacante_id, tipo)
);

-- Valor público de la oferta: lo puede leer cualquiera con el link.
create table public.requisitos_oferta (
  id uuid primary key default gen_random_uuid(),
  vacante_id uuid not null references public.vacantes (id) on delete cascade,
  descripcion text not null,
  valor_oferta text not null
);

-- Mínimo aceptable: interno. Nunca sale al link público.
create table public.requisitos_minimos (
  requisito_id uuid primary key references public.requisitos_oferta (id) on delete cascade,
  valor_minimo text not null
);

create table public.rubricas (
  id uuid primary key default gen_random_uuid(),
  vacante_id uuid not null unique references public.vacantes (id) on delete cascade
);

create table public.criterios (
  id uuid primary key default gen_random_uuid(),
  rubrica_id uuid not null references public.rubricas (id) on delete cascade,
  nombre text not null,
  descripcion text,
  peso integer not null check (peso between 1 and 100)
);

create table public.preguntas (
  id uuid primary key default gen_random_uuid(),
  vacante_id uuid not null references public.vacantes (id) on delete cascade,
  etapa_id uuid not null references public.vacante_etapas (id) on delete cascade,
  texto text not null,
  tipo tipo_pregunta not null,
  orden integer not null check (orden > 0),
  origen origen_pregunta not null default 'manual',
  created_at timestamptz not null default now()
);
create index preguntas_vacante_idx on public.preguntas (vacante_id, etapa_id);

-- =========================================================
-- Postulantes y postulaciones
-- =========================================================
-- Cuenta de Supabase Auth del postulante (id = auth.users.id).
create table public.postulantes (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  correo text not null,
  telefono text,
  created_at timestamptz not null default now()
);

create table public.postulaciones (
  id uuid primary key default gen_random_uuid(),
  postulante_id uuid not null references public.postulantes (id) on delete cascade,
  vacante_id uuid not null references public.vacantes (id) on delete cascade,
  numero_anonimo integer not null,
  cv_path text,
  etapa_actual_id uuid references public.vacante_etapas (id) on delete set null,
  estado estado_postulacion not null default 'en_proceso',
  cumple_edad_minima boolean,
  nombre_revelado_at timestamptz,
  created_at timestamptz not null default now(),
  unique (postulante_id, vacante_id),
  unique (vacante_id, numero_anonimo)
);
create index postulaciones_vacante_idx on public.postulaciones (vacante_id);

create table public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones (id) on delete cascade,
  tipo tipo_consentimiento not null,
  version_texto text not null,
  aceptado_at timestamptz not null default now()
);

-- Código de ingreso: solo se guarda el hash. Sin acceso desde el cliente.
create table public.accesos_codigo (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones (id) on delete cascade,
  codigo_hash text not null,
  enviado_at timestamptz not null default now(),
  usado_at timestamptz,
  intentos_fallidos integer not null default 0,
  bloqueado_hasta timestamptz
);
create index accesos_codigo_postulacion_idx on public.accesos_codigo (postulacion_id, enviado_at);

create table public.respuestas (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones (id) on delete cascade,
  pregunta_id uuid not null references public.preguntas (id) on delete cascade,
  modalidad modalidad_respuesta not null,
  ajuste_solicitado boolean not null default false,
  texto text,
  audio_path text,
  transcripcion text,
  respondida_at timestamptz not null default now(),
  unique (postulacion_id, pregunta_id)
);

create table public.entrevistas (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones (id) on delete cascade,
  entrevistador_id uuid references public.usuarios_empresa (id) on delete set null,
  grabacion_path text,
  transcripcion text,
  realizada_at timestamptz
);

-- =========================================================
-- IA, consumo y decisiones
-- =========================================================
create table public.evaluaciones_ia (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones (id) on delete cascade,
  tarea tarea_ia not null,
  resultado jsonb not null,
  ajuste_total numeric(5, 2) check (ajuste_total is null or ajuste_total between 0 and 100),
  modelo text not null,
  created_at timestamptz not null default now(),
  unique (postulacion_id, tarea)
);

-- Una fila por llamada a Gemini: consumo de tokens por empresa.
create table public.llamadas_ia (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tarea tarea_ia not null,
  referencia uuid,
  modelo text not null,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  created_at timestamptz not null default now()
);
create index llamadas_ia_empresa_idx on public.llamadas_ia (empresa_id, created_at);

-- Append-only: el estado actual es la última fila. Descarte automático por
-- requisito mínimo: usuario_id nulo y motivo 'requisito_minimo'.
create table public.decisiones (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones (id) on delete cascade,
  etapa_id uuid references public.vacante_etapas (id) on delete set null,
  usuario_id uuid references public.usuarios_empresa (id) on delete set null,
  resultado resultado_decision not null,
  motivo text,
  created_at timestamptz not null default now(),
  check (usuario_id is not null or motivo = 'requisito_minimo')
);
create index decisiones_postulacion_idx on public.decisiones (postulacion_id, created_at);

create table public.registro_actividad (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas (id) on delete cascade,
  usuario_id uuid references auth.users (id) on delete set null,
  accion text not null,
  tabla text not null,
  registro_id uuid,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Funciones auxiliares para RLS (security definer evita recursión)
-- =========================================================
create or replace function public.mi_empresa()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ue.empresa_id from public.usuarios_empresa ue where ue.id = auth.uid()
$$;

create or replace function public.vacante_es_mia(p_vacante uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vacantes v
    where v.id = p_vacante and v.empresa_id = public.mi_empresa()
  )
$$;

create or replace function public.postulacion_es_mia_empresa(p_postulacion uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.postulaciones p
    where p.id = p_postulacion and public.vacante_es_mia(p.vacante_id)
  )
$$;

create or replace function public.postulacion_es_mia(p_postulacion uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.postulaciones p
    where p.id = p_postulacion and p.postulante_id = auth.uid()
  )
$$;

-- =========================================================
-- Triggers
-- =========================================================
-- Número anónimo por vacante: 1, 2, 3... (el "#014" de la interfaz).
create or replace function public.asignar_numero_anonimo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select coalesce(max(p.numero_anonimo), 0) + 1 into new.numero_anonimo
  from public.postulaciones p
  where p.vacante_id = new.vacante_id;
  return new;
end;
$$;

create trigger trg_numero_anonimo
before insert on public.postulaciones
for each row execute function public.asignar_numero_anonimo();

-- Límite de postulantes por empresa (total, por ahora; mensual en el plan de pago).
create or replace function public.validar_limite_postulantes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_limite integer;
  v_usadas integer;
begin
  select v.empresa_id into v_empresa from public.vacantes v where v.id = new.vacante_id;
  select e.limite_postulantes into v_limite from public.empresas e where e.id = v_empresa;
  select count(*) into v_usadas
  from public.postulaciones p
  join public.vacantes v on v.id = p.vacante_id
  where v.empresa_id = v_empresa;

  if v_usadas >= v_limite then
    raise exception 'La empresa alcanzó su límite de postulantes';
  end if;
  return new;
end;
$$;

create trigger trg_limite_postulantes
before insert on public.postulaciones
for each row execute function public.validar_limite_postulantes();

-- =========================================================
-- Vistas
-- =========================================================
-- Vista del personal: el nombre, correo y teléfono solo aparecen tras revelar.
-- El CV no entra aquí; se consulta aparte y solo después de revelar.
create view public.v_postulaciones_staff
with (security_invoker = true) as
select
  p.id,
  p.vacante_id,
  p.numero_anonimo,
  p.etapa_actual_id,
  p.estado,
  p.cumple_edad_minima,
  p.nombre_revelado_at,
  case when p.nombre_revelado_at is not null then pt.nombre end as nombre,
  case when p.nombre_revelado_at is not null then pt.correo end as correo,
  case when p.nombre_revelado_at is not null then pt.telefono end as telefono
from public.postulaciones p
left join public.postulantes pt on pt.id = p.postulante_id;

-- Vista pública: solo vacantes abiertas, sin datos internos.
create view public.v_vacantes_publicas as
select v.id, v.cargo, v.descripcion, v.enlace_token
from public.vacantes v
where v.estado = 'abierta';

grant select on public.v_vacantes_publicas to anon, authenticated;

-- =========================================================
-- RLS
-- =========================================================
alter table public.empresas enable row level security;
alter table public.usuarios_empresa enable row level security;
alter table public.plantillas_rubrica enable row level security;
alter table public.plantilla_criterios enable row level security;
alter table public.vacantes enable row level security;
alter table public.vacante_etapas enable row level security;
alter table public.requisitos_oferta enable row level security;
alter table public.requisitos_minimos enable row level security;
alter table public.rubricas enable row level security;
alter table public.criterios enable row level security;
alter table public.preguntas enable row level security;
alter table public.postulantes enable row level security;
alter table public.postulaciones enable row level security;
alter table public.consentimientos enable row level security;
alter table public.accesos_codigo enable row level security;
alter table public.respuestas enable row level security;
alter table public.entrevistas enable row level security;
alter table public.evaluaciones_ia enable row level security;
alter table public.llamadas_ia enable row level security;
alter table public.decisiones enable row level security;
alter table public.registro_actividad enable row level security;

-- Empresas y personal de empresa
create policy "empresa: ver la propia" on public.empresas
  for select to authenticated using (id = public.mi_empresa());

create policy "usuarios_empresa: ver los de mi empresa" on public.usuarios_empresa
  for select to authenticated using (empresa_id = public.mi_empresa());

-- Catálogo de rúbricas: cualquier usuario autenticado lo lee
create policy "plantillas: leer" on public.plantillas_rubrica
  for select to authenticated using (true);

create policy "plantilla_criterios: leer" on public.plantilla_criterios
  for select to authenticated using (true);

-- Vacantes: el personal de la empresa gestiona las suyas
create policy "vacantes: gestion ver" on public.vacantes
  for select to authenticated using (empresa_id = public.mi_empresa());

create policy "vacantes: gestion crear" on public.vacantes
  for insert to authenticated with check (empresa_id = public.mi_empresa());

create policy "vacantes: gestion editar" on public.vacantes
  for update to authenticated
  using (empresa_id = public.mi_empresa())
  with check (empresa_id = public.mi_empresa());

-- Etapas, rúbrica y preguntas: personal de la empresa; postulante lee las de sus vacantes
create policy "etapas: gestion" on public.vacante_etapas
  for all to authenticated
  using (public.vacante_es_mia(vacante_id))
  with check (public.vacante_es_mia(vacante_id));

create policy "etapas: postulante ver" on public.vacante_etapas
  for select to authenticated
  using (exists (
    select 1 from public.postulaciones p
    where p.vacante_id = vacante_etapas.vacante_id and p.postulante_id = auth.uid()
  ));

-- Requisito público: cualquiera lo lee (es la oferta)
create policy "requisitos_oferta: leer" on public.requisitos_oferta
  for select to anon, authenticated using (true);

create policy "requisitos_oferta: gestion" on public.requisitos_oferta
  for all to authenticated
  using (public.vacante_es_mia(vacante_id))
  with check (public.vacante_es_mia(vacante_id));

-- Requisito mínimo: solo el personal de la empresa (nunca anon)
create policy "requisitos_minimos: gestion" on public.requisitos_minimos
  for all to authenticated
  using (exists (
    select 1 from public.requisitos_oferta ro
    where ro.id = requisitos_minimos.requisito_id and public.vacante_es_mia(ro.vacante_id)
  ))
  with check (exists (
    select 1 from public.requisitos_oferta ro
    where ro.id = requisitos_minimos.requisito_id and public.vacante_es_mia(ro.vacante_id)
  ));

create policy "rubricas: gestion" on public.rubricas
  for all to authenticated
  using (public.vacante_es_mia(vacante_id))
  with check (public.vacante_es_mia(vacante_id));

create policy "criterios: gestion" on public.criterios
  for all to authenticated
  using (exists (
    select 1 from public.rubricas r
    where r.id = criterios.rubrica_id and public.vacante_es_mia(r.vacante_id)
  ))
  with check (exists (
    select 1 from public.rubricas r
    where r.id = criterios.rubrica_id and public.vacante_es_mia(r.vacante_id)
  ));

create policy "preguntas: gestion" on public.preguntas
  for all to authenticated
  using (public.vacante_es_mia(vacante_id))
  with check (public.vacante_es_mia(vacante_id));

create policy "preguntas: postulante ver" on public.preguntas
  for select to authenticated
  using (exists (
    select 1 from public.postulaciones p
    where p.vacante_id = preguntas.vacante_id and p.postulante_id = auth.uid()
  ));

-- Postulantes: cada uno ve y edita su cuenta. El personal solo ve datos tras revelar.
create policy "postulantes: ver propio" on public.postulantes
  for select to authenticated using (id = auth.uid());

create policy "postulantes: crear propio" on public.postulantes
  for insert to authenticated with check (id = auth.uid());

create policy "postulantes: editar propio" on public.postulantes
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "postulantes: personal ve revelados" on public.postulantes
  for select to authenticated
  using (exists (
    select 1 from public.postulaciones p
    where p.postulante_id = postulantes.id
      and p.nombre_revelado_at is not null
      and public.vacante_es_mia(p.vacante_id)
  ));

-- Postulaciones: el postulante ve y crea las suyas; el personal ve las de sus vacantes
create policy "postulaciones: postulante ver" on public.postulaciones
  for select to authenticated using (postulante_id = auth.uid());

create policy "postulaciones: postulante crear" on public.postulaciones
  for insert to authenticated with check (postulante_id = auth.uid());

create policy "postulaciones: personal ver" on public.postulaciones
  for select to authenticated using (public.vacante_es_mia(vacante_id));

-- Consentimientos
create policy "consentimientos: postulante" on public.consentimientos
  for all to authenticated
  using (public.postulacion_es_mia(postulacion_id))
  with check (public.postulacion_es_mia(postulacion_id));

create policy "consentimientos: personal ver" on public.consentimientos
  for select to authenticated using (public.postulacion_es_mia_empresa(postulacion_id));

-- accesos_codigo: sin policies. Solo lo toca el servidor con la service role.

-- Respuestas: el postulante escribe las suyas; el personal las lee
create policy "respuestas: postulante" on public.respuestas
  for all to authenticated
  using (public.postulacion_es_mia(postulacion_id))
  with check (public.postulacion_es_mia(postulacion_id));

create policy "respuestas: personal ver" on public.respuestas
  for select to authenticated using (public.postulacion_es_mia_empresa(postulacion_id));

-- Entrevistas: el personal de la empresa ve y registra
create policy "entrevistas: personal ver" on public.entrevistas
  for select to authenticated using (public.postulacion_es_mia_empresa(postulacion_id));

create policy "entrevistas: personal crear" on public.entrevistas
  for insert to authenticated
  with check (public.postulacion_es_mia_empresa(postulacion_id));

-- IA: solo lectura para el personal. Las escribe el servidor.
create policy "evaluaciones_ia: personal ver" on public.evaluaciones_ia
  for select to authenticated using (public.postulacion_es_mia_empresa(postulacion_id));

create policy "llamadas_ia: ver de mi empresa" on public.llamadas_ia
  for select to authenticated using (empresa_id = public.mi_empresa());

-- Decisiones: solo gestión humana decide. Son filas nuevas, no ediciones.
create policy "decisiones: personal ver" on public.decisiones
  for select to authenticated using (public.postulacion_es_mia_empresa(postulacion_id));

create policy "decisiones: gestion humana crear" on public.decisiones
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and public.postulacion_es_mia_empresa(postulacion_id)
    and exists (
      select 1 from public.usuarios_empresa ue
      where ue.id = auth.uid() and ue.rol = 'gestion_humana'
    )
  );

-- Auditoría: la empresa ve su registro. Lo escribe el servidor.
create policy "registro_actividad: ver de mi empresa" on public.registro_actividad
  for select to authenticated using (empresa_id = public.mi_empresa());

-- Vista de personal: respeta RLS de postulaciones y postulantes (security_invoker).
grant select on public.v_postulaciones_staff to authenticated;
