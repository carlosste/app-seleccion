# CLAUDE.md — App de selección de personal con IA

## Qué es
App web de marca blanca para que gestión humana filtre candidatos más rápido.
La IA (Gemini) analiza, puntúa y resalta; la decisión final SIEMPRE es humana.
Proyecto académico (Ingeniería de Sistemas, UCC Cali), pensado para escalar.

## Stack
- Next.js (App Router) + React + TypeScript + Tailwind
- Supabase: Postgres, Auth, Storage (CVs y audios en buckets privados), RLS
- Gemini API, solo desde el servidor. Modelo principal gemini-3.1-flash-lite;
  si está saturado (503) reintenta y pasa a gemini-3.5-flash-lite y luego a
  gemini-2.5-flash (todos del plan gratuito). La lista está en lib/ia/gemini.ts.
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
- **Sin revisión a ciegas (2026-11-17, decisión de Carlos).** La app ya no se
  presenta ni funciona como selección "a ciegas". El código de candidato
  ("Candidato #014") se queda, pero solo para distinguir rápido a muchos
  postulantes, no para ocultarlos. El CV original se ve y se descarga en cualquier
  etapa (decisión del 2026-10-28).
  **PENDIENTE en el código:** la vista `v_postulaciones_staff` todavía oculta
  nombre, correo y teléfono hasta la entrevista, y `/privacidad` todavía dice que
  la revisión es a ciegas. Quitarlo pide una migración de la vista, ajustar
  `lib/gestion/datos.ts` y el texto legal; se planea aparte, con el ok de Carlos.
- Rapidez de respuesta suma un poco; lentitud no resta.

## Flujo de etapas (lo define gestión humana en cada vacante)
No hay un número fijo de etapas: gestión humana decide cuántas, en qué orden y de
qué tipo (2026-11-17, Carlos). Los tipos disponibles:
- Revisión automática de CV por requisitos mínimos.
- Preguntas por texto.
- Preguntas por voz (5–10 min). Botón "Solicitar ajuste" para responder por texto
  sin explicar motivo.
- Entrevista con entrevistador, grabada y analizada después (no IA en vivo).
Preguntas iguales para todos los postulantes del mismo cargo.

