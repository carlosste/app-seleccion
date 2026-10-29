# Selección de personal con IA

App web para que el área de gestión humana de una empresa filtre postulantes más rápido. La IA revisa la hoja de vida contra los requisitos mínimos, puntúa las respuestas de cada etapa según una rúbrica y resalta fortalezas y puntos a profundizar. **La decisión de quién pasa siempre la toma una persona.**

Proyecto académico, Ingeniería de Sistemas, UCC Cali (2026).

**App en línea: <https://app-seleccion-mu.vercel.app>**

## Integrantes

- Miguel Ángel Labrador
- Carlos Steven Lozano
- Ever Wisney Rodríguez

---

## Cómo probarla (para el profesor)

### 1. Entrar como empresa (MedicGO)

1. Abrir <https://app-seleccion-mu.vercel.app/empresa/ingreso>.
2. Ingresar con la cuenta de prueba:

   | Correo | Contraseña |
   |---|---|
   | `MedicGO@parame.co` | `1234567890_Mn` |

3. En **Vacantes** aparece la vacante **Auxiliar de Enfermería**, ya publicada y con 13 postulantes registrados.

### 2. Qué viene cargado

Los postulantes son ficticios y se pensaron para ver cómo ordena y descarta la app:

- Hojas de vida que cumplen los requisitos mínimos, otras que no los cumplen (la IA las descarta sola) y otras a las que les falta un dato (quedan "por revisar" para que decida una persona).
- Respuestas excelentes, regulares, malas, incompletas y una persona que todavía no responde.
- El **Candidato #001** ya pasó a la segunda etapa y respondió sus preguntas.

Los postulantes aparecen sin evaluar: el análisis con IA se pide con un botón para no gastar consultas a la API sin necesidad.

### 3. Qué probar desde el panel de la empresa

1. **Postulantes** → **Analizar todos**: la IA revisa cada hoja de vida y puntúa las respuestas. Tarda unos segundos por persona. Se puede detener en cualquier momento.
2. Abrir un postulante:
   - Pestañas por etapa con sus respuestas y el análisis de esa etapa: puntaje por criterio, fortalezas y qué profundizar.
   - Puntaje total, que promedia las etapas.
   - **Ver CV** y **Descargar CV**, en cualquier etapa.
   - **Evaluar con IA** para analizar solo a esa persona.
   - **Pasa** / **No pasa**, con historial de decisiones.
3. En la vacante:
   - **Requisitos**: los propone la IA según el cargo y se pueden editar.
   - **Descripción** pública: se puede redactar con IA y editar.
   - **Etapas y preguntas**: generar preguntas con IA o escribirlas a mano.
4. **Crear una vacante nueva** para ver el flujo completo desde cero: la IA sugiere los requisitos del cargo, se configuran las etapas, se publica y se copia el link para postulantes.

### 4. Entrar como postulante

- **Postularse como alguien nuevo:** abrir el link público de la vacante, <https://app-seleccion-mu.vercel.app/postular/96a13e185f0646abbe4947108ef1cbaa>, llenar los datos, subir una hoja de vida en PDF y responder las preguntas.
- **Entrar como un postulante ya cargado:** en ese mismo link, "¿Ya te postulaste? Ingresa con tu ID", con ID y contraseña iguales al documento: `MEDPRUEBA01` a `MEDPRUEBA12`. Por ejemplo, `MEDPRUEBA01` / `MEDPRUEBA01`.

No hace falta cerrar la sesión de la empresa para entrar como postulante: las dos sesiones están separadas (ver "Dos sesiones separadas" más abajo).

---

## Paso a paso: qué hace la app

### Lado de la empresa

