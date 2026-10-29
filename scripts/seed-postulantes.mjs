// Postulantes FICTICIOS para probar la app a mayor escala (2026-10-28, pedido de Carlos).
// Carga un conjunto de personas inventadas en una vacante: cuenta, CV en PDF, postulación,
// consentimientos y respuestas de la primera etapa de texto. Quedan SIN evaluar: la IA se
// pide desde el panel con "Evaluar con IA" o "Analizar todos".
//
// Cada conjunto (scripts/postulantes-prueba/<conjunto>.mjs) mezcla a propósito, para ver cómo
// ordena y descarta la app: CV que cumplen los mínimos, que no los cumplen y que no mencionan
// un dato (deben quedar "por revisar"), y respuestas excelentes, regulares, malas, horribles,
// incompletas y sin responder. Las respuestas siguen el orden de las preguntas de texto de la
// vacante para la que se escribió el conjunto.
//
// Uso: node --env-file=.env.local scripts/seed-postulantes.mjs <id de la vacante> <conjunto>
//   conjuntos: auxiliar-enfermeria (MedicGO), analista-datos (softsol)
// Se puede correr dos veces: si la persona o su postulación ya existen, no se duplican.
// Ingreso de cada postulante (modo pruebas): ID = contraseña = su campo "documento".
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vacanteId = process.argv[2];
const conjunto = process.argv[3] ?? "";
const CONJUNTOS = ["auxiliar-enfermeria", "analista-datos"];

if (!url || !claveServicio) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}
if (!/^[0-9a-f-]{36}$/i.test(vacanteId ?? "") || !CONJUNTOS.includes(conjunto)) {
  console.error(`Uso: node --env-file=.env.local scripts/seed-postulantes.mjs <id de la vacante> <${CONJUNTOS.join(" | ")}>`);
  process.exit(1);
}

const db = createClient(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });

// Personas del conjunto elegido. documento = ID y contraseña del postulante en modo pruebas.
const { PERSONAS } = await import(`./postulantes-prueba/${conjunto}.mjs`);

// Corta las líneas largas para que el PDF no se salga de la página.
function partir(linea, maximo = 92) {
  const palabras = linea.split(" ");
  const lineas = [];
  let actual = "";
  for (const p of palabras) {
    if ((actual + " " + p).trim().length > maximo) {
      lineas.push(actual.trim());
      actual = `   ${p}`;
    } else actual += ` ${p}`;
  }
  if (actual.trim()) lineas.push(actual.trimEnd().replace(/^ /, ""));
  return lineas;
}

