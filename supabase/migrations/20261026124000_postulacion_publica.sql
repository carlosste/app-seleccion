-- Postulación pública: lo que necesitan los postulantes para registrarse y postularse.

-- 1. Vacantes abiertas: también las ve un postulante ya autenticado.
drop policy "vacantes: publico ver abiertas" on public.vacantes;
create policy "vacantes: publico ver abiertas" on public.vacantes
  for select to anon, authenticated using (estado = 'abierta');

-- 2. Etapas de vacantes abiertas: el postulante necesita saber la primera etapa al postularse.
create policy "vacante_etapas: publico ver de abiertas" on public.vacante_etapas
  for select to anon, authenticated
  using (exists (
    select 1 from public.vacantes v
    where v.id = vacante_etapas.vacante_id and v.estado = 'abierta'
  ));

-- 3. Antes de enviar el código, la app revisa si el documento ya tiene cuenta.
--    Solo responde sí o no; no devuelve datos de nadie.
create or replace function public.documento_disponible(p_pais text, p_numero text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.postulantes p
    where p.pais_documento = upper(p_pais) and p.numero_documento = upper(p_numero)
  )
$$;

revoke execute on function public.documento_disponible(text, text) from public;
grant execute on function public.documento_disponible(text, text) to anon, authenticated;

-- 4. Hojas de vida: bucket privado. Cada postulante solo toca su carpeta (su id).
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

create policy "cvs: postulante sube su CV" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cvs: postulante ve su CV" on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
