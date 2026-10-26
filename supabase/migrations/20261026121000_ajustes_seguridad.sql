-- Ajustes de seguridad tras el primer análisis de advisors de Supabase.

-- 1. Las funciones auxiliares de RLS no se deben poder llamar como RPC desde anon.
--    authenticated las conserva: las políticas corren con ese rol.
revoke execute on function public.mi_empresa() from public, anon;
revoke execute on function public.vacante_es_mia(uuid) from public, anon;
revoke execute on function public.postulacion_es_mia(uuid) from public, anon;
revoke execute on function public.postulacion_es_mia_empresa(uuid) from public, anon;

-- 2. La vista pública pasa a security invoker. Para que siga leyendo, anon puede
--    ver solo vacantes abiertas (la vista ya filtra por estado = 'abierta').
create policy "vacantes: publico ver abiertas" on public.vacantes
  for select to anon using (estado = 'abierta');

create or replace view public.v_vacantes_publicas
with (security_invoker = true) as
select v.id, v.cargo, v.descripcion, v.enlace_token
from public.vacantes v
where v.estado = 'abierta';

grant select on public.v_vacantes_publicas to anon, authenticated;
