-- Flujo real de la postulación (2026-10-28, decisión de Carlos):
-- 1. La revisión de CV es interna: el postulante no la ve y responde de una vez la etapa
--    de preguntas que le sigue. La IA revisa el CV contra los requisitos mínimos cuando
--    gestión humana pide "Evaluar con IA" y puede descartarlo sin intervención humana.
-- 2. Gestión humana decide "Pasa" (siguiente etapa) o "No pasa" (descartada).
-- 3. Por ahora las preguntas de voz se responden por escrito.

-- =========================================================
-- 1. Etapa de CV oculta
-- =========================================================
-- Hasta qué orden de etapa puede responder el postulante. Si está en la revisión de CV,
-- alcanza también la etapa siguiente (sin entrevista: esa se hace con una persona).
create or replace function public.orden_alcanzado(p_etapa uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when actual.tipo = 'cv' then coalesce(
      (select min(e.orden) from public.vacante_etapas e
       where e.vacante_id = actual.vacante_id and e.orden > actual.orden and e.tipo in ('texto', 'voz')),
      actual.orden)
    else actual.orden
  end
  from public.vacante_etapas actual
  where actual.id = p_etapa
$$;

revoke execute on function public.orden_alcanzado(uuid) from public, anon, authenticated;

-- El postulante ve las preguntas de texto y voz de las etapas que alcanzó. Nunca las de entrevista.
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
    join public.vacante_etapas e on e.id = p_etapa and e.vacante_id = p.vacante_id
    where p.vacante_id = p_vacante
      and p.postulante_id = auth.uid()
      and e.tipo in ('texto', 'voz')
      and e.orden <= public.orden_alcanzado(p.etapa_actual_id)
  )
$$;

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
    join public.vacante_etapas e on e.id = q.etapa_id
    where p.id = p_postulacion
      and p.postulante_id = auth.uid()
      and p.estado = 'en_proceso'
      and e.tipo in ('texto', 'voz')
      and e.orden <= public.orden_alcanzado(p.etapa_actual_id)
  )
$$;

