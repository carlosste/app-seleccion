-- Pruebas de la migración 20261116120000_endurecer_base.sql, con roles reales.
-- Se corren DESPUÉS del texto de la migración, en la misma transacción, y todo termina en un
-- error a propósito: así la transacción se deshace siempre y la base queda igual.
-- Uso: begin; <migración>; <este archivo>  (el resultado sale en el mensaje del error final).
-- Datos: los ids de abajo son de los datos de prueba del 2026-11-16; si cambian, actualizarlos.

select set_config('pruebas.r', '', true);

-- prueba(nombre, usuario o null = anon, sql, debe_fallar)
create function pg_temp.prueba(p_nombre text, p_usuario uuid, p_sql text, p_debe_fallar boolean)
returns void language plpgsql as $$
declare
  v_ok boolean;
  v_detalle text := '';
begin
  perform set_config('request.jwt.claims',
    case when p_usuario is null then '{"role":"anon"}'
         else json_build_object('sub', p_usuario, 'role', 'authenticated')::text end, true);
  execute case when p_usuario is null then 'set local role anon' else 'set local role authenticated' end;
  begin
    execute p_sql;
    v_ok := not p_debe_fallar;
  exception when others then
    v_ok := p_debe_fallar;
    v_detalle := ' [' || sqlerrm || ']';
  end;
  reset role;
  perform set_config('pruebas.r',
    current_setting('pruebas.r') || chr(10) || case when v_ok then 'OK    ' else 'FALLA ' end || p_nombre || v_detalle, true);
end;
$$;

-- Gestión humana de la empresa con datos; su vacante abierta con 13 postulantes y su borrador vacío.
-- Postulante 14548b1d ya está postulado a 3b447c59.
select pg_temp.prueba('1. gestión no cambia limite_postulantes', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.empresas set limite_postulantes = 99999 where id = '70b2bcf0-2afd-4a11-90f6-b7663c210608'$q$, true);
select pg_temp.prueba('2. gestión no cambia plan', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.empresas set plan = plan where id = '70b2bcf0-2afd-4a11-90f6-b7663c210608'$q$, true);
select pg_temp.prueba('3. gestión sí edita el nombre de la empresa', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.empresas set nombre = nombre where id = '70b2bcf0-2afd-4a11-90f6-b7663c210608'$q$, false);
select pg_temp.prueba('4. gestión no cambia enlace_token', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.vacantes set enlace_token = 'otro' where id = '3b447c59-b2ef-40b3-a377-1ebb6104c4ba'$q$, true);
select pg_temp.prueba('5. gestión no cambia empresa_id de una vacante', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.vacantes set empresa_id = empresa_id where id = '3b447c59-b2ef-40b3-a377-1ebb6104c4ba'$q$, true);
select pg_temp.prueba('6. gestión sí edita la descripción', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.vacantes set descripcion = descripcion where id = '3b447c59-b2ef-40b3-a377-1ebb6104c4ba'$q$, false);
select pg_temp.prueba('7. no se borra una etapa de vacante con postulantes', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$do $d$ begin
    delete from public.vacante_etapas where id = '5354a512-30d2-496a-8e49-51bc5c41b02d';
    if not found then raise exception 'no borró nada (RLS)'; end if;
  end $d$$q$, true);
select pg_temp.prueba('8. no cambia el orden de una etapa con postulantes', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.vacante_etapas set orden = orden + 10 where id = '5354a512-30d2-496a-8e49-51bc5c41b02d'$q$, true);
select pg_temp.prueba('9. no cambia vacante_id ni activa de una etapa', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$update public.vacante_etapas set activa = activa where id = '5354a512-30d2-496a-8e49-51bc5c41b02d'$q$, true);
select pg_temp.prueba('10. sí se renombra una etapa con postulantes', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$do $d$ begin
    update public.vacante_etapas set nombre = 'Renombrada' where id = '5354a512-30d2-496a-8e49-51bc5c41b02d';
    if not found then raise exception 'no actualizó'; end if;
  end $d$$q$, false);
