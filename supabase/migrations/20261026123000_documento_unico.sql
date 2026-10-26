-- Documento único por postulante (país + número). El teléfono no es único.
-- Supabase Auth maneja el código de acceso, así que accesos_codigo ya no hace falta.

alter table public.postulantes
  add column pais_documento text,
  add column numero_documento text,
  add constraint postulantes_documento_formato check (
    (pais_documento is null and numero_documento is null)
    or (pais_documento ~ '^[A-Z]{2}$' and numero_documento ~ '^[A-Z0-9]{5,20}$')
  );

create unique index postulantes_documento_unico
  on public.postulantes (pais_documento, numero_documento)
  where numero_documento is not null;

drop table public.accesos_codigo;

-- El documento no lo puede leer el cliente: solo se escribe al crear la cuenta.
revoke select, insert, update on public.postulantes from authenticated;
grant select (id, nombre, correo, telefono, created_at) on public.postulantes to authenticated;
grant insert (id, nombre, correo, telefono, pais_documento, numero_documento) on public.postulantes to authenticated;
grant update (nombre, telefono) on public.postulantes to authenticated;
