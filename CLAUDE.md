# CLAUDE.md — App de selección de personal con IA

## Qué es
App web de marca blanca para que gestión humana filtre candidatos más rápido.
La IA (Gemini) analiza, puntúa y resalta; la decisión final SIEMPRE es humana.
Proyecto académico (Ingeniería de Sistemas, UCC Cali), pensado para escalar.

## Stack
- Next.js (App Router) + React + TypeScript + Tailwind
- Supabase: Postgres, Auth, Storage (CVs y audios en buckets privados), RLS
- Gemini API (modelo: gemini-3.1-flash-lite), solo desde el servidor
- Resend: en pausa hasta tener dominio propio (ver Decisiones de datos)
- GitHub + Vercel (vistas previas por rama, producción en main)

## Reglas éticas (obligatorias, no negociables)
- La IA SÍ: extrae datos del CV, aplica requisitos mínimos, transcribe audio,
  puntúa con la rúbrica citando evidencia, ordena por ajuste al cargo.
- La IA NO: dice quién es "el mejor", toma la decisión final, descarta en
  etapas de preguntas, evalúa edad, género, acento, tono de voz o rasgos
  personales, ni graba sin consentimiento (Ley 1581 de 2012).
- Requisitos mínimos sí descartan automáticamente. Si la IA no lee un dato,
  queda "por revisar", nunca descartado.
- Solo edad mínima; prohibido filtrar por edad máxima, género o estado civil.
- Revisión a ciegas en primeras etapas ("Candidato #014"); nombre visible
  solo en la entrevista final.
- Rapidez de respuesta suma un poco; lentitud no resta.

## Flujo de etapas (configurable por empresa y vacante)
1. Revisión automática de CV por requisitos mínimos.
2. Preguntas por texto, a ciegas.
3. Preguntas por voz, a ciegas (5–10 min). Botón "Solicitar ajuste" para
   responder por texto sin explicar motivo.
4. Entrevista con entrevistador, grabada y analizada después (no IA en vivo).
Preguntas iguales para todos los postulantes del mismo cargo.

## Pantallas
Postulante (móvil primero): postulación, ingreso con código + contraseña,
preguntas (texto/voz), confirmación.
Gestión humana (escritorio): vacantes activas, requisitos y etapas, rúbrica,
postulantes a ciegas, detalle del postulante.
Diseño: azul #2457C5, fondo #F6F7F9, fuente Inter. Interfaz muy sencilla.

## Tablas (Supabase)
- Acceso y empresa: empresas, usuarios_empresa.
- Vacantes: vacantes, vacante_etapas, requisitos_oferta (público),
  requisitos_minimos (solo personal de la empresa), plantillas_rubrica,
  plantilla_criterios, rubricas, criterios, preguntas.
- Postulación: postulantes, postulaciones, consentimientos, respuestas,
  entrevistas.
- IA y decisiones: evaluaciones_ia, llamadas_ia, decisiones.
- Auditoría: registro_actividad.
- Vista: v_postulaciones_staff (oculta nombre, correo, teléfono y CV hasta
  revelar). La oferta pública sale de la función `vacante_publica(token)`.
- Sin políticas, solo service role: intentos_ingreso (límites de intentos).

RLS: cada empresa solo ve sus datos. Registrar tokens usados por empresa en
`llamadas_ia`. `rubricas` y `criterios` se copian desde `plantillas_rubrica`
al crear la vacante.

## Audio
Navegador graba con MediaRecorder (webm/opus comprimido) → sube a bucket
privado de Supabase Storage → se guarda la ruta en `respuestas` → ruta de
servidor envía el audio a Gemini → se guarda la transcripción.
Borrado de archivos: pendiente, ver «Pendientes». Por ahora no se borra nada
automáticamente.

## Gemini
- Clave solo en servidor (GEMINI_API_KEY), nunca en el navegador.
- Cuatro tareas, una llamada cada una, sin agentes: leer CV, generar
  preguntas, transcribir audio, puntuar con rúbrica.
- Instrucciones de sistema fijas con las reglas éticas, salida JSON con
  esquema fijo, temperatura 0.2.
- Ahorro: preguntas generadas una vez por vacante, cada CV analizado una vez.

## Variables de entorno
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, RESEND_API_KEY
Nunca subir .env.local al repositorio.

## Decisiones de datos (2026-10-26)
- Edad mínima: booleano `cumple_edad_minima` en `postulaciones`. No se guarda
  la fecha de nacimiento.
- Un postulante puede aplicar a varias vacantes de la misma empresa: una
  postulación por vacante.
- Cuenta y código: Supabase Auth maneja el correo de confirmación y el código
  de 6 dígitos. Resend queda en pausa hasta tener dominio propio. Se quitó
  `accesos_codigo`.
- Una cuenta por persona: el documento (país + número) es único. El teléfono
  no es único. Solo el documento se usa para evitar cuentas repetidas.