select pg_temp.prueba('11. sí se elimina una vacante sin postulantes (etapas en cascada)', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$do $d$ begin
    perform public.eliminar_vacante('005cd258-8936-478d-9b61-be13683bd89a');
    if exists (select 1 from public.vacante_etapas where vacante_id = '005cd258-8936-478d-9b61-be13683bd89a') then
      raise exception 'quedaron etapas';
    end if;
  end $d$$q$, false);
select pg_temp.prueba('12. gestión no inserta decisiones directo', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$insert into public.decisiones (postulacion_id, usuario_id, resultado)
     select id, 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72', 'pasa' from public.postulaciones
     where vacante_id = '3b447c59-b2ef-40b3-a377-1ebb6104c4ba' limit 1$q$, true);
select pg_temp.prueba('13. anon no lee vacantes', null, $q$select 1 from public.vacantes limit 1$q$, true);
select pg_temp.prueba('14. anon sí lee requisitos_oferta de abiertas', null, $q$select 1 from public.requisitos_oferta limit 1$q$, false);
select pg_temp.prueba('15. anon sí usa vacante_publica', null,
  -- El token se lee antes, como dueño: anon ya no puede leer la tabla vacantes.
  format($q$select * from public.vacante_publica('%s')$q$,
    (select enlace_token from public.vacantes where id = '3b447c59-b2ef-40b3-a377-1ebb6104c4ba')), false);
select pg_temp.prueba('16. postulante ya postulado no reemplaza su CV', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  $q$do $d$ begin
    update storage.objects set metadata = metadata
    where bucket_id = 'cvs' and name = '14548b1d-97b3-4c51-a853-8b4d346e82a3/3b447c59-b2ef-40b3-a377-1ebb6104c4ba.pdf';
    if not found then raise exception 'sin filas: la política no deja actualizar'; end if;
  end $d$$q$, true);
select pg_temp.prueba('17. postulante no sube archivos con otro nombre', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  $q$insert into storage.objects (bucket_id, name, owner) values ('cvs', '14548b1d-97b3-4c51-a853-8b4d346e82a3/extra.pdf', '14548b1d-97b3-4c51-a853-8b4d346e82a3')$q$, true);
select pg_temp.prueba('18. postulante no sube en la carpeta de otro', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  $q$insert into storage.objects (bucket_id, name, owner) values ('cvs', 'a3c01841-3c97-4536-a09b-3a72a7c40b8b/af1069b5-4a36-4e3e-843b-c1f8636e22d3.pdf', '14548b1d-97b3-4c51-a853-8b4d346e82a3')$q$, true);

