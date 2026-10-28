-- Eliminar vacantes (2026-10-28, decisión de Carlos): solo las que no tienen postulantes.
-- Las que ya recibieron postulaciones se cierran (estado 'cerrada'): dejan de recibir y se
-- ocultan de la lista, sin borrar datos de nadie.

create or replace function public.eliminar_vacante(p_vacante uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  if not exists (
    select 1 from public.usuarios_empresa ue where ue.id = auth.uid() and ue.rol = 'gestion_humana'
  ) then
    raise exception 'Solo gestión humana puede eliminar vacantes' using errcode = '42501';
  end if;

  select v.empresa_id into v_empresa from public.vacantes v where v.id = p_vacante for update;
  if not found or v_empresa is distinct from public.mi_empresa() then
    raise exception 'Vacante no encontrada' using errcode = 'P0002';
  end if;

  -- El mismo candado que usa una postulación nueva: nadie se postula mientras se borra.
  perform pg_advisory_xact_lock(hashtextextended('postulaciones:' || v_empresa::text, 0));
  if exists (select 1 from public.postulaciones p where p.vacante_id = p_vacante) then
    raise exception 'Esta vacante ya tiene postulantes: ciérrala en vez de eliminarla' using errcode = 'P0001';
  end if;

  -- Etapas, requisitos, rúbrica y preguntas se borran en cascada.
  delete from public.vacantes where id = p_vacante;
  return 'eliminada';
end;
$$;

revoke execute on function public.eliminar_vacante(uuid) from public, anon;
grant execute on function public.eliminar_vacante(uuid) to authenticated;