1. **Registro e ingreso.** La empresa crea su cuenta y entra a su panel.
2. **Crear la vacante.** Se escribe el cargo y la IA propone los requisitos mínimos de ese cargo: formación, experiencia, herramientas y edad mínima. La empresa los ajusta. Los requisitos nunca se muestran al postulante.
3. **Descripción pública.** Es lo único que ve el postulante de la empresa. Se puede redactar con IA y editar.
4. **Etapas.** Se arma el proceso, por ejemplo: preguntas por texto → preguntas por voz → entrevista. Cada etapa tiene sus preguntas, generadas con IA o escritas a mano.
5. **Publicar.** Al publicar se bloquean las preguntas de la primera etapa para que todos respondan lo mismo. Las demás etapas se bloquean cuando alguien llega a ellas.
6. **Compartir el link.** La vacante tiene un link público para enviar a los postulantes.
7. **Revisar postulantes.** La IA:
   - compara la hoja de vida con los requisitos mínimos y descarta solo cuando la persona claramente no los cumple; si falta un dato, la deja "por revisar";
   - puntúa las respuestas de cada etapa con una escala fija y cita qué la llevó a ese puntaje.
8. **Decidir.** Una persona de gestión humana marca **Pasa** o **No pasa**. Quien pasa avanza a la siguiente etapa; en la última queda seleccionado.
9. **Cerrar o eliminar la vacante.** Se elimina solo si no tiene postulantes; si ya tiene, se cierra.

### Lado del postulante

1. Abre el link de la vacante y ve el cargo y la descripción de la empresa.
2. Llena sus datos, sube su hoja de vida en PDF y acepta el tratamiento de datos (Ley 1581 de 2012).
3. Responde de una vez las preguntas de la primera etapa. La revisión de la hoja de vida pasa por detrás, sin que la vea.
4. Si la empresa lo pasa a la siguiente etapa, vuelve a entrar con su documento y responde las nuevas preguntas.

---

## Reglas del producto

- La IA **sí**: lee la hoja de vida, aplica requisitos mínimos, puntúa con la rúbrica citando evidencia y ordena por ajuste al cargo.
- La IA **no**: elige "al mejor", toma la decisión final, descarta en las etapas de preguntas ni evalúa edad, género, acento, tono de voz o rasgos personales.
- Solo se filtra por edad mínima (mayor de 18). Nunca por edad máxima, género o estado civil.

---

## Cómo funciona por dentro

```text
   Empresa (gestión humana)            Postulante
              │                             │
              └──────────────┬──────────────┘
                             ▼
              App Next.js publicada en Vercel
              (las páginas y la lógica del servidor)
                 │                         │
                 ▼                         ▼
   Supabase                         Gemini API
   · base de datos                  · propone requisitos
   · cuentas de usuario             · genera preguntas
   · PDF de las hojas de vida       · revisa la hoja de vida
                                    · puntúa las respuestas
```

- **El navegador nunca habla con la IA.** Todas las llamadas a Gemini salen del servidor, así la clave de la API no queda expuesta.

### Dos sesiones separadas

| | Sesión de empresa | Sesión de postulante |
|---|---|---|
| Quién | Gestión humana | La persona que se postula |
| Cómo entra | Correo y contraseña en `/empresa/ingreso` | Número de documento como ID y como contraseña, desde el link de la vacante |
| Qué páginas usa | El panel, `/gestion` | Solo las de `/postular` |

Cada sesión se guarda en una cookie distinta. Por eso se pueden tener las dos abiertas en el mismo navegador sin que una cierre o reemplace a la otra, y un postulante nunca termina en el panel de la empresa.

## Cómo está implementada la IA

La IA está en `lib/ia/gemini.ts` y se usa en cinco puntos:

| Dónde | Qué hace la IA | Quién decide |
|---|---|---|
| Crear vacante | Propone de 4 a 6 requisitos mínimos según el cargo | La empresa los edita |
| Descripción | Redacta la descripción pública de la empresa | La empresa la edita |
| Etapas | Genera preguntas para cada etapa | La empresa las edita o escribe las suyas |
| Hoja de vida | Lee el PDF y compara cada requisito con el mínimo pedido | Descarta sola **solo** si claramente no cumple |
| Respuestas | Puntúa cada etapa con la rúbrica y cita la evidencia | Una persona decide si pasa |