-- Preguntas que le faltan al postulante, en orden de etapa y de pregunta.
-- numero y total son la posición dentro de su etapa, para la barra de progreso.
create or replace function public.preguntas_pendientes(p_postulacion uuid)
returns table (pregunta_id uuid, texto text, tipo_etapa public.tipo_etapa, numero integer, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  with visibles as (
    select q.id, q.texto, e.tipo, e.orden as orden_etapa, q.orden,
           row_number() over (partition by e.id order by q.orden)::integer as numero,
           count(*) over (partition by e.id)::integer as total
    from public.postulaciones p
    join public.preguntas q on q.vacante_id = p.vacante_id
    join public.vacante_etapas e on e.id = q.etapa_id
    where p.id = p_postulacion
      and p.postulante_id = auth.uid()
      and p.estado = 'en_proceso'
      and e.tipo in ('texto', 'voz')
      and e.orden <= public.orden_alcanzado(p.etapa_actual_id)
  )
  select v.id, v.texto, v.tipo, v.numero, v.total
  from visibles v
  where not exists (select 1 from public.respuestas r where r.postulacion_id = p_postulacion and r.pregunta_id = v.id)
  order by v.orden_etapa, v.orden
$$;

revoke execute on function public.preguntas_pendientes(uuid) from public, anon;
grant execute on function public.preguntas_pendientes(uuid) to authenticated;

-- =========================================================
-- 2. Decisión de gestión humana
-- =========================================================
-- Guarda la decisión y mueve la postulación en una sola transacción:
-- "pasa" lleva a la siguiente etapa (o la deja seleccionada si era la última);
-- "no_pasa" la descarta. Al llegar a la entrevista se revela el nombre.
create or replace function public.decidir_postulacion(
  p_postulacion uuid,
  p_resultado public.resultado_decision,
  p_motivo text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.postulaciones%rowtype;
  v_orden integer;
  v_siguiente public.vacante_etapas%rowtype;
begin
  if not exists (
    select 1 from public.usuarios_empresa ue where ue.id = auth.uid() and ue.rol = 'gestion_humana'
  ) then
    raise exception 'Solo gestión humana puede decidir' using errcode = '42501';
  end if;

  select * into v_post from public.postulaciones where id = p_postulacion for update;
  if not found or not public.vacante_es_mia(v_post.vacante_id) then
    raise exception 'Postulación no encontrada' using errcode = 'P0002';
  end if;
  if v_post.estado <> 'en_proceso' then
    raise exception 'Esta postulación ya tiene una decisión final' using errcode = 'P0001';
  end if;

  insert into public.decisiones (postulacion_id, etapa_id, usuario_id, resultado, motivo)
  values (p_postulacion, v_post.etapa_actual_id, auth.uid(), p_resultado, nullif(trim(p_motivo), ''));

  if p_resultado = 'no_pasa' then
    update public.postulaciones set estado = 'descartada' where id = p_postulacion;
    return 'descartada';
  end if;

  select e.orden into v_orden from public.vacante_etapas e where e.id = v_post.etapa_actual_id;
  select * into v_siguiente
  from public.vacante_etapas e
  where e.vacante_id = v_post.vacante_id and e.orden > coalesce(v_orden, 0)
  order by e.orden
  limit 1;

  if not found then
    update public.postulaciones set estado = 'seleccionada' where id = p_postulacion;
    return 'seleccionada';
  end if;

  update public.postulaciones
  set etapa_actual_id = v_siguiente.id,
      nombre_revelado_at = case when v_siguiente.tipo = 'entrevista' then coalesce(nombre_revelado_at, now())
                                else nombre_revelado_at end
  where id = p_postulacion;
  return 'avanza';
end;
$$;

revoke execute on function public.decidir_postulacion(uuid, public.resultado_decision, text) from public, anon;
grant execute on function public.decidir_postulacion(uuid, public.resultado_decision, text) to authenticated;

-- =========================================================
-- 3. Resultado de la revisión de CV (lo llama solo el servidor)
-- =========================================================
-- Requisitos mínimos sí descartan automáticamente. Si cumple y sigue en la etapa de CV,
-- pasa sola a la siguiente. Si la IA no pudo leer algún dato, el servidor no llama a
-- esta función: la postulación queda "por revisar" y decide gestión humana.
create or replace function public.registrar_revision_cv(p_postulacion uuid, p_cumple boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.postulaciones%rowtype;
  v_actual public.vacante_etapas%rowtype;
  v_siguiente uuid;
begin
  select * into v_post from public.postulaciones where id = p_postulacion for update;
  if not found or v_post.estado <> 'en_proceso' then
    return 'sin_cambios';
  end if;

  if not p_cumple then
    insert into public.decisiones (postulacion_id, etapa_id, resultado, motivo)
    values (p_postulacion, v_post.etapa_actual_id, 'no_pasa', 'requisito_minimo');
    update public.postulaciones set estado = 'descartada' where id = p_postulacion;
    return 'descartada';
  end if;

  select * into v_actual from public.vacante_etapas where id = v_post.etapa_actual_id;
  if not found or v_actual.tipo <> 'cv' then
    return 'sin_cambios';
  end if;

  select e.id into v_siguiente
  from public.vacante_etapas e
  where e.vacante_id = v_post.vacante_id and e.orden > v_actual.orden
  order by e.orden
  limit 1;
  if v_siguiente is null then
    return 'sin_cambios';
  end if;

  insert into public.decisiones (postulacion_id, etapa_id, resultado, motivo)
  values (p_postulacion, v_post.etapa_actual_id, 'pasa', 'requisito_minimo');
  update public.postulaciones set etapa_actual_id = v_siguiente where id = p_postulacion;
  return 'avanza';
end;
$$;

revoke execute on function public.registrar_revision_cv(uuid, boolean) from public, anon, authenticated;
grant execute on function public.registrar_revision_cv(uuid, boolean) to service_role;
