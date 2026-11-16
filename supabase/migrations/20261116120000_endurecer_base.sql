-- Endurecer la base (revisión de seguridad del 2026-11-16, fase 2).
-- Principio (ya escrito en correcciones_seguridad): quien tiene una sesión puede llamar a la
-- API de Supabase sin pasar por la app, así que cada regla se impone aquí, no solo en el código.
-- El rol entrevistador NO cambia en esta migración (decisión de Carlos, 2026-11-16).

-- 1. Etapas con postulantes: no se borran ni cambian de tipo, orden o vacante.
--    Renombrar sigue permitido. Si lo que se borra es la vacante entera (cascada desde
--    eliminar_vacante, que exige cero postulantes), la fila de vacantes ya no existe y se deja pasar.
create or replace function public.proteger_etapas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.vacantes v where v.id = old.vacante_id)
       and exists (select 1 from public.postulaciones p where p.vacante_id = old.vacante_id) then
      raise exception 'Esta vacante ya tiene postulantes: sus etapas no se pueden eliminar'
        using errcode = 'P0001';
    end if;
    return old;
  end if;

  if (new.tipo, new.orden, new.vacante_id) is distinct from (old.tipo, old.orden, old.vacante_id)
     and exists (
       select 1 from public.postulaciones p where p.vacante_id in (old.vacante_id, new.vacante_id)
     ) then
    raise exception 'Esta vacante ya tiene postulantes: sus etapas no cambian de tipo ni de orden'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_etapas on public.vacante_etapas;
create trigger trg_proteger_etapas
  before update or delete on public.vacante_etapas
  for each row execute function public.proteger_etapas();

revoke update on public.vacante_etapas from anon, authenticated;
grant update (nombre, orden, tipo) on public.vacante_etapas to authenticated;

-- 2. Empresas: solo los datos de perfil. Límite, plan, NIT, id y logo quedan fuera
--    (logo_url vuelve cuando exista la función de subir logo).
revoke update on public.empresas from anon, authenticated;
grant update (nombre, sector, ciudad, telefono, sitio_web, tamano) on public.empresas to authenticated;

-- 3. Vacantes: lo que la app edita (descripción y estado) más cargo y fecha de cierre.
--    enlace_token, creado_por, empresa_id y created_at no se tocan desde la API.
revoke update on public.vacantes from anon, authenticated;
grant update (cargo, descripcion, estado, cerrada_at) on public.vacantes to authenticated;

-- 4. Bucket cvs: un solo archivo por vacante, con nombre fijo <usuario>/<vacante>.pdf, solo a
--    vacantes abiertas y solo mientras no exista la postulación (después el CV queda fijo).
--    La app sube el archivo antes de crear la postulación, así que reintentar sigue funcionando.
create or replace function public.puede_subir_cv(p_nombre text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_partes text[];
  v_vacante uuid;
begin
  if v_usuario is null then
    return false;
  end if;
  v_partes := regexp_match(p_nombre, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.pdf$');
  if v_partes is null or v_partes[1] <> v_usuario::text then
    return false;
  end if;
  v_vacante := v_partes[2]::uuid;
  return public.vacante_abierta(v_vacante)
    and not exists (
      select 1 from public.postulaciones p where p.postulante_id = v_usuario and p.vacante_id = v_vacante
    );
end;
$$;

revoke execute on function public.puede_subir_cv(text) from public, anon;
grant execute on function public.puede_subir_cv(text) to authenticated;

drop policy if exists "cvs: postulante sube su CV" on storage.objects;
drop policy if exists "cvs: postulante reemplaza su CV" on storage.objects;

create policy "cvs: postulante sube su CV" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and public.puede_subir_cv(name));

create policy "cvs: postulante reemplaza su CV" on storage.objects
  for update to authenticated
  using (bucket_id = 'cvs' and public.puede_subir_cv(name))
  with check (bucket_id = 'cvs' and public.puede_subir_cv(name));

-- 5. Limpieza menor.
-- Las decisiones se registran solo con decidir_postulacion (security definer).
drop policy if exists "decisiones: gestion humana crear" on public.decisiones;

-- Funciones de trigger: nadie las llama directamente.
revoke execute on function public.proteger_preguntas() from public, anon, authenticated;
revoke execute on function public.proteger_etapas() from public, anon, authenticated;

-- anon no tiene políticas en estas tablas (RLS ya lo bloquea): defensa en profundidad.
-- requisitos_oferta conserva su lectura pública de vacantes abiertas.
revoke all on
  public.consentimientos, public.criterios, public.decisiones, public.empresas, public.entrevistas,
  public.evaluaciones_ia, public.intentos_ingreso, public.llamadas_ia, public.plantilla_criterios,
  public.plantillas_rubrica, public.postulaciones, public.postulantes, public.preguntas,
  public.registro_actividad, public.requisitos_minimos, public.respuestas, public.rubricas,
  public.usuarios_empresa, public.v_postulaciones_staff, public.vacante_etapas, public.vacantes
from anon;
