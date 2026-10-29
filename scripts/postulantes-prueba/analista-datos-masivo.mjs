// 100 perfiles ficticios GENERADOS para "Analista de datos" (softsol), para probar la app a
// mayor escala (2026-10-28, pedido de Carlos). Se arman combinando piezas con un azar fijo
// (semilla), así el mismo comando siempre da las mismas personas y se puede correr dos veces.
//
// Mezcla de hojas de vida (contra los mínimos de la vacante: título profesional afín, 2 años
// en análisis de datos, SQL, Power BI o Tableau, Python o R, mayor de 18):
//   cumple con perfil fuerte, cumple justo, no cumple la experiencia, no cumple el título,
//   otra área, no maneja SQL ni programación, y "por revisar" (le falta mencionar un dato).
// Mezcla de respuestas (5 preguntas de texto: organizar tareas, compañero que pide ayuda,
//   explicar algo complejo, cambio de prioridades, crítica constructiva):
//   excelentes, buenas, regulares (a veces una fuera de tema), malas, horribles, incompletas
//   y sin responder. Calidad de CV y de respuestas van por separado, a propósito.

// Generador pseudoaleatorio con semilla (mulberry32): mismo resultado en cada corrida.
function crearAzar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = crearAzar(20261028);
const uno = (lista) => lista[Math.floor(azar() * lista.length)];
const algunos = (lista, n) => [...lista].sort(() => azar() - 0.5).slice(0, n);
const entre = (min, max) => min + Math.floor(azar() * (max - min + 1));
// Elige una clave según pesos: { a: 30, b: 10 } → "a" el 75 % de las veces.
const segun = (pesos) => {
  let r = azar() * Object.values(pesos).reduce((s, p) => s + p, 0);
  for (const [clave, peso] of Object.entries(pesos)) if ((r -= peso) < 0) return clave;
  return Object.keys(pesos)[0];
};

const NOMBRES = [
  "Alejandra", "Andrés", "Ángela", "Brayan", "Camila", "Carlos", "Catalina", "Cristian", "Daniela", "David",
  "Diana", "Esteban", "Felipe", "Gabriela", "Hernán", "Isabella", "Jairo", "Jessica", "Jorge", "Juliana",
  "Kevin", "Laura", "Leidy", "Manuela", "Mateo", "Melissa", "Natalia", "Nicolás", "Paola", "Ricardo",
  "Samuel", "Sara", "Sebastián", "Stefany", "Valentina", "Víctor", "Yesenia", "Johan", "María José", "Juan David",
];
const APELLIDOS = [
  "Acosta", "Aguirre", "Álvarez", "Arias", "Bedoya", "Benítez", "Bermúdez", "Cabrera", "Caicedo", "Castaño",
  "Cifuentes", "Correa", "Delgado", "Duque", "Escobar", "Franco", "Galeano", "Giraldo", "Guzmán", "Henao",
  "Hurtado", "Jaramillo", "Lozano", "Marín", "Montoya", "Muñoz", "Navarro", "Orozco", "Palacios", "Quintero",
  "Ramírez", "Rendón", "Rojas", "Salazar", "Sánchez", "Tabares", "Trujillo", "Valencia", "Vargas", "Zapata",
];
const UNIVERSIDADES = [
  "Universidad del Valle", "Universidad Icesi", "Universidad Javeriana Cali", "Universidad Autónoma de Occidente",
  "Universidad San Buenaventura", "Universidad Santiago de Cali", "Universidad Nacional", "Universidad de Antioquia",
  "Universidad EAFIT", "Universidad de los Andes",
];
const CARRERAS_AFINES = [
  "Ingeniería de Sistemas", "Ingeniería Industrial", "Estadística", "Matemáticas", "Ingeniería Electrónica",
  "Ingeniería de Software", "Ciencia de Datos", "Ingeniería Financiera", "Física",
];
const NO_PROFESIONAL = [
  "Tecnólogo en Análisis y Desarrollo de Software (SENA)", "Técnico en Sistemas", "Tecnólogo en Gestión Empresarial",
  "Bachiller académico", "Técnico en Contabilidad",
];
const OTRAS_AREAS = ["Administración de Empresas", "Contaduría Pública", "Comunicación Social", "Psicología", "Derecho"];
const EMPRESAS = [
  "Banco de Bogotá", "Bancolombia", "Tecnoquímicas", "Colombina", "Carvajal", "Emcali", "Comfandi", "Rappi",
  "Alpina", "Grupo Éxito", "Sura", "Coomeva", "Claro", "Avianca", "Secretaría de Salud", "Startup de logística",
];
const CARGOS_DATOS = [
  "Analista de datos", "Analista de inteligencia de negocios", "Analista de información", "Científico de datos junior",
  "Analista de reportes", "Analista de BI",
];
const CARGOS_OTROS = ["Asistente administrativo", "Auxiliar contable", "Asesor comercial", "Auxiliar de bodega", "Recepcionista"];
const BASES = ["PostgreSQL", "SQL Server", "MySQL", "Oracle", "BigQuery"];
const VISUAL = ["Power BI", "Tableau"];
const PROGRAMACION = ["Python (pandas)", "Python (pandas, scikit-learn)", "R (tidyverse)", "Python y R"];
const EXTRA = ["Excel avanzado", "Git", "Airflow", "dbt", "Looker Studio", "estadística inferencial", "inglés B2", "AWS", "Spark"];
const CURSOS = [
  "Google Data Analytics Certificate", "Microsoft PL-300 (Power BI)", "Diplomado en ciencia de datos",
  "Curso de SQL avanzado (Platzi)", "Tableau Desktop Specialist",
];