-- Flujo normal completo con una vacante nueva: crear, configurar, publicar, postularse, responder, decidir.
select pg_temp.prueba('19. flujo: crear vacante con etapas y pregunta, y publicar', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  $q$do $d$ declare v uuid; e2 uuid; begin
    insert into public.vacantes (empresa_id, cargo, estado, creado_por)
      values ('70b2bcf0-2afd-4a11-90f6-b7663c210608', 'Prueba fase 2', 'borrador', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72')
      returning id into v;
    insert into public.vacante_etapas (vacante_id, tipo, orden) values (v, 'cv', 1);
    insert into public.vacante_etapas (vacante_id, tipo, orden) values (v, 'texto', 2) returning id into e2;
    insert into public.vacante_etapas (vacante_id, tipo, orden) values (v, 'entrevista', 3);
    update public.vacante_etapas set orden = 4 where vacante_id = v and orden = 3;  -- mover antes de publicar
    update public.vacante_etapas set orden = 3 where vacante_id = v and orden = 4;
    insert into public.preguntas (vacante_id, etapa_id, texto, tipo, orden) values (v, e2, '¿Pregunta de prueba?', 'texto', 1);
    update public.vacantes set estado = 'abierta' where id = v;
    perform set_config('pruebas.vac', v::text, true);
    perform set_config('pruebas.etapa', e2::text, true);
  end $d$$q$, false);
select pg_temp.prueba('20. flujo: postulante sube su CV a la vacante nueva', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  format($q$insert into storage.objects (bucket_id, name, owner) values ('cvs', '14548b1d-97b3-4c51-a853-8b4d346e82a3/%s.pdf', '14548b1d-97b3-4c51-a853-8b4d346e82a3')$q$, current_setting('pruebas.vac')), false);
select pg_temp.prueba('21. flujo: reintento antes de postularse sí reemplaza', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  format($q$do $d$ begin
    update storage.objects set metadata = '{}'::jsonb where bucket_id = 'cvs' and name = '14548b1d-97b3-4c51-a853-8b4d346e82a3/%s.pdf';
    if not found then raise exception 'no actualizó'; end if;
  end $d$$q$, current_setting('pruebas.vac')), false);
select pg_temp.prueba('22. flujo: crea la postulación', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  format($q$insert into public.postulaciones (postulante_id, vacante_id, cv_path, etapa_actual_id)
     values ('14548b1d-97b3-4c51-a853-8b4d346e82a3', '%1$s', '14548b1d-97b3-4c51-a853-8b4d346e82a3/%1$s.pdf', public.primera_etapa('%1$s'))$q$,
     current_setting('pruebas.vac')), false);
select pg_temp.prueba('23. tras postularse ya no reemplaza el CV', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  format($q$do $d$ begin
    update storage.objects set metadata = '{}'::jsonb where bucket_id = 'cvs' and name = '14548b1d-97b3-4c51-a853-8b4d346e82a3/%s.pdf';
    if not found then raise exception 'sin filas: la política no deja actualizar'; end if;
  end $d$$q$, current_setting('pruebas.vac')), true);
select pg_temp.prueba('24. tras postularse no sube un segundo archivo', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  $q$insert into storage.objects (bucket_id, name, owner) values ('cvs', '14548b1d-97b3-4c51-a853-8b4d346e82a3/segundo.pdf', '14548b1d-97b3-4c51-a853-8b4d346e82a3')$q$, true);
select pg_temp.prueba('25. flujo: postulante responde', '14548b1d-97b3-4c51-a853-8b4d346e82a3',
  format($q$insert into public.respuestas (postulacion_id, pregunta_id, modalidad, texto)
     select p.id, q.id, 'texto', 'Respuesta de prueba' from public.postulaciones p, public.preguntas q
     where p.vacante_id = '%1$s' and p.postulante_id = '14548b1d-97b3-4c51-a853-8b4d346e82a3' and q.vacante_id = '%1$s'$q$,
     current_setting('pruebas.vac')), false);
select pg_temp.prueba('26. la vacante nueva ya no deja borrar sus etapas', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  format($q$delete from public.vacante_etapas where id = '%s'$q$, current_setting('pruebas.etapa')), true);
select pg_temp.prueba('27. flujo: gestión humana decide', 'ebe5d3e0-905f-4835-a4e8-0ef6c788cd72',
  format($q$select public.decidir_postulacion(
     (select id from public.postulaciones where vacante_id = '%s'), 'pasa', null)$q$, current_setting('pruebas.vac')), false);
select pg_temp.prueba('28. anon y authenticated sin permiso sobre funciones de trigger', null,
  $q$do $d$ begin
    if has_function_privilege('anon', 'public.proteger_preguntas()', 'execute')
       or has_function_privilege('authenticated', 'public.proteger_etapas()', 'execute') then
      raise exception 'todavía tienen permiso';
    end if;
  end $d$$q$, false);

do $$ begin
  raise exception 'RESULTADO (transacción deshecha a propósito):%', current_setting('pruebas.r');
end $$;
