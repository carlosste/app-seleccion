// Postulantes FICTICIOS para probar la app a mayor escala (2026-10-28, pedido de Carlos).
// 12 personas inventadas para "Auxiliar de Enfermería" (empresa de ejemplo MedicGO): cuenta,
// CV en PDF, postulación, consentimientos y respuestas de la primera etapa de texto. Quedan
// SIN evaluar: la IA se pide desde el panel con "Evaluar con IA".
//
// Mezcla a propósito, para ver cómo ordena y descarta la app:
// - CV: unos cumplen todos los mínimos (título de auxiliar, ReTHUS activo, 6 meses en
//   atención hospitalaria, soporte vital básico vigente, mayor de 18), otros no cumplen
//   alguno, y otros no mencionan un dato (deben quedar "por revisar", no descartados).
// - Respuestas: excelentes, buenas, regulares, malas, horribles, incompletas y una sin
//   responder. Hay quien cumple el CV y responde muy mal, y al revés.
// Las respuestas siguen el orden de las 5 preguntas de texto de esa vacante: bioseguridad,
// priorizar pacientes, explicar un procedimiento, emergencia, y medicamentos/signos vitales.
//
// Uso: node --env-file=.env.local scripts/seed-postulantes.mjs <id de la vacante>
// Se puede correr dos veces: si la persona o su postulación ya existen, no se duplican.
// Ingreso de cada postulante (modo pruebas): ID = contraseña = su campo "documento".
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vacanteId = process.argv[2];

if (!url || !claveServicio) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}
if (!/^[0-9a-f-]{36}$/i.test(vacanteId ?? "")) {
  console.error("Uso: node --env-file=.env.local scripts/seed-postulantes.mjs <id de la vacante>");
  process.exit(1);
}

const db = createClient(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } });

