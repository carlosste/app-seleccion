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
   - **Pasa** / **No pasa**, con historial de decisiones. Al pasar a la entrevista se revela el nombre.
3. En la vacante:
   - **Requisitos**: los propone la IA según el cargo y se pueden editar.
   - **Descripción** pública: se puede redactar con IA y editar.
   - **Etapas y preguntas**: generar preguntas con IA o escribirlas a mano.
4. **Crear una vacante nueva** para ver el flujo completo desde cero: la IA sugiere los requisitos del cargo, se configuran las etapas, se publica y se copia el link para postulantes.

### 4. Entrar como postulante

- **Postularse como alguien nuevo:** abrir el link público de la vacante, <https://app-seleccion-mu.vercel.app/postular/96a13e185f0646abbe4947108ef1cbaa>, llenar los datos, subir una hoja de vida en PDF y responder las preguntas.
- **Entrar como un postulante ya cargado:** en ese mismo link, "¿Ya te postulaste? Ingresa con tu ID", con ID y contraseña iguales al documento: `MEDPRUEBA01` a `MEDPRUEBA12`. Por ejemplo, `MEDPRUEBA01` / `MEDPRUEBA01`.

Conviene usar una ventana de incógnito o la sesión ya separada: la sesión del postulante y la de la empresa no se mezclan, así que se pueden tener las dos abiertas en el mismo navegador.

---

## Paso a paso: qué hace la app

### Lado de la empresa

1. **Registro e ingreso.** La empresa crea su cuenta y entra a su panel. Cada empresa solo ve sus propias vacantes y postulantes.
2. **Crear la vacante.** Se escribe el cargo y la IA propone los requisitos mínimos de ese cargo: formación, experiencia, herramientas y edad mínima. La empresa los ajusta. Los requisitos nunca se muestran al postulante.
3. **Descripción pública.** Es lo único que ve el postulante de la empresa. Se puede redactar con IA y editar.
4. **Etapas.** Se arma el proceso, por ejemplo: preguntas por texto → preguntas por voz → entrevista. Cada etapa tiene sus preguntas, generadas con IA o escritas a mano.
5. **Publicar.** Al publicar se bloquean las preguntas de la primera etapa para que todos respondan lo mismo. Las demás etapas se bloquean cuando alguien llega a ellas.
6. **Compartir el link.** La vacante tiene un link público para enviar a los postulantes.
7. **Revisar postulantes.** La lista es anónima ("Candidato #001"). La IA:
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
- Las etapas son a ciegas. El nombre se revela en la entrevista.

## Limitaciones de esta entrega

- Las preguntas de las etapas "por voz" se responden por texto por ahora. La grabación de audio queda para la siguiente versión.
- Los postulantes de prueba son ficticios.

---

## Cómo funciona por dentro

```text
Navegador (empresa o postulante)
        │
        ▼
Next.js en Vercel ──► Gemini API   (solo desde el servidor)
        │
        ▼
Supabase: Postgres + autenticación + almacenamiento de hojas de vida
```

- **El navegador nunca habla con la IA.** Todas las llamadas a Gemini salen del servidor (acciones de servidor de Next.js), así la clave de la API no queda expuesta.
- **Cada empresa ve solo lo suyo.** Las tablas de Supabase tienen seguridad por filas (RLS): aunque alguien manipule una petición, la base de datos no le devuelve vacantes ni postulantes de otra empresa. Las reglas del proceso también viven en la base, en funciones de Postgres: mover a alguien de etapa, descartar por requisitos, bloquear preguntas y eliminar vacantes solo si no tienen postulantes.
- **Dos sesiones separadas.** La empresa y el postulante usan cookies distintas, así que pueden estar abiertas a la vez en el mismo navegador sin pisarse.
- **Revisión a ciegas.** En el panel cada postulante es un número ("Candidato #007"). El nombre solo aparece cuando la persona llega a la entrevista. La IA tampoco recibe datos personales: se le pide que no copie nombre, documento, correo ni teléfono.
- **Hojas de vida privadas.** Los PDF se guardan en un almacenamiento privado de Supabase. Solo una cuenta de empresa con sesión puede verlos, a través de una ruta del servidor que además deja registro de quién vio o descargó cada uno.

## Cómo está implementada la IA

La IA está en `lib/ia/gemini.ts` y se usa en cinco puntos:

| Dónde | Qué hace la IA | Quién decide |
|---|---|---|
| Crear vacante | Propone de 4 a 6 requisitos mínimos según el cargo | La empresa los edita |
| Descripción | Redacta la descripción pública de la empresa | La empresa la edita |
| Etapas | Genera preguntas para cada etapa | La empresa las edita o escribe las suyas |
| Hoja de vida | Lee el PDF y compara cada requisito con el mínimo pedido | Descarta sola **solo** si claramente no cumple |
| Respuestas | Puntúa cada etapa con la rúbrica y cita la evidencia | Una persona decide si pasa |

Detalles de la implementación:

- **Respuestas en JSON.** Se le pide a Gemini que responda solo en JSON, con una forma fija, y el servidor lo valida antes de guardarlo. Así la app nunca muestra texto suelto inventado por el modelo.
- **Hoja de vida.** El PDF se envía a Gemini junto con los requisitos. Para cada uno, la IA responde "cumple", "no cumple" o "no se sabe", con una frase de evidencia. Si falta un dato, nunca se supone que no cumple: la persona queda "por revisar" y decide gestión humana.
- **Puntaje con la misma vara para todos.** Las respuestas se califican de 0 a 100 por criterio, con una escala escrita en la instrucción (90-100 completa y con ejemplos; 70-89 correcta pero general; 50-69 incompleta; menos de 50 evasiva o sin contenido) y temperatura 0, para que dos respuestas iguales reciban el mismo puntaje. Cada etapa se califica por separado y el total es el promedio de las etapas.
- **Se evalúa a pedido.** La IA no corre sola con cada postulación: se activa con "Evaluar con IA" o "Analizar todos". Si una etapa ya se evaluó y no tiene respuestas nuevas, no se vuelve a llamar a la IA. Esto ahorra consultas.
- **Tolerancia a fallas.** Si un modelo de Gemini está saturado, la app reintenta y pasa a otro modelo (`gemini-3.1-flash-lite` → `gemini-3.5-flash-lite` → `gemini-2.5-flash`). Cada llamada tiene tiempo límite, para dar un mensaje claro en lugar de quedarse colgada.
- **Límites éticos en el código.** Todas las instrucciones llevan una regla fija que prohíbe criterios de edad máxima, género, estado civil, acento, tono de voz o rasgos personales. Además, los requisitos que propone la IA pasan por un filtro que elimina los que mencionen salud, apariencia, religión u otros datos sensibles, y siempre se agrega "Mayor de 18 años".

## Por qué estas herramientas

**Vercel**
- Es la plataforma de los creadores de Next.js, así que la app se despliega sin configuración adicional.
- Cada cambio que se sube a GitHub se publica solo: los PR generan una versión de vista previa y lo que entra a `main` pasa a producción.
- Su plan gratuito alcanza para un proyecto académico, y el profesor puede probar la app con un link, sin instalar nada.

**Supabase**
- Reúne en un solo servicio lo que la app necesita: base de datos Postgres, cuentas de usuario y almacenamiento de archivos para las hojas de vida.
- Al ser Postgres, las reglas de seguridad (RLS) y las del proceso de selección quedan en la base de datos y no dependen solo del código de la página.
- Tiene plan gratuito.

**Gemini API**
- Lee PDF directamente, sin tener que extraer el texto antes.
- Puede responder en JSON estricto, que es lo que necesita la app para guardar puntajes y veredictos.
- Funciona bien en español.
- Su plan gratuito permite hacer todas las pruebas del proyecto. Los modelos "flash-lite" son rápidos, lo que importa al analizar a muchos postulantes seguidos.

**Next.js 16 + TypeScript**
- Página y servidor en un solo proyecto: las llamadas a Supabase con permisos especiales y a Gemini quedan del lado del servidor sin montar una API aparte.
- TypeScript detecta errores de tipos antes de desplegar.

## Correrla en local

Requisitos: Node.js 20 o superior.

1. Copiar `.env.example` como `.env.local` y llenar las claves de Supabase y Gemini.
2. Aplicar las migraciones de `supabase/migrations/` en orden.
3. Instalar y arrancar:

   ```bash
   npm install
   npm run dev
   ```

4. Abrir <http://localhost:3000>.

Para cargar postulantes de prueba en una vacante:

```bash
node --env-file=.env.local scripts/seed-postulantes.mjs <id de la vacante> auxiliar-enfermeria
```