### Respuestas en JSON

La IA no responde con un texto libre: responde con datos de forma fija, por ejemplo `{"puntaje": 85, "evidencia": "Pregunta 2 · describe pasos ordenados"}`. Así la app puede guardar y mostrar puntajes y veredictos sin tener que interpretar un párrafo, y el servidor revisa que cada dato sea válido antes de guardarlo.

### Revisión de la hoja de vida

El PDF se envía a Gemini junto con los requisitos mínimos. Para cada requisito, la IA responde "cumple", "no cumple" o "no se sabe", con una frase de evidencia. Si falta un dato, nunca se supone que no cumple: la persona queda "por revisar" y decide gestión humana.

### Escala de puntaje

1. Cada vacante tiene una **rúbrica**: una lista de criterios (por ejemplo, conocimiento técnico o comunicación clara), cada uno con un peso en porcentaje. Se edita en la pestaña Rúbrica.
2. La IA califica cada criterio de **0 a 100**, siempre con las mismas bandas:

   | Puntaje | Qué significa |
   |---|---|
   | 90 a 100 | Respuesta completa, correcta y con ejemplos concretos |
   | 70 a 89 | Correcta, pero general o con algún vacío |
   | 50 a 69 | Incompleta o superficial |
   | Menos de 50 | Incorrecta, evasiva o sin contenido |

3. Si las respuestas no dan evidencia para un criterio, ese criterio no se califica, para que la falta de un dato no reste.
4. El puntaje de la etapa lo calcula la app, no la IA: es el promedio de los criterios según sus pesos.
5. El puntaje total es el promedio de las etapas.
6. Se califica con temperatura 0, que hace que el modelo responda de la forma más estable posible: dos respuestas iguales reciben el mismo puntaje.

### Por qué se evalúa con un botón

La IA no corre sola cada vez que llega una postulación: se activa con "Evaluar con IA" o con "Analizar todos".

- Cada llamada a Gemini gasta cuota de la API.
- No tiene sentido analizar a alguien que todavía no termina de responder.
- Si una etapa ya se evaluó y no tiene respuestas nuevas, no se vuelve a llamar a la IA: se conserva el resultado anterior.

### Si Gemini está saturado

La app intenta primero con `gemini-3.1-flash-lite`. Si Google responde que está saturado o tarda demasiado, reintenta y pasa a `gemini-3.5-flash-lite` y, como último recurso, a `gemini-2.5-flash`. Los tres son modelos de Gemini con la misma clave. Cada llamada tiene tiempo límite, para dar un mensaje claro en lugar de quedarse colgada.

### Límites éticos en el código

Todas las instrucciones llevan una regla fija que prohíbe criterios de edad máxima, género, estado civil, acento, tono de voz o rasgos personales. Además, los requisitos que propone la IA pasan por un filtro que elimina los que mencionen salud, apariencia, religión u otros datos sensibles, y siempre se agrega "Mayor de 18 años".

## Por qué estas herramientas

**Vercel**
- Es la plataforma de los creadores de Next.js, así que la app se despliega sin configuración adicional.
- Cada cambio que se sube a GitHub se publica solo: los PR generan una versión de vista previa y lo que entra a `main` pasa a producción.
- Su plan gratuito alcanza para un proyecto académico, y el profesor puede probar la app con un link, sin instalar nada.

**Supabase**
- Reúne en un solo servicio lo que la app necesita: base de datos Postgres, cuentas de usuario y almacenamiento de archivos para las hojas de vida.
- Al ser Postgres, las reglas quedan en la propia base de datos y no dependen solo del código de la página:
  - **Seguridad por filas (RLS):** cada empresa solo puede leer sus propias vacantes y postulantes. Aunque alguien cambie la dirección o manipule una petición, la base de datos no le devuelve datos de otra empresa.
  - **Reglas del proceso:** mover a alguien de etapa, descartar por requisitos, bloquear preguntas y eliminar vacantes solo si no tienen postulantes.