const anios = (n) =>
  n === 0.5 ? "6 meses" : n === 1 ? "1 año" : n === 1.5 ? "1 año y medio" : Number.isInteger(n) ? `${n} años` : `${Math.floor(n)} años y medio`;

// Hoja de vida según el tipo de perfil.
function hojaDeVida(tipo) {
  const carrera = uno(CARRERAS_AFINES);
  const titulo = `FORMACIÓN: ${carrera}, ${uno(UNIVERSIDADES)} (${entre(2010, 2022)}).`;
  const experienciaDatos = (n) => `EXPERIENCIA: ${uno(CARGOS_DATOS)}, ${uno(EMPRESAS)}: ${anios(n)}.`;
  const herramientas = (partes) => `HERRAMIENTAS: ${partes.filter(Boolean).join(", ")}.`;
  const completo = () => [`SQL (${uno(BASES)})`, uno(VISUAL), uno(PROGRAMACION), ...algunos(EXTRA, entre(0, 3))];

  switch (tipo) {
    case "fuerte":
      return [
        `PERFIL: ${uno(["Analista de datos", "Profesional de datos", "Analista BI"])} con experiencia en ${uno(["banca", "retail", "salud", "logística", "telecomunicaciones", "seguros"])}.`,
        titulo,
        experienciaDatos(entre(3, 8)),
        herramientas(completo()),
        azar() < 0.6 ? `CURSOS: ${algunos(CURSOS, entre(1, 2)).join(", ")}.` : "",
      ].filter(Boolean);
    case "justo":
      return [titulo, experienciaDatos(2), herramientas([`SQL (${uno(BASES)})`, uno(VISUAL), uno(PROGRAMACION)])];
    case "poca_experiencia":
      return [titulo, experienciaDatos(uno([0.5, 1, 1.5])), herramientas(completo())];
    case "sin_titulo":
      return [`FORMACIÓN: ${uno(NO_PROFESIONAL)} (${entre(2012, 2022)}).`, experienciaDatos(entre(2, 5)), herramientas(completo())];
    case "otra_area":
      return [
        `FORMACIÓN: ${uno(OTRAS_AREAS)}, ${uno(UNIVERSIDADES)} (${entre(2010, 2021)}).`,
        `EXPERIENCIA: ${uno(CARGOS_OTROS)}, ${uno(EMPRESAS)}: ${anios(entre(2, 6))}.`,
        herramientas(["Excel intermedio", "Word"]),
      ];
    case "sin_herramientas":
      return [
        titulo,
        experienciaDatos(entre(2, 4)),
        "HERRAMIENTAS: Excel avanzado y tablas dinámicas. No ha trabajado con SQL ni con lenguajes de programación.",
      ];
    default: {
      // "por_revisar": cumple, pero no menciona uno de los datos (SQL, tableros o programación).
      const falta = uno(["sql", "visual", "programacion"]);
      return [
        titulo,
        experienciaDatos(entre(2, 5)),
        herramientas([
          falta === "sql" ? "" : `SQL (${uno(BASES)})`,
          falta === "visual" ? "" : uno(VISUAL),
          falta === "programacion" ? "" : uno(PROGRAMACION),
          uno(EXTRA),
        ]),
      ];
    }
  }
}