- Postularse a otra vacante: la persona entra con su cuenta existente y se crea
  una postulación nueva. No hay una cuenta por vacante. Que la vacante esté
  abierta se revisa al postularse, no con el código.
- Límites de ingreso: 5 intentos fallidos de código o contraseña bloquean el
  ingreso 15 minutos. Máximo 3 códigos enviados por hora por postulante.
- Requisitos: `requisitos_oferta` y `requisitos_minimos` van separados porque
  RLS filtra filas, no columnas. Así el valor mínimo nunca llega al link público.

## Estado de la base de datos (2026-10-28)
- Proyecto Supabase `app-seleccion` (id `wknyyiejvafdcwkdpoqr`, us-east-1,
  plan gratis). Las 10 migraciones de `supabase\migrations\` están aplicadas,
  la última `correcciones_seguridad`. Todas las tablas con RLS activo.
- Advisors de seguridad: `intentos_ingreso` sin políticas es intencional (solo
  el servidor con la service role). Las funciones auxiliares de RLS son
  `SECURITY DEFINER` y `authenticated` debe poder ejecutarlas para que las
  políticas funcionen. "Protección de contraseñas filtradas" sigue apagada.
- Bucket `cvs` privado: 4 MB, solo PDF.
- Los pesos de la rúbrica suman 100 por código (`repartir`), no por la base.

## Despliegue
- Vercel, equipo `carloslozano`, proyecto `app-seleccion`. Producción:
  https://app-seleccion-mu.vercel.app (se despliega solo con cada push a main).
  Ojo: `app-seleccion.vercel.app` es de otra persona, no de este proyecto.

## Correcciones de seguridad (2026-10-28)
- Migración `20261028120000_correcciones_seguridad.sql` (fase 1 de la revisión
  técnica). Probada en seco contra la base real con 28 pruebas de RLS y
  aplicada en Supabase el 2026-10-28.
- Qué cambia: la oferta pública sale de la función `vacante_publica(token)` y ya
  no de `v_vacantes_publicas` (se borra); nadie sin sesión lista vacantes ni
  etapas. El postulante solo escribe `postulante_id, vacante_id, cv_path,
  etapa_actual_id` y la base exige vacante abierta, primera etapa y su propio CV.
  Respuestas y consentimientos: solo ver y crear, sin editar ni borrar.
  Preguntas: solo las de etapas alcanzadas. `documento_disponible`: solo
  service role. Bucket `cvs`: 4 MB, solo PDF (Vercel corta a los 4,5 MB).
- Advisors: los avisos de `vacante_publica` y `vacante_abierta` (anon) y de las
  funciones auxiliares de RLS (authenticated) son intencionales.
- Flujo del postulante (fase 2): si el documento ya tiene cuenta, se entra con el
  correo de esa cuenta y se crea otra postulación. Límites con
  `intentos_ingreso`: 3 códigos por hora por correo y 5 códigos fallidos → 15
  min. El CV se valida (firma `%PDF-`, 4 MB) antes de usar el código. Un correo
  de empresa no puede postularse.

## Pendientes
- **Borrado y espacio (paréntesis, para cuando sea plan de pago).** Hoy la app
  es de prueba y no borra archivos. Para la versión de pago, cada empresa
  definirá cuánto tiempo se guardan CVs, audios y grabaciones (por ejemplo,
  días desde el cierre de la vacante), y el sistema borrará los archivos al
  vencer el plazo. Opciones que se evaluarán: plazo por empresa, borrar solo
  audios al cerrar la vacante, o almacenamiento propio de la empresa. Motivo:
  el plan gratis de Supabase tiene 1 GB de Storage. Con 3 preguntas de voz de
  5 a 10 min por postulante, se llenan entre unos 150 y 550 postulantes.

## Decisiones abiertas de la revisión técnica (2026-10-28)
Ninguna está decidida: preguntar antes de cambiarlas.
- Contraseña del postulante: se crea, pero no hay pantalla para entrar con ella
  (siempre se entra con código). ¿Quitarla o agregar "Ingresar con contraseña"?
- Rol `entrevistador`: hoy RLS lo trata igual que a gestión humana.
- `llamadas_ia`: no se registran los tokens de Gemini ni hay tope por empresa.
- `publicarVacante` pasa a "abierta" desde cualquier estado (¿reabrir cerradas?).
- Agregar preguntas con postulaciones recibidas sigue permitido (rompe
  "preguntas iguales para todos").
- La página de preguntas del postulante todavía usa datos de prueba.

## Forma de trabajar
- Nombres de tablas, columnas y variables de dominio en español.
- Ramas por funcionalidad; main protegida = producción.
- Probar en la vista previa de Vercel antes de unir a main.
- Supabase plan gratis: 500 MB de base de datos y 1 GB de almacenamiento.
- Cambios pequeños y explicados; preguntar antes de decisiones grandes.
- Mantener este archivo actualizado con cada decisión nueva.

## Orden de trabajo
1. Interfaz con datos de prueba  2. Base de datos  3. Integración con Gemini
4. Repositorio  5. Despliegue en Vercel
