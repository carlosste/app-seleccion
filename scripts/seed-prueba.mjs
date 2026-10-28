// Datos de prueba: una empresa, un usuario de gestión humana y una vacante completa.
// Usa la service role: solo se corre en tu computadora, nunca en el navegador.
// Uso: npm run seed   (requiere SUPABASE_SERVICE_ROLE_KEY y SEED_CONTRASENA en .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contrasena = process.env.SEED_CONTRASENA;

if (!url || !claveServicio || !contrasena) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SEED_CONTRASENA en .env.local.");
  process.exit(1);
}

const db = createClient(url, claveServicio, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMPRESA = "Empresa Demo S.A.S.";
const CORREO = "personal.demo@example.com";
const CARGO = "Analista de soporte técnico";

function verificar(error, paso) {
  if (error) {
    console.error(`Error en ${paso}: ${error.message}`);
    process.exit(1);
  }
}

// 1. Empresa
let { data: empresa, error } = await db.from("empresas").select("id").eq("nombre", EMPRESA).maybeSingle();
verificar(error, "buscar empresa");
if (!empresa) {
  ({ data: empresa, error } = await db
    .from("empresas")
    .insert({ nombre: EMPRESA, plan: "prueba" })
    .select("id")
    .single());
  verificar(error, "crear empresa");
}

// 2. Usuario de gestión humana (Auth) y su fila en usuarios_empresa
const { data: listado, error: errorListado } = await db.auth.admin.listUsers({ perPage: 1000 });
verificar(errorListado, "listar usuarios");
let usuario = listado.users.find((u) => u.email === CORREO);
if (!usuario) {
  const { data: creado, error: errorCreado } = await db.auth.admin.createUser({
    email: CORREO,
    password: contrasena,
    email_confirm: true,
  });
  verificar(errorCreado, "crear usuario de prueba");
  usuario = creado.user;
}

// El ingreso y proxy.ts solo aceptan cuentas marcadas como empresa en app_metadata
// (lo mismo que hace registrar_empresa en un registro normal).
const { error: errorTipo } = await db.auth.admin.updateUserById(usuario.id, {
  app_metadata: { ...usuario.app_metadata, tipo: "empresa", empresa_id: empresa.id },
});
verificar(errorTipo, "marcar la cuenta como empresa");

const { error: errorPersonal } = await db.from("usuarios_empresa").upsert({
  id: usuario.id,
  empresa_id: empresa.id,
  rol: "gestion_humana",
  nombre: "Personal demo",
});
verificar(errorPersonal, "vincular usuario con empresa");

// 3. Vacante (solo si no existe)
let { data: vacante, error: errorVacante } = await db
  .from("vacantes")
  .select("id")
  .eq("empresa_id", empresa.id)
  .eq("cargo", CARGO)
  .maybeSingle();
verificar(errorVacante, "buscar vacante");

if (!vacante) {
  ({ data: vacante, error: errorVacante } = await db
    .from("vacantes")
    .insert({
      empresa_id: empresa.id,
      cargo: CARGO,
      descripcion: "Soporte a usuarios internos, diagnóstico de equipos y redes.",
      estado: "abierta",
      creado_por: usuario.id,
    })
    .select("id")
    .single());
  verificar(errorVacante, "crear vacante");

  const etapas = [
    { tipo: "cv", orden: 1 },
    { tipo: "texto", orden: 2 },
    { tipo: "voz", orden: 3 },
    { tipo: "entrevista", orden: 4 },
  ].map((e) => ({ ...e, vacante_id: vacante.id }));
  verificar((await db.from("vacante_etapas").insert(etapas)).error, "crear etapas");

  // Requisitos: el valor de la oferta es público; el mínimo es interno.
  const requisitos = [
    { descripcion: "Formación", valor_oferta: "Tecnólogo en sistemas o afines", valor_minimo: "Técnico en sistemas" },
    { descripcion: "Experiencia", valor_oferta: "3 años en soporte", valor_minimo: "1 año" },
    { descripcion: "Idioma", valor_oferta: "Inglés B2", valor_minimo: "Inglés B1" },
    { descripcion: "Edad mínima", valor_oferta: "Mayor de 18 años", valor_minimo: "Mayor de 18 años" },
    { descripcion: "Certificación", valor_oferta: "CCNA (deseable)", valor_minimo: null },
  ];
  for (const r of requisitos) {
    const { data: oferta, error: errorOferta } = await db
      .from("requisitos_oferta")
      .insert({ vacante_id: vacante.id, descripcion: r.descripcion, valor_oferta: r.valor_oferta })
      .select("id")
      .single();
    verificar(errorOferta, "crear requisito");
    if (r.valor_minimo) {
      verificar(
        (await db.from("requisitos_minimos").insert({ requisito_id: oferta.id, valor_minimo: r.valor_minimo })).error,
        "crear requisito mínimo",
      );
    }
  }

  // Rúbrica con los cinco criterios de prueba (pesos suman 100).
  const { data: rubrica, error: errorRubrica } = await db
    .from("rubricas")
    .insert({ vacante_id: vacante.id })
    .select("id")
    .single();
  verificar(errorRubrica, "crear rúbrica");
  const criterios = [
    { nombre: "Conocimiento técnico", descripcion: "Domina las herramientas y conceptos que pide el cargo.", peso: 35 },
    { nombre: "Resolución de problemas", descripcion: "Explica con orden cómo llegaría a una solución.", peso: 25 },
    { nombre: "Comunicación clara", descripcion: "Se entiende lo que quiere decir. Se evalúa el contenido, no el acento.", peso: 20 },
    { nombre: "Experiencia relacionada", descripcion: "Da ejemplos reales de trabajos o proyectos parecidos.", peso: 15 },
    { nombre: "Rapidez de respuesta", descripcion: "Suma un poco si responde ágil; responder despacio no resta.", peso: 5 },
  ].map((c) => ({ ...c, rubrica_id: rubrica.id }));
  verificar((await db.from("criterios").insert(criterios)).error, "crear criterios");

  console.log(`Vacante creada: ${CARGO}`);
} else {
  console.log(`La vacante "${CARGO}" ya existe; no se duplica.`);
}

console.log(`Listo. Ingresa en /empresa/ingreso con ${CORREO} y la contraseña de SEED_CONTRASENA.`);