// Respuestas por pregunta y por calidad. Varias versiones de cada una para que no se repitan.
const RESPUESTAS = {
  excelente: [
    [
      "Al empezar el día ordeno las solicitudes por impacto y fecha de entrega en un tablero con columnas por estado. Para cada una anoto quién la pide y para qué decisión la necesita. Si dos chocan, le pregunto al líder cuál pesa más en vez de adivinar.",
      "Uso una matriz de urgencia e importancia y bloqueo en el calendario las horas de trabajo profundo. Las solicitudes nuevas las reviso dos veces al día y a cada una le doy una fecha de respuesta, así nadie queda esperando sin saber.",
      "Divido cada pedido en pasos pequeños, estimo cuánto toma cada uno y armo la semana con esos tiempos. Cada viernes reviso qué se atrasó y por qué, para planear mejor la siguiente.",
    ],
    [
      "Primero le pregunto qué tan urgente es y cuánto tiempo necesita. Si son minutos, guardo en qué paso voy y lo ayudo; si es más largo, le propongo una hora concreta y le paso lo que pueda destrabarlo mientras tanto.",
      "Entiendo qué necesita exactamente. Si mi tarea puede esperar, anoto dónde quedé y lo apoyo; si no, le doy una hora y, si es crítico, lo escalo al líder para decidir juntos qué va primero.",
      "Le pido dos minutos para cerrar la idea en la que estoy, así no pierdo el hilo, y luego lo ayudo con toda la atención. Si veo que se repite, le propongo una guía para que la próxima vez lo resuelva solo.",
    ],
    [
      "Tuve que explicarle a una gerente por qué un modelo marcaba ciertos clientes como riesgosos. En vez de hablar de variables, le mostré tres casos reales anonimizados y qué los diferenciaba, con un gráfico simple. Al final le pedí que me contara cómo lo usaría y así confirmé que lo entendió.",
      "Le expliqué a un equipo de ventas qué era la estacionalidad usando sus propias ventas del año anterior en un solo gráfico. Evité los términos técnicos y cerré con una pregunta para que ellos sacaran la conclusión.",
      "Para explicar un indicador nuevo usé una analogía con algo de su día a día, luego un ejemplo con sus datos y dejé un resumen de tres puntos por escrito. Después les pedí que me lo explicaran con sus palabras.",
    ],
    [
      "Primero entiendo el motivo del cambio para saber qué partes del trabajo siguen sirviendo. Documento dónde quedó lo avanzado, replanifico y aviso de una vez las nuevas fechas a las personas afectadas.",
      "Pregunto qué cambió y qué se espera ahora. Reutilizo lo que sirve, guardo lo demás por si se retoma y comunico el nuevo plan con fechas realistas. Prefiero avisar temprano un ajuste que entregar algo apurado.",
      "Me tomo un momento para evaluar el impacto, hablo con el líder sobre qué se detiene y qué sigue, y reorganizo el tablero. En un proyecto así reaproveché más de la mitad de las consultas que ya tenía.",
    ],
    [
      "Escucho sin defenderme y pido un ejemplo concreto. Elijo una o dos cosas para mejorar, las aplico en la siguiente entrega y vuelvo a preguntar si se notó el cambio.",
      "Agradezco la retroalimentación, separo lo que es de forma y lo que es de fondo, y hago un plan corto. Una vez me dijeron que mis informes eran muy largos; empecé a poner un resumen al inicio y los empezaron a leer completos.",
      "La anoto, la pienso con calma y, si no la entiendo del todo, pido que me muestren dónde estuvo el problema. Luego la aplico y hago seguimiento para confirmar que mejoré.",
    ],
  ],
  buena: [
    [
      "Hago una lista con todo lo que me piden y marco lo urgente. Empiezo por lo que bloquea a otras personas.",
      "Uso un calendario y pongo fechas a cada tarea. Lo más urgente va primero.",
      "Organizo por prioridad y voy actualizando la lista durante el día.",
    ],
    [
      "Si es urgente de verdad, pauso lo mío y lo ayudo, pero antes anoto en qué iba.",
      "Le digo que me dé unos minutos para terminar y luego lo ayudo.",
      "Lo ayudo si es rápido; si no, le doy una hora para hacerlo.",
    ],
    [
      "Le expliqué a un jefe por qué bajaban sus ventas usando un gráfico del mismo mes del año anterior y lo entendió rápido.",
      "Usé un ejemplo con sus propios datos y evité los términos técnicos.",
      "Lo expliqué con un dibujo sencillo y le pregunté si tenía dudas.",
    ],
    [
      "Pregunto qué cambió, ajusto mi plan y sigo con lo nuevo.",
      "Me adapto y aviso si alguna fecha de entrega se mueve.",
      "Guardo lo que llevaba y empiezo con la nueva prioridad.",
    ],
    [
      "La tomo como algo para mejorar y trato de aplicarla en la siguiente tarea.",
      "Pregunto qué puedo hacer distinto y lo corrijo.",
      "La escucho, pienso qué hice mal y no lo repito.",
    ],
  ],
  regular: [
    ["Hago lo más urgente primero.", "Voy haciendo las cosas a medida que llegan.", "Trato de organizarme como pueda."],
    ["Lo ayudo si tengo tiempo.", "Depende de qué tan ocupado esté.", "Le digo que espere un rato."],
    ["Le explico con palabras sencillas.", "Le explico varias veces hasta que entienda.", "Uso un ejemplo."],
    ["Cambio de tarea y sigo.", "Me cuesta un poco, pero me adapto.", "Hago lo que me digan."],
    ["Trato de mejorar.", "La acepto.", "Intento no repetir el error."],
  ],
  mala: [
    ["Hago lo que me vayan pidiendo.", "Lo que salga primero.", "No me organizo mucho."],
    ["Le digo que estoy ocupado.", "Que le pida a otro.", "No lo ayudo, tengo mis cosas."],
    ["Le explico rápido y ya.", "Si no entiende es problema de él.", "Le mando un correo."],
    ["Me molesta, pero lo hago.", "No me gustan los cambios.", "Sigo con lo que estaba."],
    ["Depende de quién me la diga.", "No me gustan las críticas.", "La ignoro si no estoy de acuerdo."],
  ],
  horrible: [
    ["normal", "no se", "como sea", "nada"],
    ["no", "ni idea", "que espere", "-"],
    ["le digo", "no se", "asi", "ya"],
    ["ni modo", "pues ya", "no se", "ok"],
    ["ok", "bien", "nada", "no se"],
  ],
};
const FUERA_DE_TEMA = [
  "En mis tiempos libres me gusta jugar fútbol y salir con mis amigos.",
  "Me considero una persona muy responsable y puntual.",
  "Mi sueño es trabajar en una empresa grande y crecer profesionalmente.",
];