// documento = ID y contraseña del postulante en modo pruebas.
const PERSONAS = [
  {
    // Cumple todo · respuestas excelentes
    nombre: "Laura Gómez (prueba)",
    documento: "MEDPRUEBA01",
    cv: [
      "PERFIL: Auxiliar de enfermería con 4 años en hospitalización de adultos, enfocada en seguridad del paciente.",
      "FORMACIÓN: Técnico Auxiliar de Enfermería, SENA (2019). Registro ReTHUS activo.",
      "EXPERIENCIA: Auxiliar de enfermería, hospitalización adultos, Clínica Los Andes (2020-2024): 4 años.",
      "CURSOS: Soporte Vital Básico (BLS) vigente hasta 2026. Curso de administración segura de medicamentos (2023).",
      "HABILIDADES: Canalización venosa, manejo de bombas de infusión, curaciones, historia clínica electrónica.",
    ],
    respuestas: [
      "Aplico los cinco momentos del lavado de manos de la OMS, uso los elementos de protección según el riesgo (guantes, tapabocas, bata y gafas cuando hay riesgo de salpicadura), trabajo con técnica aséptica en curaciones y canalizaciones, descarto los cortopunzantes en el guardián sin reenfundar y separo los residuos por color. Antes de empezar también limpio la superficie de trabajo y reviso la fecha de vencimiento de los insumos.",
      "En un turno de noche tenía seis pacientes y al mismo tiempo uno empezó con dolor torácico, otro necesitaba un antibiótico a horario y otro pidió ayuda para ir al baño. Tomé signos al del dolor y avisé de inmediato a la jefe, dejé el antibiótico listo para aplicarlo apenas el paciente estuvo estable y le pedí a una compañera que acompañara al tercero. Prioricé por riesgo vital y después por horario, y al final registré todo.",
      "Me presento, le explico con palabras sencillas qué voy a hacer, para qué sirve y qué va a sentir, por ejemplo un pinchazo. Le pregunto si tiene dudas y le pido que me repita con sus palabras lo que entendió. Si es un familiar, hago lo mismo y le dejo claro a quién preguntar después. Nunca empiezo sin su consentimiento.",
      "Evalúo si el paciente responde y respira, pido ayuda y activo el código según el protocolo de la institución, traigo el carro de paro y el desfibrilador, e inicio compresiones si no hay pulso mientras llega el equipo. Después asisto al médico, preparo los medicamentos que ordene y registro la hora de cada intervención.",
      "Verifico los correctos antes de cada medicamento: paciente, medicamento, dosis, vía, hora, registro y fecha de vencimiento; además pregunto por alergias. Si algo no me cuadra, consulto antes de aplicarlo. Los signos vitales los tomo con equipos calibrados, los registro en el momento en la historia clínica y, si un valor sale alterado, lo repito y aviso de inmediato.",
    ],
  },
  {
    // Cumple todo con un nivel superior (profesional) · respuestas excelentes
    nombre: "Camila Torres (prueba)",
    documento: "MEDPRUEBA02",
    cv: [
      "PERFIL: Enfermera profesional con experiencia en cuidado crítico y liderazgo de auxiliares.",
      "FORMACIÓN: Profesional en Enfermería, Universidad del Valle (2021). Registro ReTHUS activo.",
      "EXPERIENCIA: Enfermera de Unidad de Cuidado Intensivo, Hospital Universitario (2022-2025): 3 años.",
      "CURSOS: BLS y ACLS vigentes (2025). Diplomado en seguridad del paciente.",
      "HABILIDADES: Monitoreo hemodinámico, ventilación mecánica, educación a familias, inglés B1.",
    ],
    respuestas: [
      "Higiene de manos en los cinco momentos, precauciones estándar con todos los pacientes y precauciones por contacto, gotas o aire según el aislamiento indicado. Uso los elementos de protección de acuerdo con el procedimiento, mantengo la técnica estéril en procedimientos invasivos, manejo correcto de cortopunzantes y limpieza y desinfección de equipos entre pacientes.",
      "En UCI tuve un ingreso nuevo mientras otro paciente desaturaba. Clasifiqué: primero el que desaturaba, porque era riesgo vital inmediato; pedí apoyo para recibir el ingreso con la lista de chequeo, y reprogramé con la auxiliar las tareas que podían esperar, como el baño. Cada cierto tiempo revisaba el plan y lo informaba al médico de turno.",
      "Uso un lenguaje claro, sin términos técnicos, y apoyo la explicación con un dibujo o mostrando el equipo. Le explico el motivo, los pasos y los cuidados de después. Uso la técnica de 'enseñar y devolver': le pido que me explique lo que entendió y corrijo lo que haga falta. Dejo registro de la educación en la historia.",
      "Valoro la escena y la seguridad, verifico respuesta, vía aérea, respiración y circulación, activo el código y asigno roles: quién comprime, quién maneja la vía aérea y quién registra. Sigo los algoritmos de soporte vital y, al terminar, hago una breve revisión del evento con el equipo.",
      "Aplico los correctos de la administración de medicamentos y la doble verificación en medicamentos de alto riesgo, como insulina o heparina. Reviso la orden médica, las alergias y la compatibilidad. Registro los signos inmediatamente con la hora exacta y comparo con las tomas anteriores para detectar tendencias.",
    ],
  },
  {
    // Cumple todo · respuestas buenas
    nombre: "Andrés Ríos (prueba)",
    documento: "MEDPRUEBA03",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería, Instituto Técnico en Salud de Cali (2022). Registro ReTHUS activo.",
      "EXPERIENCIA: Auxiliar de enfermería en urgencias, Hospital del Sur (2023-2024): 1 año y 2 meses.",
      "CURSOS: Soporte Vital Básico vigente (2024).",
      "HABILIDADES: Triage de apoyo, toma de muestras, signos vitales, trabajo en equipo.",
    ],
    respuestas: [
      "Lavado de manos antes y después de cada paciente, uso de guantes, tapabocas y bata cuando toca, y desecho de agujas en el guardián. También separo la basura en las canecas de colores.",
      "En urgencias llegaron dos pacientes al tiempo. Atendí primero al que tenía los signos más alterados y al otro le tomé signos rápido para dejarlo vigilado. Después le comenté a la jefe para que me ayudara a reorganizar.",
      "Le explico paso a paso lo que le voy a hacer y le pregunto si entendió. Si veo que está nervioso, le hablo con calma.",
      "Aviso al médico y a la jefe, llevo el carro de paro y ayudo en lo que me indiquen. Si no tiene pulso, empiezo reanimación porque tengo el curso de soporte vital.",
      "Reviso la orden médica y confirmo el nombre del paciente con la manilla antes de dar el medicamento. Los signos los anoto apenas los tomo.",
    ],
  },
  {
    // Cumple todo, mucha experiencia · respuestas buenas pero incompletas (3 de 5)
    nombre: "Daniela Rojas (prueba)",
    documento: "MEDPRUEBA04",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería (2016). Registro ReTHUS activo.",
      "EXPERIENCIA: Auxiliar de enfermería en hospitalización pediátrica, Clínica Infantil (2017-2024): 7 años.",
      "CURSOS: Soporte Vital Básico vigente (2025). Atención integral a enfermedades prevalentes de la infancia (AIEPI).",
      "HABILIDADES: Manejo de pacientes pediátricos, lactancia, canalización en niños.",
    ],
    respuestas: [
      "Lavado de manos en los cinco momentos, elementos de protección según el procedimiento y técnica aséptica. En pediatría además limpio los juguetes y las cunas entre pacientes.",
      "En pediatría es común tener varios niños llorando a la vez. Primero miro cuál tiene fiebre alta o dificultad para respirar, y le pido a la mamá de los otros que me ayude a calmarlos mientras tanto.",
      "A los niños les explico con juegos y a los papás con palabras sencillas, y les pregunto si quedó claro.",
    ],
  },
  {
    // No menciona ReTHUS → debe quedar "por revisar" · respuestas regulares
    nombre: "Valentina Castro (prueba)",
    documento: "MEDPRUEBA05",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería (2022).",
      "EXPERIENCIA: Auxiliar de enfermería, hospitalización de medicina interna, Clínica Central (2023-2024): 1 año.",
      "CURSOS: Soporte Vital Básico vigente (2024).",
    ],
    respuestas: [
      "Me lavo las manos y uso guantes y tapabocas.",
      "Una vez tenía varios pacientes y fui atendiendo según los iba viendo, primero al que me llamó primero.",
      "Le digo lo que le voy a hacer.",
      "Llamo al médico rápido y ayudo.",
      "Miro la orden y aplico el medicamento. Los signos los anoto en la hoja al terminar la ronda.",
    ],
  },
  {
    // No menciona el curso de soporte vital → "por revisar" · regulares, una fuera de tema
    nombre: "Paula Moreno (prueba)",
    documento: "MEDPRUEBA06",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería (2021). Registro ReTHUS activo.",
      "EXPERIENCIA: Auxiliar de enfermería en hospitalización quirúrgica, Hospital San José (2022-2024): 2 años.",
      "HABILIDADES: Preparación de pacientes para cirugía, curaciones de heridas quirúrgicas.",
    ],
    respuestas: [
      "Uso guantes y tapabocas, me lavo las manos y boto las agujas en el guardián.",
      "Me gusta mucho trabajar con personas y en mis tiempos libres hago deporte, eso me ayuda a manejar el estrés.",
      "Le explico de forma sencilla y le pregunto si tiene dudas.",
      "Aviso a la jefe de enfermería y sigo sus indicaciones.",
      "Verifico el nombre del paciente y la dosis antes de aplicar. Registro los signos en el sistema.",
    ],
  },
  {
    // No cumple: no tiene título de auxiliar (bachiller, cuidador) · respuestas regulares
    nombre: "Julián Mejía (prueba)",
    documento: "MEDPRUEBA07",
    cv: [
      "FORMACIÓN: Bachiller académico (2019).",
      "CURSOS: Primeros auxilios, Cruz Roja (2022).",
      "EXPERIENCIA: Cuidador de adulto mayor en casa de familia (2023-2024): 1 año.",
      "HABILIDADES: Acompañamiento, administración de medicamentos orales, paciencia.",
    ],
    respuestas: [
      "Lavarse las manos, usar guantes y mantener limpio el lugar.",
      "Cuando cuidaba al señor y a la vez llegaba la visita, primero le daba sus medicamentos a tiempo y después atendía lo demás.",
      "Le hablo con calma y le explico con palabras fáciles.",
      "Llamo a la línea de emergencias y mientras llegan le hago primeros auxilios como me enseñaron.",
      "Tengo una lista con las horas de los medicamentos y la voy marcando.",
    ],
  },
  {
    // No cumple: es de regencia de farmacia, no auxiliar de enfermería · respuestas malas
    nombre: "Miguel Herrera (prueba)",
    documento: "MEDPRUEBA08",
    cv: [
      "FORMACIÓN: Tecnólogo en Regencia de Farmacia (2020).",
      "EXPERIENCIA: Auxiliar de droguería, dispensación de medicamentos (2021-2023): 2 años.",
      "CURSOS: Soporte Vital Básico (2024).",
    ],
    respuestas: [
      "Guantes.",
      "Atiendo al que llegue primero, por orden de llegada.",
      "Le digo que no se preocupe, que eso es rápido.",
      "Busco a alguien que sepa.",
      "Le doy el medicamento como dice la caja.",
    ],
  },
  {
    // No cumple: título EN CURSO, sin experiencia · respuestas horribles
    nombre: "Sebastián Ortiz (prueba)",
    documento: "MEDPRUEBA09",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería EN CURSO (tercer semestre de cuatro).",
      "EXPERIENCIA: Sin experiencia laboral. Prácticas académicas en curso.",
    ],
    respuestas: ["no se", "pues normal, como se pueda", "le digo y ya", "que alguien llame a una ambulancia", "eso lo hace la jefe"],
  },
  {
    // No cumple: 4 meses en consulta externa (no hospitalaria) y curso de soporte vital vencido · malas
    nombre: "Kevin Salazar (prueba)",
    documento: "MEDPRUEBA10",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería (2023). Registro ReTHUS activo.",
      "EXPERIENCIA: Auxiliar en consulta externa, IPS Barrio Norte (2024): 4 meses.",
      "CURSOS: Soporte Vital Básico, realizado en 2020 (vencido).",
    ],
    respuestas: [
      "Me lavo las manos cuando están sucias.",
      "Hago lo que me vayan pidiendo.",
      "Le explico rápido porque hay mucha gente esperando.",
      "Me pongo nervioso pero llamo a alguien.",
      "Leo la orden. Los signos los anoto al final del turno para no perder tiempo.",
    ],
  },
  {
    // Cumple TODO el CV, pero respuestas horribles (para ver que CV y respuestas pesan distinto)
    nombre: "Natalia Vargas (prueba)",
    documento: "MEDPRUEBA11",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería (2020). Registro ReTHUS activo.",
      "EXPERIENCIA: Auxiliar de enfermería en hospitalización general, Clínica Occidente (2021-2024): 3 años.",
      "CURSOS: Soporte Vital Básico vigente (2025).",
    ],
    respuestas: ["ps lo normal", "uno ve", "le explico", "corro", "bien"],
  },
  {
    // Cumple todo · se postuló y todavía no responde
    nombre: "Esteban Lara (prueba)",
    documento: "MEDPRUEBA12",
    cv: [
      "FORMACIÓN: Técnico Auxiliar de Enfermería (2021). Registro ReTHUS activo.",
      "EXPERIENCIA: Auxiliar de enfermería en hospitalización de ginecobstetricia, Hospital Mario Correa (2022-2024): 2 años.",
      "CURSOS: Soporte Vital Básico vigente (2025).",
    ],
    respuestas: [],
  },
];

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