// PDF de una página, sin librerías. WinAnsiEncoding + latin1 para que salgan las tildes.
function crearPdf(lineas) {
  const escapar = (t) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const contenido =
    "BT /F1 11 Tf 50 780 Td 16 TL\n" + lineas.flatMap((l) => partir(l)).map((l) => `(${escapar(l)}) Tj T*`).join("\n") + "\nET";
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(contenido, "latin1")} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  const posiciones = [];
  objetos.forEach((o, i) => {
    posiciones.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posiciones.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

function salir(error, paso) {
  if (error) {
    console.error(`Error en ${paso}: ${error.message}`);
    process.exit(1);
  }
}

const { data: vacante, error: errorVacante } = await db.from("vacantes").select("id, cargo, estado").eq("id", vacanteId).maybeSingle();
salir(errorVacante, "buscar vacante");
if (!vacante) salir(new Error("no existe"), "buscar vacante");

const { data: etapas } = await db.from("vacante_etapas").select("id, tipo, orden").eq("vacante_id", vacante.id).order("orden");
const primera = etapas?.[0];
const etapaTexto = etapas?.find((e) => e.tipo === "texto");
const { data: preguntas } = etapaTexto
  ? await db.from("preguntas").select("id, orden").eq("etapa_id", etapaTexto.id).order("orden")
  : { data: [] };
console.log(`Vacante: ${vacante.cargo} (${vacante.estado}) · ${preguntas.length} preguntas de texto`);

const { data: listado, error: errorListado } = await db.auth.admin.listUsers({ perPage: 1000 });
salir(errorListado, "listar usuarios");

for (const [i, p] of PERSONAS.entries()) {
  const correo = `${p.documento.toLowerCase()}@example.com`;
  const telefono = `30000000${String(i + 1).padStart(2, "0")}`;

  // 1. Cuenta (confirmada, sin correo) y fila de postulante.
  let usuario = listado.users.find((u) => u.email === correo);
  if (!usuario) {
    const { data, error } = await db.auth.admin.createUser({
      email: correo,
      password: p.documento,
      email_confirm: true,
      user_metadata: { nombre: p.nombre, telefono },
    });
    salir(error, `crear cuenta de ${p.nombre}`);
    usuario = data.user;
  }
  const { error: errorPostulante } = await db.from("postulantes").upsert({
    id: usuario.id,
    correo,
    nombre: p.nombre,
    telefono,
    pais_documento: "CO",
    numero_documento: p.documento,
  });
  salir(errorPostulante, `guardar postulante ${p.nombre}`);

  // El CV se vuelve a subir siempre (upsert), así un cambio en los perfiles llega también
  // a las postulaciones que ya existían. Lleva fecha de nacimiento (adultos) para la edad
  // mínima y datos de contacto, que la IA no debe copiar a la hoja de vida.
  const ruta = `${usuario.id}/${vacante.id}.pdf`;
  const nacimiento = `Fecha de nacimiento: ${String(3 + i).padStart(2, "0")}/${String((i % 12) + 1).padStart(2, "0")}/${1988 + i}`;
  const cv = crearPdf([`HOJA DE VIDA - ${p.nombre}`, `Correo: ${correo}  Teléfono: ${telefono}`, nacimiento, "", ...p.cv]);
  const { error: errorCv } = await db.storage.from("cvs").upload(ruta, cv, { contentType: "application/pdf", upsert: true });
  salir(errorCv, `subir CV de ${p.nombre}`);

  // 2. Postulación (si ya existe, no se toca).
  const { data: existente } = await db
    .from("postulaciones")
    .select("id")
    .eq("postulante_id", usuario.id)
    .eq("vacante_id", vacante.id)
    .maybeSingle();
  if (existente) {
    console.log(`= ${p.nombre}: ya estaba postulado (CV actualizado)`);
    continue;
  }

  const { data: postulacion, error: errorPostulacion } = await db
    .from("postulaciones")
    .insert({ postulante_id: usuario.id, vacante_id: vacante.id, cv_path: ruta, etapa_actual_id: primera?.id ?? null })
    .select("id, numero_anonimo")
    .single();
  salir(errorPostulacion, `crear postulación de ${p.nombre}`);

  const { error: errorConsentimientos } = await db.from("consentimientos").insert(
    ["datos", "grabacion"].map((tipo) => ({ postulacion_id: postulacion.id, tipo, version_texto: "v1" })),
  );
  salir(errorConsentimientos, `consentimientos de ${p.nombre}`);

  // 3. Respuestas de la etapa de texto, con horas escalonadas en los últimos dos días.
  const filas = p.respuestas.slice(0, preguntas.length).map((texto, j) => ({
    postulacion_id: postulacion.id,
    pregunta_id: preguntas[j].id,
    modalidad: "texto",
    texto,
    respondida_at: new Date(Date.now() - (48 - i * 3) * 3_600_000 + j * 180_000).toISOString(),
  }));
  if (filas.length) salir((await db.from("respuestas").insert(filas)).error, `respuestas de ${p.nombre}`);

  console.log(`+ Candidato #${String(postulacion.numero_anonimo).padStart(3, "0")} ${p.nombre}: ${filas.length} respuestas`);
}

console.log("Listo. Quedan sin evaluar: usa \"Evaluar con IA\" en el detalle de cada uno.");
