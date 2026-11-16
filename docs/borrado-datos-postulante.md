# Pedido de borrado de datos de un postulante

Procedimiento manual (2026-11-16) para atender un reclamo de supresión o la revocatoria de
la autorización (Ley 1581 de 2012, art. 8 y 15). Todavía no hay pantalla para esto: lo hace
el operador con el panel de Supabase. **Borrar no se puede deshacer.**

## Plazos

- Reclamo (borrar, corregir, revocar): respuesta en máximo **15 días hábiles** desde que llega,
  ampliable 8 días hábiles más avisándole a la persona el motivo.
- Si el pedido está incompleto, pedir lo que falta dentro de los 5 días hábiles siguientes. Si
  no responde en 2 meses, se entiende que desistió.
- Consulta (solo saber qué datos hay): máximo 10 días hábiles, ampliable 5.

## Cuándo no se borra

No se borra si hay un deber legal o contractual de conservar los datos (por ejemplo, la
persona fue contratada y la empresa los necesita para el contrato). En ese caso se le responde
explicando el motivo. Si hay duda, se consulta con la empresa responsable antes de responder.

## Pasos

1. **Verificar la identidad.** El pedido debe venir del correo con el que se postuló, o traer
   prueba de identidad. Si lo pide otra persona, debe acreditar que actúa en su nombre.

2. **Ubicar la cuenta** (SQL Editor de Supabase):

   ```sql
   select p.id, p.nombre, p.correo,
          (select count(*) from public.postulaciones x where x.postulante_id = p.id) as postulaciones
   from public.postulantes p
   where p.pais_documento = 'CO' and p.numero_documento = '<documento>';
   ```

   Anotar el `id` (es el mismo id de la cuenta en Authentication).

3. **Ver qué se va a borrar:**

   ```sql
   select po.id, v.cargo, e.nombre as empresa, po.estado, po.cv_path
   from public.postulaciones po
   join public.vacantes v on v.id = po.vacante_id
   join public.empresas e on e.id = v.empresa_id
   where po.postulante_id = '<id>';
   ```

   Si la persona tiene postulaciones con varias empresas, cada empresa es responsable de la
   suya: avisarles que se atendió el pedido.

4. **Borrar los archivos.** En Storage → bucket `cvs`, borrar la carpeta `<id>/` completa. (Si
   más adelante existen buckets de audio o de entrevistas, borrar también su carpeta `<id>/`.)

5. **Borrar la cuenta.** En Authentication → Users, buscar por el `id` y borrar el usuario. Eso
   borra en cascada `postulantes`, `postulaciones` y, por cada postulación, `respuestas`,
   `consentimientos`, `evaluaciones_ia`, `decisiones` y `entrevistas`.

6. **Comprobar** que no quedó nada:

   ```sql
   select (select count(*) from public.postulantes where id = '<id>') as postulante,
          (select count(*) from public.postulaciones where postulante_id = '<id>') as postulaciones;
   ```

   Las dos columnas deben dar 0. Después correr el guion de archivos huérfanos para confirmar
   que no quedaron PDF sueltos:

   ```
   node --env-file=.env.local scripts/cvs-huerfanos.mjs
   ```

7. **Responder y registrar.** Contestarle a la persona que sus datos se borraron, con la fecha.
   Guardar fuera de la base (no hay tabla para esto todavía) un registro mínimo: fecha del
   pedido, fecha de respuesta y qué se borró, sin copiar sus datos. Sirve como prueba de que el
   reclamo se atendió.

## Qué queda

- `registro_actividad` conserva las filas de "ver CV" o "descargar CV" con el id de la
  postulación (que ya no existe) y el usuario de la empresa. No contiene datos de la persona.
- Los límites de intentos (`intentos_ingreso`) guardan solo hashes y vencen solos.