function respuestas(calidad) {
  if (calidad === "sin_responder") return [];
  const base = calidad === "incompleta" ? uno(["excelente", "buena", "regular"]) : calidad;
  const lista = RESPUESTAS[base].map((versiones) => uno(versiones));
  // De vez en cuando, una regular se sale del tema.
  if (base === "regular" && azar() < 0.35) lista[entre(0, 4)] = uno(FUERA_DE_TEMA);
  return calidad === "incompleta" ? lista.slice(0, entre(1, 4)) : lista;
}

const nombresUsados = new Set();
export const PERSONAS = Array.from({ length: 100 }, (_, i) => {
  let nombre;
  do nombre = `${uno(NOMBRES)} ${uno(APELLIDOS)} ${uno(APELLIDOS)}`;
  while (nombresUsados.has(nombre));
  nombresUsados.add(nombre);

  const tipo = segun({ fuerte: 26, justo: 14, por_revisar: 16, poca_experiencia: 12, sin_titulo: 12, otra_area: 10, sin_herramientas: 10 });
  const calidad = segun({ excelente: 14, buena: 26, regular: 24, mala: 14, horrible: 8, incompleta: 9, sin_responder: 5 });
  return {
    nombre: `${nombre} (prueba)`,
    // documento = ID y contraseña del postulante en modo pruebas.
    documento: `DATM${String(i + 1).padStart(3, "0")}`,
    cv: hojaDeVida(tipo),
    respuestas: respuestas(calidad),
    perfil: tipo,
    calidad,
  };
});
