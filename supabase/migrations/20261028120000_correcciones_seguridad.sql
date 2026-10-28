-- Correcciones de seguridad: fase 1 de la revisión técnica (REVISION.md, 2026-10-27),
-- verificada contra la base real el 2026-10-28.
-- Cubre los hallazgos 1, 3, 4, 5, 6, 7, 11 y 17. No borra datos.
--
-- Idea general: el postulante tiene su token en una cookie y puede llamar a la API de
-- Supabase sin pasar por la app. Por eso cada regla se impone aquí, no solo en el código.

-- =========================================================
-- 1. Funciones auxiliares (security definer: no dependen de lo que ve quien consulta)
-- =========================================================
create or replace function public.vacante_abierta(p_vacante uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.vacantes v where v.id = p_vacante and v.estado = 'abierta')
$$;

create or replace function public.primera_etapa(p_vacante uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id from public.vacante_etapas e where e.vacante_id = p_vacante order by e.orden limit 1
$$;

-- ¿La postulación del usuario en esa vacante ya llegó (al menos) a esa etapa?
create or replace function public.etapa_alcanzada(p_vacante uuid, p_etapa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.postulaciones p
    join public.vacante_etapas actual on actual.id = p.etapa_actual_id
    join public.vacante_etapas e on e.id = p_etapa and e.vacante_id = p.vacante_id
    where p.vacante_id = p_vacante
      and p.postulante_id = auth.uid()
      and e.orden <= actual.orden
  )
$$;

-- ¿Puede el usuario responder esa pregunta en esa postulación? Debe ser suya, seguir en
-- proceso, y la pregunta debe ser de su vacante y de una etapa que ya alcanzó.
create or replace function public.puede_responder(p_postulacion uuid, p_pregunta uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.postulaciones p
    join public.preguntas q on q.id = p_pregunta and q.vacante_id = p.vacante_id
    join public.vacante_etapas actual on actual.id = p.etapa_actual_id
    join public.vacante_etapas e on e.id = q.etapa_id
    where p.id = p_postulacion
      and p.postulante_id = auth.uid()
      and p.estado = 'en_proceso'
      and e.orden <= actual.orden
  )
$$;

revoke execute on function public.vacante_abierta(uuid) from public;
revoke execute on function public.primera_etapa(uuid) from public, anon;
revoke execute on function public.etapa_alcanzada(uuid, uuid) from public, anon;
revoke execute on function public.puede_responder(uuid, uuid) from public, anon;
-- anon la necesita para leer los requisitos de la oferta (solo responde sí o no).
grant execute on function public.vacante_abierta(uuid) to anon, authenticated;
grant execute on function public.primera_etapa(uuid) to authenticated;
grant execute on function public.etapa_alcanzada(uuid, uuid) to authenticated;
grant execute on function public.puede_responder(uuid, uuid) to authenticated;

-- =========================================================
-- 2. Vacante pública por token (hallazgo 7)
-- =========================================================
-- Antes, cualquiera con la clave pública podía listar todas las vacantes abiertas con su
-- enlace_token y sus etapas. Ahora solo se obtiene la vacante del token que se conoce.
create or replace function public.vacante_publica(p_token text)
returns table (
  id uuid,
  cargo text,
  descripcion text,
  enlace_token text,
  primera_etapa_id uuid,
  empresa_nombre text,
  empresa_logo_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.cargo, v.descripcion, v.enlace_token, public.primera_etapa(v.id), e.nombre, e.logo_url
  from public.vacantes v
  join public.empresas e on e.id = v.empresa_id
  where v.enlace_token = p_token and v.estado = 'abierta'
$$;

revoke execute on function public.vacante_publica(text) from public;
grant execute on function public.vacante_publica(text) to anon, authenticated;

drop policy "vacantes: publico ver abiertas" on public.vacantes;
drop policy "vacante_etapas: publico ver de abiertas" on public.vacante_etapas;
drop view public.v_vacantes_publicas;

-- Requisitos de la oferta: solo de vacantes abiertas (antes también de borradores y cerradas).
drop policy "requisitos_oferta: leer" on public.requisitos_oferta;
create policy "requisitos_oferta: publico ver de abiertas" on public.requisitos_oferta
  for select to anon, authenticated using (public.vacante_abierta(vacante_id));

-- =========================================================
-- 3. Postulaciones (hallazgo 1)
-- =========================================================
-- El postulante solo escribe estas cuatro columnas. estado, nombre_revelado_at,
-- cumple_edad_minima y numero_anonimo los pone la base o el personal, nunca él.
revoke insert on public.postulaciones from anon, authenticated;
grant insert (postulante_id, vacante_id, cv_path, etapa_actual_id) on public.postulaciones to authenticated;

-- Vacante abierta, primera etapa, y el CV en su propia carpeta con el nombre que usa la app.
drop policy "postulaciones: postulante crear" on public.postulaciones;
create policy "postulaciones: postulante crear" on public.postulaciones
  for insert to authenticated
  with check (
    postulante_id = auth.uid()
    and public.vacante_abierta(vacante_id)
    and cv_path = auth.uid()::text || '/' || vacante_id::text || '.pdf'
    and etapa_actual_id is not distinct from public.primera_etapa(vacante_id)
  );

-- =========================================================
-- 4. Respuestas y preguntas (hallazgos 3 y 4)
-- =========================================================
-- Las respuestas enviadas no se editan ni se borran. transcripcion la escribe el servidor
-- (es lo que lee la IA) y respondida_at la pone la base (la rapidez suma en la rúbrica).
drop policy "respuestas: postulante" on public.respuestas;
create policy "respuestas: postulante ver" on public.respuestas
  for select to authenticated using (public.postulacion_es_mia(postulacion_id));
create policy "respuestas: postulante crear" on public.respuestas
  for insert to authenticated with check (public.puede_responder(postulacion_id, pregunta_id));

revoke insert on public.respuestas from anon, authenticated;
grant insert (postulacion_id, pregunta_id, modalidad, ajuste_solicitado, texto, audio_path)
  on public.respuestas to authenticated;

-- El postulante ve solo las preguntas de las etapas que ya alcanzó, no las de la entrevista.
drop policy "preguntas: postulante ver" on public.preguntas;
create policy "preguntas: postulante ver" on public.preguntas
  for select to authenticated using (public.etapa_alcanzada(vacante_id, etapa_id));

-- =========================================================
-- 5. Consentimientos (hallazgo 5, Ley 1581)
-- =========================================================
-- El registro de consentimiento no se puede borrar ni cambiar de fecha.
drop policy "consentimientos: postulante" on public.consentimientos;
create policy "consentimientos: postulante ver" on public.consentimientos
  for select to authenticated using (public.postulacion_es_mia(postulacion_id));
create policy "consentimientos: postulante crear" on public.consentimientos
  for insert to authenticated with check (public.postulacion_es_mia(postulacion_id));

revoke insert on public.consentimientos from anon, authenticated;
grant insert (postulacion_id, tipo, version_texto) on public.consentimientos to authenticated;

-- =========================================================
-- 6. Documento disponible (hallazgo 11)
-- =========================================================
-- Cualquiera podía preguntar si una cédula tiene cuenta. Ahora solo el servidor.
revoke execute on function public.documento_disponible(text, text) from public, anon, authenticated;
grant execute on function public.documento_disponible(text, text) to service_role;

-- =========================================================
-- 7. Número anónimo y límite de postulantes sin choques (hallazgo 17)
-- =========================================================
-- Un candado por empresa hasta el fin de la transacción: dos postulaciones simultáneas
-- se atienden una después de otra, así no repiten número ni pasan juntas el límite.
create or replace function public.validar_limite_postulantes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_limite integer;
  v_usadas integer;
begin
  select v.empresa_id into v_empresa from public.vacantes v where v.id = new.vacante_id;
  perform pg_advisory_xact_lock(hashtextextended('postulaciones:' || v_empresa::text, 0));

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

create or replace function public.asignar_numero_anonimo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  -- Mismo candado que validar_limite_postulantes (se puede tomar dos veces en la misma transacción).
  select v.empresa_id into v_empresa from public.vacantes v where v.id = new.vacante_id;
  perform pg_advisory_xact_lock(hashtextextended('postulaciones:' || v_empresa::text, 0));

  select coalesce(max(p.numero_anonimo), 0) + 1 into new.numero_anonimo
  from public.postulaciones p
  where p.vacante_id = new.vacante_id;
  return new;
end;
$$;

-- Son funciones de trigger: no deben poder llamarse como RPC.
revoke execute on function public.validar_limite_postulantes() from public, anon, authenticated;
revoke execute on function public.asignar_numero_anonimo() from public, anon, authenticated;

-- =========================================================
-- 8. Bucket de CVs (hallazgo 6)
-- =========================================================
-- La migración registro_empresas usó "on conflict do nothing" sobre un bucket ya creado,
-- así que quedó sin límites. 4 MB porque Vercel corta los cuerpos de más de 4,5 MB.
update storage.buckets
set file_size_limit = 4194304,
    allowed_mime_types = array['application/pdf']
where id = 'cvs';

-- La app sube con upsert: reintentar una postulación necesita reemplazar su propio CV.
create policy "cvs: postulante reemplaza su CV" on storage.objects
  for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