## Pantallas
Postulante (móvil primero): postulación con hoja de vida, ingreso con ID +
contraseña, preguntas (texto/voz), confirmación.
Gestión humana (escritorio): vacantes activas, requisitos y etapas, rúbrica,
postulantes (con su código), detalle del postulante.
Diseño (desde 2026-11-16, rediseño con las skills `design-taste-frontend` y
`emil-design-eng`, a pedido de Carlos; reemplaza a "Violeta y durazno"): paleta
"Verde azulado sobre papel" repartida por Taste: verde azulado #06525C como color
principal, ocre #C2610C para la etapa de voz, verde oliva #3D7A1F para avanzar, fondos
casi blancos (#F7F9F8, página #EBF0EE), fuente Onest (vía `next/font`). Los colores
viven como variables en `app/globals.css` (`--primario`, `--acento`, `--verde`,
`--peligro`…; los nombres no cambiaron); todo texto cumple contraste AA y nada baja de
13px. Movimiento según Emil: hover solo con mouse (`@media (hover: hover)`), botones que
se achican un 3 % al presionar, curvas `--ease-out`, avisos que entran con un fundido
corto y "reducir movimiento" respetado. Cada tipo de etapa tiene su color (texto verde
azulado, voz ocre, entrevista verde oliva, CV gris). Interfaz sencilla.
Inicio para empresas (2026-11-16): `/` muestra `public/inicio/index.html`, página
estática hecha con el kit de Taste (copiado en `public/inicio/assets`) y servida con un
rewrite en `next.config.ts`; pasó su revisión (`gate.mjs`: PASS). Acción principal
"Registrar empresa" → `/empresa/registro`; a su lado, en el encabezado y en la barra
móvil, "Iniciar sesión" → `/empresa/ingreso` (2026-11-17). Con sesión de empresa, esos
dos botones se cambian por una bolita con las iniciales ("Ver cuenta"): abre un menú con
nombre, correo, empresa, "Ir al panel" y "Cerrar sesión" (`public/inicio/assets/sesion.js`
y `sesion.css`). Como el inicio es HTML estático, pregunta a `GET /api/sesion` (solo nombre,
correo y empresa de quien ya tiene sesión, sin caché) y cierra con `POST /api/sesion/salir`
(rechaza otro `Origin`). Marca de la plataforma: "Selección" con el
logo de cuatro puntos (`components/marca.tsx`), en ingreso, registro y la página 404.
**CONFIRMAR (Carlos):** "Selección" como nombre visible de la plataforma.
Textos del inicio (2026-11-17, Carlos): es un prototipo para presentar, así que no habla
del desarrollo (plan gratuito de Gemini, datos de prueba). Nada de "a ciegas" ni de un
número fijo de etapas. En lugar de "Reglas de la IA", una frase de la empresa (sección
`#proposito`) con un aparte "Importante: la IA nunca decide por ti; tú pones los topes y
los parámetros". En lugar de preguntas frecuentes, "Cómo te ayuda en el día a día"
(`#equipo`): dudas de alguien de gestión humana que no sabe de IA (qué hace la IA por mí,
si descarta candidatos, cómo ayuda a encontrar un buen candidato, datos protegidos,
cambiar una pregunta publicada).
Panel de gestión (2026-11-16, mismo rediseño): es la "ventana de app" del inicio. Barra
superior blanca (`nav-gestion.tsx`); en cada vacante, barra lateral con Requisitos, Rúbrica y
Postulantes, y las etapas con su color y cuántos llegaron (`pestanas.tsx`; en tableta pasa a
pestañas arriba). Postulantes en filas (número, etapa, ajuste, chip de decisión). Arriba, buscador por
número de candidato ("14", "014" o "#14" → #014; filtra en el navegador,
`components/gestion/lista-postulantes.tsx`, 2026-11-17). En "Vacantes activas" la columna
del medio tiene ancho fijo para que los números queden alineados entre filas. En el detalle,
la frase que la IA citó se marca dentro de la respuesta (`marcar-evidencia.tsx`). Para eso
`puntuar_rubrica` guarda en `resultado.etapas[].criterios[]` dos campos opcionales, `cita` y
`pregunta`, **solo si la cita se verificó** como fragmento literal de la respuesta. Sin migración
(es jsonb); las evaluaciones anteriores se ven igual, sin marca. Estilos en la sección "Panel de
gestión humana" de `app/globals.css`.

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
- **Contenido de terceros como datos (2026-11-16).** Lo que escribe el postulante
  (respuestas, CV) va delimitado como datos y nunca mezclado con las instrucciones
  (`delimitar` en `lib/ia/gemini.ts`); cada tarea manda su esquema de salida en
  `generationConfig.responseJsonSchema` (JSON Schema estándar; `responseSchema` da 400).
  La lógica que toca contenido del postulante está en `lib/gestion/calificacion-ia.ts`
  y las defensas del servidor en `lib/ia/proteccion.ts`: cita verificada contra la
  respuesta, detector de manipulación, enmascarado de datos personales y firma `%PDF-`.
  Si la IA o el detector ven un posible intento de manipulación, la etapa o el CV quedan
  con `sospecha` (aviso en el detalle y en la lista) y el CV pasa a "por revisar" sin
  avance ni descarte automático. `VERSION_PUNTAJE` = 3. Pruebas:
  `node --env-file=.env.local scripts/pruebas-inyeccion.mjs` (llama a Gemini con datos
  ficticios, no toca la base).
- Los errores de Gemini no copian el texto de la respuesta a los registros.

## Variables de entorno
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, RESEND_API_KEY
Nunca subir .env.local al repositorio.

## Decisiones de datos (2026-10-26)
- Edad mínima: booleano `cumple_edad_minima` en `postulaciones`. No se guarda
  la fecha de nacimiento.
- Un postulante puede aplicar a varias vacantes de la misma empresa: una
  postulación por vacante.
- **Modo de pruebas sin correos (2026-10-28, decisión de Carlos).** La app no
  envía ningún correo. El postulante llena nombre, correo, teléfono, documento
  y sube la hoja de vida en la primera pantalla; la cuenta se crea ya
  confirmada desde el servidor y entra directo a las preguntas. Para volver a
  entrar usa **ID = número de documento** y **contraseña = número de
  documento**. Es inseguro a propósito (quien conozca el documento de alguien
  entra a su postulación): solo para pruebas, cambiar antes de usar la app con
  postulantes reales.
- El país del documento ya no se pide: se guarda "CO" fijo, porque la base exige
  país y número juntos. El documento va de 6 a 20 letras o números (Supabase
  pide contraseñas de al menos 6).
- Una cuenta por persona: el documento es único. El teléfono no es único.
- Postularse a otra vacante: se llena el formulario con el mismo documento y
  correo; se usa la cuenta existente y se crea una postulación nueva.
- Límites de ingreso: 5 intentos fallidos de ID/contraseña bloquean 15 minutos
  (por documento y por red). Máximo 20 postulaciones por hora desde una red.
- Requisitos: `requisitos_oferta` y `requisitos_minimos` van separados porque
  RLS filtra filas, no columnas. Así el valor mínimo nunca llega al link público.

## Estado de la base de datos (2026-10-28)
- Proyecto Supabase `app-seleccion` (id `wknyyiejvafdcwkdpoqr`, us-east-1,
  plan gratis). Las 14 migraciones de `supabase\migrations\` están aplicadas,
  la última `endurecer_base` (2026-11-16). Todas las tablas con RLS activo.
- 2026-10-28, ~21:47 UTC: base vaciada a pedido de Carlos (todas las empresas,
  cuentas, vacantes, postulantes y CVs). Se conservan el esquema, funciones,
  políticas y el bucket `cvs`. Para datos de prueba: `scripts/seed-postulantes.mjs`.
- Advisors de seguridad: `intentos_ingreso` sin políticas es intencional (solo
  el servidor con la service role). Las funciones auxiliares de RLS son
  `SECURITY DEFINER` y `authenticated` debe poder ejecutarlas para que las
  políticas funcionen. "Protección de contraseñas filtradas" sigue apagada.
- Bucket `cvs` privado: 4 MB, solo PDF.
- Los pesos de la rúbrica suman 100 por código (`repartir`), no por la base.

## Flujo real de la postulación (2026-10-28, decisión de Carlos)
- Migración `20261028170000_flujo_postulacion.sql`, aplicada y probada con roles
  reales (13 pruebas en una transacción deshecha).
- **Revisión de CV interna.** El postulante no la ve: aunque su etapa sea "cv",
  responde de una vez la siguiente etapa de texto o voz (`orden_alcanzado`). Las
  preguntas de entrevista nunca le llegan.
- **Preguntas reales.** Salen de `preguntas_pendientes(postulacion)` y cada
  respuesta se guarda al enviarla; al volver sigue donde iba. **Por ahora la voz
  se responde por escrito** (para la entrega del 50 %); la grabación va después.
- **"Evaluar con IA" a mano**, desde el detalle del postulante, para ahorrar
  tokens (no se llama a Gemini en cada postulación). Lee el CV una sola vez
  (`leer_cv`): hoja de vida sin datos personales + requisitos mínimos. Si no
  cumple uno, `registrar_revision_cv` lo descarta solo; si cumple y sigue en
  "cv", pasa a la siguiente etapa; si falta un dato, queda "por revisar". Luego
  puntúa las respuestas con la rúbrica (`puntuar_rubrica`) solo si hay
  respuestas nuevas. El ajuste lo calcula el servidor (promedio ponderado); los
  criterios sin evidencia no cuentan.
- **Decisión humana** con `decidir_postulacion`: "Pasa" → siguiente etapa (o
  seleccionada si era la última); "No pasa" → descartada. Solo `gestion_humana`.
  Al pasar a la entrevista se revela el nombre.
- La descripción pública se edita en la pestaña Requisitos ("Redactar/Mejorar
  con IA" solo propone; se guarda a mano). Es lo único que ve el postulante
  además del cargo.
- A la IA solo se le envía el **mínimo** de cada requisito, nunca lo que pide la
  oferta: con los dos, comparaba contra la oferta y descartaba de más (probado
  el 2026-10-28 con un CV ficticio).
- Con un PDF adjunto (el CV), cada intento a Gemini espera hasta 40 s en vez
  de 15 s: leerlo tarda unos 13-14 s. `evaluaciones_ia.modelo` guarda el
  modelo que respondió de verdad (puede ser uno de respaldo).
- `GEMINI_API_KEY` está en `.env.local` desde el 2026-10-28.

## Preguntas fijas, análisis por etapa y CV (2026-10-28, decisión de Carlos)
- Migración `20261028190000_bloqueo_preguntas` (aplicada y probada): un trigger
  en `preguntas` impide crear, editar o borrar preguntas de una etapa
  bloqueada (`etapa_bloqueada`): la primera etapa de preguntas al publicar la
  vacante, y cualquier etapa a la que ya llegó un postulante
  (`postulantes_en_etapa`). Publicar exige preguntas en la primera etapa;
  después de publicar no se reordenan etapas.
- Detalle del postulante: una pestaña por cada etapa de preguntas de la
  vacante, con sus respuestas y su análisis; el total va en la columna lateral.
- Cada etapa se califica solo con sus respuestas (sin hoja de vida), escala
  fija y temperatura 0. `VERSION_PUNTAJE` (hoy 2) marca el criterio: una etapa
  calificada con otra versión se recalifica. "Analizar todos" (lista de
  postulantes) evalúa a los que siguen en proceso, uno por uno, desde el
  navegador.
- CV: `/api/gestion/cv/[id]` lo entrega en cualquier etapa (en la página o con
  `?descargar=1`), con nombre de archivo `candidato-NNN.pdf`, y registra
  `ver_cv` / `descargar_cv` en `registro_actividad`.

## Evaluación por etapa (2026-10-28, decisión de Carlos)
- `puntuar_rubrica` guarda un puntaje por cada etapa de preguntas (texto, voz…)
  en `resultado.etapas`; `ajuste_total` es el promedio de las etapas. Solo se
  llama a la IA por las etapas con respuestas nuevas. Las evaluaciones del
  formato anterior (un solo puntaje) se muestran como una sección y se rehacen
  por etapa al volver a evaluar.

## Vacantes: requisitos por cargo y eliminar (2026-10-28, decisión de Carlos)
- Al crear una vacante, la IA propone de 4 a 6 requisitos propios del cargo
  (`proponerRequisitos` en `lib/gestion/requisitos-por-defecto.ts`); el código
  agrega siempre "Mayor de 18 años". El mínimo se escribe para entenderse solo
  (la revisión de CV solo recibe el mínimo). Se filtran edad, género, estado
  civil, apariencia, religión, condición física, salud y vacunas. Si la IA
  falla, la vacante queda solo con la edad mínima y la pestaña Requisitos avisa.
- "Sugerir con IA según el cargo" (pestaña Requisitos) reemplaza la lista.
- **Eliminar solo vacantes sin postulantes** (`eliminar_vacante`, migración
  `20261028180000_eliminar_vacante`, aplicada y probada). Con postulantes, el
  botón es "Cerrar vacante": estado `cerrada`, deja de recibir y sale de la
  lista, sin borrar datos.
- **Vacantes cerradas (2026-11-17).** `/gestion/cerradas` (enlace "Cerradas" en la barra y
  "Ver vacantes cerradas" en Vacantes activas) lista las cerradas con las mismas filas que las
  activas: fecha de cierre, postulados y seleccionados. Cada una se abre como siempre
  (postulantes, respuestas, CV) con un aviso de "Vacante cerrada". Al cerrar se guarda
  `cerrada_at` (las cerradas antes salen solo "Cerrada"). Sin migración. Reabrir no se hace:
  sigue siendo decisión abierta.

## Sesiones separadas (2026-10-28)
- La empresa usa la cookie de sesión por defecto de Supabase; el postulante, la
  suya (`sb-postulante-auth-token`, `crearClientePostulante`). `proxy.ts` solo
  mira la del postulante en `/postular/...` y nunca lo manda a `/gestion`. Así
  se puede probar empresa y postulante en el mismo navegador sin que una sesión
  saque a la otra.

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
- Flujo del postulante: el CV se valida por su firma `%PDF-` y 4 MB como
  máximo. Un correo de empresa no puede postularse. (Desde el 2026-10-28 ya no
  hay código por correo: ver "Modo de pruebas sin correos".)

## Revisión de seguridad (2026-11-16)
Resumen completo, pensado para el profesor: `docs/seguridad.md` (enlazado desde el README).
Cinco ramas apiladas, a unir en este orden: `seguridad-prompt-injection` →
`seguridad-base` → `seguridad-privacidad` → `seguridad-cabeceras` → `mantenimiento-borrado`.
Si cambia algo de seguridad, actualizar también ese documento.

## Endurecer la base (2026-11-16)
- Migración `20261116120000_endurecer_base.sql`, probada con roles reales en una
  transacción deshecha (`supabase/pruebas/20261116_endurecer_base.sql`, 28 pruebas).
  **Aplicada en Supabase el 2026-11-16** con el visto bueno de Carlos. Después de aplicarla
  se repitieron las 28 pruebas sobre la base real: 28 OK.
- Etapas: con postulantes no se borran ni cambian tipo, orden o vacante (trigger
  `proteger_etapas`); renombrar sí. Borrar la vacante entera sin postulantes sigue igual.
- Columnas editables desde la API: `empresas` (nombre, sector, ciudad, teléfono,
  sitio web, tamaño), `vacantes` (cargo, descripción, estado, cerrada_at),
  `vacante_etapas` (nombre, orden, tipo).
- Bucket `cvs`: un archivo por vacante con nombre fijo, solo a vacantes abiertas y solo
  antes de crear la postulación (`puede_subir_cv`). `/api/gestion/cv` solo sirve PDF.
- Decisiones solo por `decidir_postulacion`; `anon` sin permisos en tablas sin
  política (salvo `requisitos_oferta`).
- Rol `entrevistador`: sigue igual que gestión humana (decisión de Carlos, 2026-11-16;
  se definirá más adelante).

## Privacidad (2026-11-16, decisiones de Carlos)
- **Modelos gratuitos = solo desarrollo (Carlos, 2026-11-16).** Los modelos gratuitos de
  Gemini son una brecha de privacidad para datos reales; se usan solo para desarrollar y
  ver que la app funciona. La versión final usará modelos de pago (privacidad y análisis
  más sofisticado). Interruptor `GEMINI_PLAN_PAGO` (env, `false` por defecto): mientras
  esté apagado, `AvisoModoPruebas` avisa en el formulario y en el panel. Pasos para el
  cambio: `docs/seguridad.md`, sección 6.
- **Solo datos ficticios mientras se use el plan gratuito de Gemini.** En ese plan Google
  puede usar lo enviado para mejorar sus productos, con revisión humana, y sus términos
  piden no enviar datos personales (verificado el 2026-11-16). Antes de recibir hojas de
  vida reales hay que pasar a una clave con facturación activa.
- Consentimiento v2 para Colombia (Ley 1581 de 2012, Decreto 1377 de 2013): dos casillas
  separadas (datos con IA y transmisión internacional; grabación) y la política en
  `/privacidad`. Responsable: la empresa de la vacante; encargado: el operador de la
  plataforma. El texto vive en `lib/legal/tratamiento-datos.ts` (`VERSION_TEXTO`).
  **PENDIENTE (Carlos):** nombre, identificación, domicilio, correo y teléfono del
  operador; hoy la página dice "por definir".
- Registros: los errores del servidor pasan por `registrarError` (`lib/registro.ts`),
  que deja solo tipo, código, estado y mensaje (sin `details`, que trae valores de filas).
- Tope de IA y aprobación de empresas: no por ahora (Carlos, 2026-11-16); se retoman al
  producir a mayor escala.

## Cabeceras de seguridad (2026-11-16)
- `next.config.ts` (`headers()`): nosniff, Referrer-Policy, `X-Frame-Options: SAMEORIGIN`
  (el visor de CV usa un iframe propio), Permissions-Policy (micrófono solo propio) y CSP
  en modo **Report-Only**. Sin nonces: Next.js 16 los declara incompatibles con PPR
  (`cacheComponents`). Pasar a `Content-Security-Policy` obligatoria cuando la vista
  previa no reporte violaciones en el flujo completo (registro, panel, visor de CV,
  postulación). Páginas públicas revisadas en local el 2026-11-16: sin violaciones.

## Borrado manual (2026-11-16, decisión de Carlos)
- `scripts/cvs-huerfanos.mjs`: lista los PDF del bucket `cvs` sin postulación (no toca
  los de menos de 24 h). Por defecto solo lee; con `--borrar` pide escribir una frase de
  confirmación. Primera corrida (2026-11-16): 126 archivos, 0 huérfanos.
- `docs/borrado-datos-postulante.md`: cómo atender un pedido de borrado de un postulante
  (plazos de la Ley 1581, qué borrar y cómo comprobarlo). Sin pantalla nueva.
- Nada se borra automáticamente: la retención por plazo sigue siendo de la versión de pago.

## Pendientes

### Correos (en pausa hasta tener dominio propio y proveedor, p. ej. Resend)
- Volver a un ingreso seguro: código por correo o contraseña elegida por el
  postulante, en lugar de ID y contraseña = documento.
- Avisos al postulante: confirmación de postulación y aviso cuando pasa de
  etapa. Hoy debe volver a entrar para ver si sigue en el proceso.
- Con el correo de vuelta, pedir otra vez el país del documento.

### Mejora a futuro: tope de uso de la IA (decidido el 2026-10-28)
No se hace por ahora: primero, que toda la app funcione. Cuando se retome:
- Registrar cada llamada a Gemini en `llamadas_ia` (empresa, tarea, modelo,
  tokens de entrada y salida). `pedirJson` debe devolver `usageMetadata` y la
  fila se guarda con la service role.
- Tope diario por empresa: antes de llamar a Gemini, sumar los tokens del día y
  bloquear con un mensaje claro si se pasó.
- Motivo: hoy cualquier cuenta de empresa registrada puede llamar a la IA sin
  límite, y cada llamada cuesta. CLAUDE.md ya pedía registrar los tokens.
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
- Rol `entrevistador`: hoy RLS lo trata igual que a gestión humana.
- `publicarVacante` pasa a "abierta" desde cualquier estado (¿reabrir cerradas?).
- Agregar preguntas con postulaciones recibidas sigue permitido (rompe
  "preguntas iguales para todos").

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