- Tiene plan gratuito.

**Gemini API**
- Lee PDF directamente, sin tener que extraer el texto antes.
- Puede responder en JSON estricto, que es lo que necesita la app para guardar puntajes y veredictos.
- Funciona bien en español.
- Su plan gratuito permite hacer todas las pruebas del proyecto. Los modelos "flash-lite" son rápidos, lo que importa al analizar a muchos postulantes seguidos.

**Next.js 16 + TypeScript**
- Página y servidor en un solo proyecto: las llamadas a Supabase con permisos especiales y a Gemini quedan del lado del servidor sin montar una API aparte.
- TypeScript detecta errores de tipos antes de desplegar.

## Mejoras a futuro

1. **Grabación de voz real con transcripción.** Hoy las preguntas de las etapas "por voz" se responden por texto.
2. **Ingreso más seguro para el postulante**, con un código por correo o una contraseña propia. Hoy el ID y la contraseña son su número de documento.
3. **Correos al postulante** para confirmar la postulación y avisarle cuando pasa de etapa. Hoy tiene que volver a entrar para saberlo.
4. **Tope de uso de la IA por empresa**, con registro de cuántos tokens gasta cada una.
5. **Borrado automático de hojas de vida y audios** después de un plazo que defina cada empresa. El plan gratis de Supabase tiene 1 GB de almacenamiento.
6. **Pantalla para ver y reabrir vacantes cerradas.**
7. **Rol de entrevistador** con permisos distintos a los de gestión humana.
8. **Otro proveedor de IA de respaldo** por si Gemini falla del todo.

---

## Correrla en local

La app en línea ya funciona sin instalar nada. Esta sección es solo para quien quiera correrla en su computadora.

### Qué se necesita

- **Node.js 20.9 o superior** (recomendado 22 o 24). Se comprueba con `node -v`.
- **Una cuenta de Supabase** (gratis) en <https://supabase.com>.
- **Una cuenta de Google** para sacar la clave de Gemini (gratis) en Google AI Studio.

Las claves **no están en el repositorio**, a propósito: dan acceso a la base de datos y a la cuota de la IA. Cada persona las pone en un archivo `.env.local` que se queda en su computadora y que Git ignora.

### 1. Descargar e instalar

```bash
git clone https://github.com/carlosste/app-seleccion.git
```

```bash
cd app-seleccion
```

```bash
npm install
```

### 2. Crear el archivo `.env.local`

Copiar la plantilla `.env.example` con el nombre `.env.local`. En PowerShell:

```powershell
Copy-Item .env.example .env.local
```

En macOS o Linux:

```bash
cp .env.example .env.local
```

Luego abrir `.env.local` y llenar estas variables:

| Variable | Qué es | De dónde sale |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dirección del proyecto de Supabase | Tiene la forma `https://<id-del-proyecto>.supabase.co`. El id está en Supabase → **Project Settings → General → Project ID** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase | Supabase → **Project Settings → API Keys**: la clave `anon` (o la nueva `publishable`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de administrador de Supabase. La usa solo el servidor para crear cuentas y leer las hojas de vida. **Nunca se comparte ni se sube a GitHub** | Supabase → **Project Settings → API Keys**: la clave `service_role` (o la nueva `secret`) |
| `GEMINI_API_KEY` | Clave de la API de Gemini | Ver el paso 3 |
| `PERMITIR_CORREOS_PERSONALES` | Si vale `true`, una empresa se puede registrar con Gmail, Hotmail u Outlook. Vacía, exige correo corporativo | Se escribe a mano. Para probar, dejar `true` |

Así debe quedar, con los valores de cada uno:

```text
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
PERMITIR_CORREOS_PERSONALES=true
GEMINI_API_KEY=AIzaSy...
```

Sin espacios alrededor del `=` y sin comillas.

### 3. Sacar la clave de Gemini

1. Entrar a <https://aistudio.google.com> con una cuenta de Google.
2. Ir a **Get API key** → **Create API key**. Si pide un proyecto de Google Cloud, crear uno nuevo desde ahí mismo.
3. Copiar la clave (empieza por `AIza`) y pegarla en `GEMINI_API_KEY`.

El plan gratuito alcanza para probar la app. La clave no está atada a un modelo: la app elige el modelo de Gemini en cada llamada.

Sin esta clave la app abre y funciona, pero los botones de IA (sugerir requisitos, generar preguntas, redactar la descripción, evaluar) fallan, y en la terminal donde corre `npm run dev` aparece "Falta GEMINI_API_KEY en el servidor".

### 4. Preparar la base de datos

Hay dos caminos:

- **Usar el proyecto de Supabase del equipo.** Uno de los integrantes comparte por privado la URL y las dos claves de Supabase. No hay que aplicar nada, y se ven los mismos datos que en la app en línea, así que lo que se cambie en local también cambia allá.
- **Crear un proyecto propio en Supabase** (recomendado para no tocar los datos del equipo):
  1. En <https://supabase.com>, **New project**. Guardar la contraseña de la base de datos que pide.
  2. Abrir **SQL Editor** y ejecutar, uno por uno y **en orden**, los 13 archivos de `supabase/migrations/`, del `20261026120000_esquema_inicial.sql` al `20261028190000_bloqueo_preguntas.sql`. Cada archivo se copia completo, se pega y se ejecuta con **Run**. Las migraciones crean las tablas, las reglas de seguridad y el almacenamiento `cvs` para los PDF.
  3. Copiar la URL y las claves de ese proyecto en `.env.local`, como dice el paso 2.

  Quien tenga la [CLI de Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started) puede aplicar todas las migraciones de una vez con `supabase link` y `supabase db push`.

En Supabase no hay que cambiar ningún ajuste de autenticación: la app crea las cuentas ya confirmadas.

### 5. Arrancar

```bash
npm run dev
```

Abrir <http://localhost:3000>. Si se cambia algo en `.env.local`, hay que detener el servidor (Ctrl + C) y volver a arrancarlo.

Para probar la versión de producción:

```bash
npm run build
```

```bash
npm run start
```

### 6. Datos para probar (proyecto propio)

Un proyecto nuevo empieza vacío:

1. Registrar una empresa en <http://localhost:3000/empresa/registro>.
2. Crear una vacante, configurar sus etapas y preguntas, y publicarla.
3. Opcional: cargar postulantes ficticios. El id de la vacante es el texto largo que aparece en la dirección del panel: `/gestion/<id de la vacante>`.

   ```bash
   node --env-file=.env.local scripts/seed-postulantes.mjs <id de la vacante> auxiliar-enfermeria
   ```

   Conjuntos disponibles: `auxiliar-enfermeria` (12 personas), `analista-datos` (10) y `analista-datos-masivo` (100). Las respuestas se escribieron para las preguntas de esas vacantes, así que en otra vacante pueden no coincidir. Cada postulante entra con su documento como ID y contraseña, por ejemplo `MEDPRUEBA01`.

### Problemas comunes

Los mensajes aparecen en la terminal donde corre `npm run dev`.

| Mensaje | Qué pasa |
|---|---|
| `Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local` | El archivo no se llama exactamente `.env.local`, no está en la carpeta raíz del proyecto o le falta alguna de esas dos líneas |
| `Falta GEMINI_API_KEY en el servidor` | Falta la clave de Gemini, o se agregó sin reiniciar `npm run dev` |
| `Gemini (...) respondió 400` o `403` | La clave de Gemini está mal copiada o fue borrada en AI Studio |
| Error de tabla o función que no existe | Falta aplicar alguna migración, o se aplicaron fuera de orden |
