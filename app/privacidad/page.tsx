import type { Metadata } from "next";
import {
  CONSERVACION,
  IA_PLAN_PAGO,
  MODO_PRUEBAS,
  OPERADOR,
  PLAN_PAGO,
  VERSION_TEXTO,
  VIGENTE_DESDE,
} from "@/lib/legal/tratamiento-datos";

export const metadata: Metadata = { title: "Política de tratamiento de datos · Selección de personal" };

// Política de tratamiento de datos personales (Ley 1581 de 2012, Decreto 1377 de 2013). Es la
// que enlaza el formulario de postulación. El texto vive en lib/legal/tratamiento-datos.ts.
const porDefinir = (valor: string | null) => valor ?? "por definir";

export default function Privacidad() {
  const operadorCompleto = Object.values(OPERADOR).every(Boolean);
  return (
    <main className="celular">
      <div className="contenido legal" style={{ gap: 18, fontSize: 14, lineHeight: 1.6 }}>
        <div className="campo" style={{ gap: 6 }}>
          <span className="etq">Postulantes</span>
          <h1 className="titulo-vacante">Política de tratamiento de datos personales</h1>
          <span className="texto-gris" style={{ fontSize: 13 }}>
            Vigente desde el {VIGENTE_DESDE} · versión {VERSION_TEXTO}
          </span>
        </div>

        <div className={IA_PLAN_PAGO ? "nota nota-az" : "nota nota-na"} role="note">
          {IA_PLAN_PAGO ? PLAN_PAGO : MODO_PRUEBAS}
        </div>

        <section>
          <h2>1. Quién trata tus datos</h2>
          <p>
            <b>Responsable del tratamiento:</b> la empresa que publica la vacante a la que te postulas. Su nombre aparece en
            el encabezado de la oferta. Ella decide sobre tu postulación y para qué se usan tus datos dentro de su proceso de
            selección.
          </p>
          <p>
            <b>Encargado del tratamiento:</b> el operador de esta plataforma, que guarda y procesa los datos por cuenta de la
            empresa y atiende tus solicitudes.
          </p>
          <ul>
            <li>Nombre: {porDefinir(OPERADOR.nombre)}</li>
            <li>Identificación: {porDefinir(OPERADOR.identificacion)}</li>
            <li>Domicilio: {porDefinir(OPERADOR.domicilio)}</li>
            <li>Correo para consultas y reclamos: {porDefinir(OPERADOR.correo)}</li>
            <li>Teléfono: {porDefinir(OPERADOR.telefono)}</li>
          </ul>
          {!operadorCompleto && (
            <p className="texto-gris" style={{ fontSize: 13 }}>
              Los datos del operador se publicarán antes de recibir postulaciones reales.
            </p>
          )}
        </section>

        <section>
          <h2>2. Qué datos se recogen</h2>
          <ul>
            <li>Los que escribes: nombre, número de documento, correo y teléfono.</li>
            <li>Tu hoja de vida en PDF.</li>
            <li>Tus respuestas a las preguntas, por escrito o por voz, y su transcripción.</li>
            <li>Si cumples la edad mínima del cargo (sí o no). No se guarda tu fecha de nacimiento.</li>
            <li>
              Los resultados del análisis con IA (requisitos cumplidos, puntajes con la rúbrica y la evidencia que los
              sustenta) y las decisiones de la empresa.
            </li>
            <li>Datos técnicos: la dirección de red (IP), solo para limitar intentos repetidos de ingreso o de postulación.</li>
          </ul>
          <p>
            <b>Datos sensibles.</b> La plataforma no pide datos sensibles (origen étnico, salud, religión, orientación
            política o sexual, datos biométricos, entre otros) y no estás obligado a darlos. Te recomendamos no incluirlos
            en tu hoja de vida ni en tus respuestas. Si aparecen, la IA tiene la instrucción de no usarlos.
          </p>
          <p>
            Esta plataforma es para personas mayores de edad. No se tratan datos de niños, niñas ni adolescentes.
          </p>
        </section>

        <section>
          <h2>3. Para qué se usan</h2>
          <ul>
            <li>Gestionar tu postulación a la vacante y permitirte volver a entrar para responder las preguntas.</li>
            <li>Revisar si tu hoja de vida cumple los requisitos mínimos que fijó la empresa.</li>
            <li>Puntuar tus respuestas con la rúbrica del cargo, igual para todos los postulantes.</li>
            <li>Que la empresa tome sus decisiones y te contacte sobre el proceso.</li>
            <li>Llevar registro de quién consulta tu hoja de vida, por seguridad.</li>
          </ul>
          <p>Tus datos no se venden ni se usan para publicidad ni para otros procesos sin una nueva autorización tuya.</p>
        </section>

        <section>
          <h2>4. Uso de inteligencia artificial</h2>
          <p>
            Un modelo de inteligencia artificial de un proveedor externo (Google, servicio Gemini) lee tu hoja de vida y
            tus respuestas para resumir tu formación y experiencia sin datos personales, compararlas con los requisitos
            mínimos y puntuarlas con la rúbrica, citando la evidencia.
          </p>
          <ul>
            <li>
              La IA no decide quién pasa: la decisión de cada etapa la toma una persona de la empresa. La IA tampoco evalúa
              tu edad, género, origen, acento, tono de voz ni otros rasgos personales.
            </li>
            <li>
              Única excepción: si tu hoja de vida no cumple un requisito mínimo escrito por la empresa, la postulación
              puede quedar descartada de forma automática. Si la IA no encuentra un dato, no te descarta: queda para que
              lo revise una persona. Puedes pedir que una persona revise cualquier resultado por el canal de la sección 7.
            </li>
            <li>
              En las primeras etapas la revisión es a ciegas: la empresa te ve como un número de candidato y conoce tu
              nombre solo al llegar a la entrevista.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Envío de datos fuera de Colombia</h2>
          <p>
            Para funcionar, la plataforma usa proveedores con servidores fuera de Colombia: Supabase (base de datos y
            archivos, en Estados Unidos), Vercel (servidores de la aplicación) y Google (análisis con IA). Ellos procesan
            los datos solo para prestar su servicio. Al aceptar, autorizas esta transmisión internacional.
          </p>
        </section>

        <section>
          <h2>6. Tus derechos</h2>
          <p>Como titular de los datos (artículo 8 de la Ley 1581 de 2012) puedes:</p>
          <ul>
            <li>Conocer, actualizar y rectificar tus datos.</li>
            <li>Pedir prueba de la autorización que diste.</li>
            <li>Saber qué uso se les ha dado.</li>
            <li>
              Revocar la autorización o pedir que se borren tus datos, cuando no exista un deber legal o contractual de
              conservarlos.
            </li>
            <li>Consultarlos gratis.</li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber hecho tu consulta o
              reclamo por el canal de la sección 7.
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Cómo ejercerlos</h2>
          <p>
            Escribe al correo para consultas y reclamos de la sección 1 con tu nombre, tu número de documento, la vacante y
            lo que pides. Si actúa otra persona por ti, adjunta el documento que lo acredite.
          </p>
          <ul>
            <li>
              <b>Consultas</b> (saber qué datos hay y cómo se usan): respuesta en máximo 10 días hábiles, ampliable 5 días
              hábiles más avisándote el motivo.
            </li>
            <li>
              <b>Reclamos</b> (corregir, actualizar, borrar o revocar): respuesta en máximo 15 días hábiles, ampliable 8 días
              hábiles más avisándote el motivo. Si falta información, se te pide dentro de los 5 días siguientes; si no la
              envías en 2 meses, se entiende que desististe.
            </li>
          </ul>
        </section>

        <section>
          <h2>8. Cuánto tiempo se guardan</h2>
          <p>{CONSERVACION}</p>
        </section>

        <section>
          <h2>9. Seguridad</h2>
          <p>
            Las hojas de vida y respuestas se guardan en almacenamiento privado. Cada empresa solo accede a las
            postulaciones de sus vacantes, y cada consulta o descarga de una hoja de vida queda registrada.
          </p>
        </section>

        <section>
          <h2>10. Cambios a esta política</h2>
          <p>
            Si la política cambia de forma sustancial, se publicará aquí con una nueva versión y fecha, y se pedirá una nueva
            autorización cuando la ley lo exija.
          </p>
        </section>
      </div>
    </main>
  );
}
