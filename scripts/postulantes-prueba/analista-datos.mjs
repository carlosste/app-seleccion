// Perfiles ficticios para "Analista de datos" (empresa de ejemplo softsol).
// Las respuestas siguen el orden de las 5 preguntas de texto de esa vacante: organizar tareas
// con varias solicitudes, un compañero que pide ayuda urgente, explicar una idea compleja,
// un cambio inesperado de prioridades, y recibir una crítica constructiva.
// Requisitos mínimos de esa vacante: título profesional en ingeniería, estadística,
// matemáticas o afines; 2 años en análisis de datos; SQL; tableros en Power BI o Tableau;
// Python o R; mayor de 18.

// documento = ID y contraseña del postulante en modo pruebas.
export const PERSONAS = [
  {
    // Cumple todo, perfil fuerte · respuestas excelentes
    nombre: "Mariana Peña (prueba)",
    documento: "DATPRUEBA01",
    cv: [
      "PERFIL: Analista de datos con 4 años en el sector financiero; automatizo reportes y construyo modelos de riesgo.",
      "FORMACIÓN: Ingeniera de Sistemas, Universidad Icesi (2019).",
      "EXPERIENCIA: Analista de datos, Banco de Occidente (2020-2024): 4 años. Tableros en Power BI para la gerencia comercial.",
      "HERRAMIENTAS: SQL avanzado (PostgreSQL, SQL Server), Python (pandas, scikit-learn), Power BI, Git.",
      "CURSOS: Google Data Analytics Professional Certificate (2022).",
    ],
    respuestas: [
      "Al empezar el día reviso todas las solicitudes y las ordeno por impacto y por fecha de entrega. Uso un tablero en Trello con columnas por estado, y para cada pedido anoto quién lo pidió y para qué decisión lo necesita. Si dos cosas chocan, le pregunto al líder cuál pesa más en lugar de adivinar. Así evito tener cinco cosas a medias.",
      "Primero le pregunto qué tan urgente es y cuánto tiempo necesita. Si es algo de diez minutos, guardo lo que estoy haciendo, anoto en qué paso iba y lo ayudo. Si es más largo, le propongo una hora concreta o le comparto la consulta o el recurso que le sirve para avanzar solo mientras termino. No dejo a nadie esperando sin respuesta.",
      "En el banco tuve que explicarle a la gerente comercial por qué un modelo marcaba a ciertos clientes como riesgosos. En vez de hablar de variables, le mostré tres clientes reales anonimizados y qué los diferenciaba. Usé un gráfico simple y una sola cifra clave por cliente. Al final le pedí que me contara con sus palabras cómo lo usaría en su equipo, y ahí confirmé que lo había entendido.",
      "Primero entiendo el motivo del cambio, porque eso me dice qué partes del trabajo siguen sirviendo. Guardo lo avanzado y documento dónde quedó, por si se retoma. Luego reorganizo el plan y aviso a las personas afectadas de las nuevas fechas. Me pasó con un tablero que cambió de enfoque a mitad de mes, y reutilicé casi el 60 % de las consultas.",
      "Escucho sin defenderme y pido un ejemplo concreto, porque eso me ayuda a entender qué cambiar. Luego hago un plan pequeño, aplico el cambio en la siguiente entrega y le pido a la persona que me diga si notó la diferencia. Una vez me dijeron que mis reportes tenían demasiadas tablas; empecé a resumir en tres puntos al inicio y la gerencia los empezó a leer completos.",
    ],
  },
  {
    // Cumple todo · respuestas buenas
    nombre: "Tomás Arango (prueba)",
    documento: "DATPRUEBA02",
    cv: [
      "FORMACIÓN: Estadístico, Universidad del Valle (2020).",
      "EXPERIENCIA: Analista de inteligencia de negocios, Almacenes La 14 (2021-2024): 3 años.",
      "HERRAMIENTAS: SQL, Tableau, R (tidyverse, ggplot2), Excel avanzado.",
    ],
    respuestas: [
      "Hago una lista con todo lo que me pidieron y marco lo urgente. Empiezo por lo que bloquea a otras personas y dejo para después lo que puede esperar.",
      "Si es urgente de verdad, pauso lo mío y lo ayudo, pero antes dejo anotado en qué iba para no perderme.",
      "Le expliqué a un jefe de tienda por qué sus ventas parecían bajar cuando en realidad era la temporada. Le mostré el mismo mes del año anterior en un gráfico y lo entendió rápido.",
      "Me adapto. Pregunto qué cambió, ajusto mi plan y sigo con lo nuevo.",
      "La tomo como algo para mejorar. Pienso qué hice mal y trato de no repetirlo en la siguiente tarea.",
    ],
  },
  {
    // Cumple todo · respuestas buenas pero incompletas (3 de 5)
    nombre: "Luisa Fernanda Ruiz (prueba)",
    documento: "DATPRUEBA03",
    cv: [
      "FORMACIÓN: Ingeniera Industrial, Universidad Autónoma de Occidente (2020).",
      "EXPERIENCIA: Analista de datos de operaciones, Logística Express (2022-2024): 2 años y 4 meses.",
      "HERRAMIENTAS: SQL (MySQL), Power BI, Python básico (pandas).",
    ],
    respuestas: [
      "Organizo las tareas en un calendario y bloqueo horas para el trabajo que necesita concentración. Las solicitudes nuevas las reviso dos veces al día y les doy una fecha de respuesta.",
      "Le digo que me dé unos minutos para cerrar lo que estoy haciendo y luego lo ayudo. Si no puedo, le recomiendo a otra persona del equipo.",
      "En logística expliqué a los conductores por qué cambiaban las rutas. Usé un mapa con los tiempos de antes y de ahora, y eso fue más claro que cualquier tabla.",
    ],
  },
  {
    // No cumple: solo 1 año de experiencia (pide 2) · respuestas excelentes
    nombre: "Diego Cárdenas (prueba)",
    documento: "DATPRUEBA04",
    cv: [
      "FORMACIÓN: Matemático, Universidad del Valle (2023).",
      "EXPERIENCIA: Analista de datos junior, Fintech Cali (2023-2024): 1 año.",
      "HERRAMIENTAS: SQL, Python (pandas, numpy), Power BI.",
      "PROYECTOS: Modelo de predicción de abandono de clientes (proyecto de grado, nota laureada).",
    ],
    respuestas: [
      "Uso una matriz de urgencia e importancia: lo urgente e importante lo hago primero, lo importante pero no urgente lo agendo, y lo demás lo delego o lo negocio. Cada viernes reviso qué quedó pendiente y por qué, para planear mejor la semana siguiente.",
      "Le pregunto qué necesita exactamente y para cuándo. Si mi tarea puede esperar unos minutos, guardo el estado y lo ayudo; si no, le doy una hora y, mientras tanto, le paso lo que pueda destrabarlo. Lo importante es que sepa con qué contar.",
      "Tuve que explicarle a mi mamá, que tiene una tienda, qué era un promedio móvil para ver sus ventas. Usé las ventas reales de su tienda, calculamos juntos tres semanas en una hoja y vio cómo se suavizaba la curva. Después ella misma me explicó para qué le servía, y ahí supe que lo había entendido.",
      "Pregunto el motivo para entender qué se mantiene y qué no. Cierro lo que estaba haciendo con una nota de en qué quedó, y replanifico con fechas realistas que comunico de una vez. Prefiero avisar temprano un retraso que entregar algo apurado.",
      "Agradezco y pido ejemplos. Separo lo que es de forma y lo que es de fondo, y elijo una o dos cosas para mejorar en la siguiente entrega. Luego vuelvo a la persona para preguntarle si notó el cambio.",
    ],
  },
  {
    // No cumple: es tecnóloga, no profesional · respuestas buenas
    nombre: "Sofía Méndez (prueba)",
    documento: "DATPRUEBA05",
    cv: [
      "FORMACIÓN: Tecnóloga en Análisis y Desarrollo de Software, SENA (2020).",
      "EXPERIENCIA: Analista de datos, Call Center Pacífico (2021-2024): 3 años.",
      "HERRAMIENTAS: SQL, Power BI, Python (pandas).",
    ],
    respuestas: [
      "Priorizo según lo que necesita el cliente interno primero y uso listas de tareas con fechas.",
      "Si puedo, lo ayudo enseguida. Si no, le digo cuándo puedo y cumplo esa hora.",
      "Le expliqué a una supervisora un indicador de tiempo de atención usando un ejemplo de su propio equipo.",
      "Me ajusto al cambio y aviso si alguna fecha se mueve.",
      "La escucho, pido que me muestre dónde estuvo el error y lo corrijo en el siguiente informe.",
    ],
  },
  {
    // No menciona Power BI ni Tableau → debe quedar "por revisar" · respuestas regulares
    nombre: "Juan Pablo Ospina (prueba)",
    documento: "DATPRUEBA06",
    cv: [
      "FORMACIÓN: Ingeniero Electrónico, Universidad Javeriana Cali (2019).",
      "EXPERIENCIA: Analista de datos de producción, Industrias del Valle (2022-2024): 2 años.",
      "HERRAMIENTAS: SQL, Python.",
    ],
    respuestas: [
      "Hago lo más urgente primero.",
      "Lo ayudo si tengo tiempo.",
      "Le explico con palabras sencillas y le pregunto si entendió.",
      "Cambio de tarea y sigo con la nueva prioridad.",
      "Trato de mejorar lo que me dicen.",
    ],
  },
  {
    // No menciona SQL → "por revisar" · respuestas regulares, una fuera de tema
    nombre: "Valeria Gil (prueba)",
    documento: "DATPRUEBA07",
    cv: [
      "FORMACIÓN: Economista, Universidad Icesi (2020).",
      "EXPERIENCIA: Analista de datos económicos, Cámara de Comercio (2022-2024): 2 años y medio.",
      "HERRAMIENTAS: Power BI, Python (pandas, statsmodels), Excel avanzado.",
    ],
    respuestas: [
      "Uso una agenda y voy tachando lo que termino.",
      "En mis tiempos libres me gusta leer y salir a correr, eso me ayuda a despejar la mente.",
      "Uso gráficos sencillos y evito los términos técnicos.",
      "Me cuesta un poco al principio, pero me adapto.",
      "Acepto la crítica y la aplico.",
    ],
  },
  {
    // No cumple: administración y experiencia administrativa, no de análisis de datos · malas
    nombre: "Andrés Mora (prueba)",
    documento: "DATPRUEBA08",
    cv: [
      "FORMACIÓN: Administrador de Empresas (2018).",
      "EXPERIENCIA: Asistente administrativo, Ferretería El Tornillo (2019-2024): 5 años.",
      "HERRAMIENTAS: Excel intermedio, Word.",
    ],
    respuestas: [
      "Hago lo que me vayan pidiendo en orden.",
      "Le digo que estoy ocupado.",
      "Le explico y ya.",
      "Me molesta un poco, pero lo hago.",
      "Depende de quién me la diga.",
    ],
  },
  {
    // Cumple TODO el CV, pero respuestas horribles (CV y respuestas pesan distinto)
    nombre: "Camilo Rincón (prueba)",
    documento: "DATPRUEBA09",
    cv: [
      "FORMACIÓN: Ingeniero de Sistemas, Universidad del Valle (2017).",
      "EXPERIENCIA: Analista de datos senior, Tecnoquímicas (2019-2024): 5 años.",
      "HERRAMIENTAS: SQL, Tableau, Power BI, Python, R.",
    ],
    respuestas: ["normal", "no se", "le digo", "ni modo", "ok"],
  },
  {
    // Cumple todo · se postuló y todavía no responde
    nombre: "Paula Restrepo (prueba)",
    documento: "DATPRUEBA10",
    cv: [
      "FORMACIÓN: Estadística, Universidad Nacional sede Palmira (2021).",
      "EXPERIENCIA: Analista de datos de salud pública, Secretaría de Salud (2022-2024): 2 años.",
      "HERRAMIENTAS: SQL, Power BI, R.",
    ],
    respuestas: [],
  },
];
