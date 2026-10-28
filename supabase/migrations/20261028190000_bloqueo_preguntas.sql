-- Bloqueo de preguntas por etapa (2026-10-28, decisión de Carlos): todos los postulantes de
-- una etapa responden exactamente las mismas preguntas.
-- - La primera etapa de preguntas se bloquea al publicar la vacante.
-- - Cada etapa siguiente se puede editar hasta que el primer postulante llega a ella.
-- La regla vive en la base (trigger), así no se salta desde fuera de la app.

-- Primera etapa con preguntas (texto o voz) de la vacante.
create or replace function public.primera_etapa_preguntas(p_vacante uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id from public.vacante_etapas e
  where e.vacante_id = p_vacante and e.tipo in ('texto', 'voz')
  order by e.orden
  limit 1
$$;

-- Cuántos postulantes ya llegaron a la etapa (con la misma regla que usa el postulante:
-- desde la revisión de CV ya responde la etapa siguiente).
create or replace function public.postulantes_en_etapa(p_etapa uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.vacante_etapas e
  join public.postulaciones p on p.vacante_id = e.vacante_id
  where e.id = p_etapa and public.orden_alcanzado(p.etapa_actual_id) >= e.orden
$$;

create or replace function public.etapa_bloqueada(p_etapa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vacante_etapas e
    join public.vacantes v on v.id = e.vacante_id
    where e.id = p_etapa
      and (
        (v.estado <> 'borrador' and e.id = public.primera_etapa_preguntas(v.id))
        or public.postulantes_en_etapa(e.id) > 0
      )
  )
$$;

revoke execute on function public.primera_etapa_preguntas(uuid) from public, anon;
revoke execute on function public.postulantes_en_etapa(uuid) from public, anon;
revoke execute on function public.etapa_bloqueada(uuid) from public, anon;
grant execute on function public.primera_etapa_preguntas(uuid) to authenticated;
grant execute on function public.postulantes_en_etapa(uuid) to authenticated;
grant execute on function public.etapa_bloqueada(uuid) to authenticated;

-- Al borrar una etapa o una vacante, sus preguntas se van en cascada: para entonces la etapa
-- ya no existe, etapa_bloqueada da falso y el borrado sigue. Quitar etapas con postulantes
-- ya lo impide la app.
create or replace function public.proteger_preguntas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and public.etapa_bloqueada(old.etapa_id) then
    raise exception 'Las preguntas de esta etapa están bloqueadas: todos los postulantes deben responder las mismas'
      using errcode = 'P0001';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and public.etapa_bloqueada(new.etapa_id) then
    raise exception 'Las preguntas de esta etapa están bloqueadas: todos los postulantes deben responder las mismas'
      using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_preguntas on public.preguntas;
create trigger trg_proteger_preguntas
before insert or update or delete on public.preguntas
for each row execute function public.proteger_preguntas();
