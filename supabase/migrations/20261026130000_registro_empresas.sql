-- Registro e ingreso de empresas.
-- Fuente: CLAUDE.md (Decisiones de datos 2026-10-26, "Autenticación de empresas").
--
-- Las contraseñas las guarda Supabase Auth (bcrypt en auth.users.encrypted_password).
-- Aquí solo van: datos de la empresa, la regla "una cuenta = empresa o postulante",
-- el alta atómica de la empresa, el límite de intentos y el bucket privado de CVs.

-- =========================================================
-- 1. Datos básicos de la empresa para publicar vacantes
-- =========================================================
alter table public.empresas
  add column nit text,
  add column sector text,
  add column ciudad text,
  add column telefono text,
  add column sitio_web text,
  add column tamano text check (tamano is null or tamano in ('1-10', '11-50', '51-200', '201-500', '500+')),
  add column terminos_aceptados_at timestamptz;

-- No es único a propósito: un NIT único permitiría que alguien "ocupe" el NIT de
-- otra empresa antes que ella. Se revisa a mano si hace falta (ver CLAUDE.md).
create index empresas_nit_idx on public.empresas (nit);

-- Gestión humana puede editar los datos de su propia empresa.
create policy "empresa: gestion humana editar" on public.empresas
  for update to authenticated
  using (
    id = public.mi_empresa()
    and exists (
      select 1 from public.usuarios_empresa ue
      where ue.id = auth.uid() and ue.rol = 'gestion_humana'
    )
  )
  with check (id = public.mi_empresa());

-- =========================================================
-- 2. Una cuenta es de empresa O de postulante, nunca ambas
-- =========================================================
create or replace function public.impedir_postulante_en_empresa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.postulantes p where p.id = new.id) then
    raise exception 'La cuenta ya es de postulante y no puede ser de empresa'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.impedir_empresa_en_postulante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.usuarios_empresa ue where ue.id = new.id) then
    raise exception 'La cuenta ya es de empresa y no puede ser de postulante'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_cuenta_unica_empresa
before insert or update of id on public.usuarios_empresa
for each row execute function public.impedir_postulante_en_empresa();

create trigger trg_cuenta_unica_postulante
before insert or update of id on public.postulantes
for each row execute function public.impedir_empresa_en_postulante();

revoke execute on function public.impedir_postulante_en_empresa() from public, anon, authenticated;
revoke execute on function public.impedir_empresa_en_postulante() from public, anon, authenticated;

-- =========================================================
-- 3. Alta de empresa en una sola transacción
-- =========================================================
-- La llama el servidor (service role) justo después de crear el usuario en Auth.
-- Crea la empresa, el usuario de gestión humana y marca el tipo de cuenta en
-- app_metadata (el usuario no puede editar app_metadata; sí user_metadata).
create or replace function public.registrar_empresa(
  p_usuario uuid,
  p_nombre_responsable text,
  p_nombre_empresa text,
  p_nit text,
  p_sector text,
  p_ciudad text,
  p_telefono text,
  p_sitio_web text,
  p_tamano text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  if not exists (select 1 from auth.users u where u.id = p_usuario) then
    raise exception 'Usuario no encontrado' using errcode = 'foreign_key_violation';
  end if;

  if exists (select 1 from public.usuarios_empresa ue where ue.id = p_usuario) then
    raise exception 'El usuario ya pertenece a una empresa' using errcode = 'unique_violation';
  end if;

  insert into public.empresas (nombre, nit, sector, ciudad, telefono, sitio_web, tamano, terminos_aceptados_at)
  values (p_nombre_empresa, p_nit, p_sector, p_ciudad, p_telefono, nullif(p_sitio_web, ''), p_tamano, now())
  returning id into v_empresa;

  insert into public.usuarios_empresa (id, empresa_id, rol, nombre)
  values (p_usuario, v_empresa, 'gestion_humana', p_nombre_responsable);

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('tipo', 'empresa', 'empresa_id', v_empresa)
  where id = p_usuario;

  insert into public.registro_actividad (empresa_id, usuario_id, accion, tabla, registro_id)
  values (v_empresa, p_usuario, 'registro_empresa', 'empresas', v_empresa);

  return v_empresa;
end;
$$;

revoke execute on function public.registrar_empresa(uuid, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.registrar_empresa(uuid, text, text, text, text, text, text, text, text)
  to service_role;

-- =========================================================
-- 4. Límite de intentos (ingreso de empresa y registro)
-- =========================================================
-- clave = sha256 de "correo:<correo>" o "ip:<ip>". No se guarda el correo ni la IP.
-- Sin políticas: solo el servidor con la service role.
create table public.intentos_ingreso (
  clave text primary key,
  fallidos integer not null default 0,
  primer_fallo_at timestamptz not null default now(),
  bloqueado_hasta timestamptz
);
alter table public.intentos_ingreso enable row level security;

-- Devuelve hasta cuándo está bloqueada la clave más restringida (o null).
create or replace function public.consultar_bloqueo(p_claves text[])
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(i.bloqueado_hasta)
  from public.intentos_ingreso i
  where i.clave = any (p_claves) and i.bloqueado_hasta > now()
$$;

-- Suma un intento. Si dentro de la ventana se llega al máximo, bloquea.
-- Devuelve el bloqueo vigente (o null).
create or replace function public.registrar_intento(
  p_clave text,
  p_maximo integer,
  p_ventana_segundos integer,
  p_bloqueo_segundos integer
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila public.intentos_ingreso;
begin
  insert into public.intentos_ingreso as i (clave, fallidos, primer_fallo_at)
  values (p_clave, 1, now())
  on conflict (clave) do update
    set fallidos = case
          when i.primer_fallo_at < now() - make_interval(secs => p_ventana_segundos) then 1
          else i.fallidos + 1
        end,
        primer_fallo_at = case
          when i.primer_fallo_at < now() - make_interval(secs => p_ventana_segundos) then now()
          else i.primer_fallo_at
        end
  returning * into v_fila;

  if v_fila.fallidos >= p_maximo then
    update public.intentos_ingreso
    set bloqueado_hasta = now() + make_interval(secs => p_bloqueo_segundos),
        fallidos = 0,
        primer_fallo_at = now()
    where clave = p_clave
    returning * into v_fila;
  end if;

  if v_fila.bloqueado_hasta > now() then
    return v_fila.bloqueado_hasta;
  end if;
  return null;
end;
$$;

create or replace function public.limpiar_intentos(p_clave text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.intentos_ingreso where clave = p_clave
$$;

revoke execute on function public.consultar_bloqueo(text[]) from public, anon, authenticated;
revoke execute on function public.registrar_intento(text, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.limpiar_intentos(text) from public, anon, authenticated;
grant execute on function public.consultar_bloqueo(text[]) to service_role;
grant execute on function public.registrar_intento(text, integer, integer, integer) to service_role;
grant execute on function public.limpiar_intentos(text) to service_role;

-- =========================================================
-- 5. Bucket privado de CVs
-- =========================================================
-- Sin políticas de Storage: el navegador nunca lee el bucket directo. El servidor
-- comprueba (con RLS del usuario) que la postulación es de su empresa y que el
-- nombre ya se reveló, y entrega una URL firmada de corta duración.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  5242880,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;
