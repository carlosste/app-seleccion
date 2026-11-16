// Archivos del bucket "cvs" que ya no tienen postulación (por ejemplo, tras borrar filas o
// cuentas a mano). Borrar filas no borra los PDF del Storage.
//
// Uso (solo en tu computadora, con la service role de .env.local):
//   node --env-file=.env.local scripts/cvs-huerfanos.mjs           -> solo lista, no borra nada
//   node --env-file=.env.local scripts/cvs-huerfanos.mjs --borrar  -> pide confirmación escrita
//
// Los archivos de menos de 24 horas no se tocan: la app sube el CV antes de crear la
// postulación, así que uno reciente sin postulación puede ser alguien postulándose ahora mismo.

import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !claveServicio) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}
const BORRAR = process.argv.includes("--borrar");
const MARGEN_MS = 24 * 60 * 60 * 1000;
const POR_PAGINA = 1000;

const supabase = createClient(url, claveServicio, { auth: { persistSession: false } });
const bucket = supabase.storage.from("cvs");

async function listarCarpeta(prefijo) {
  const todo = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await bucket.list(prefijo, { limit: POR_PAGINA, offset: desde, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`No se pudo listar "${prefijo || "/"}": ${error.message}`);
    todo.push(...data);
    if (data.length < POR_PAGINA) return todo;
  }
}

// En la raíz hay una carpeta por usuario (id null = carpeta) y adentro los PDF.
const archivos = [];
for (const entrada of await listarCarpeta("")) {
  if (entrada.id) {
    archivos.push({ ruta: entrada.name, creado: entrada.created_at });
    continue;
  }
  for (const a of await listarCarpeta(entrada.name)) {
    if (a.id) archivos.push({ ruta: `${entrada.name}/${a.name}`, creado: a.created_at });
  }
}

const enUso = new Set();
for (let desde = 0; ; desde += POR_PAGINA) {
  const { data, error } = await supabase
    .from("postulaciones")
    .select("cv_path")
    .not("cv_path", "is", null)
    .range(desde, desde + POR_PAGINA - 1);
  if (error) throw new Error(`No se pudieron leer las postulaciones: ${error.message}`);
  for (const p of data) enUso.add(p.cv_path);
  if (data.length < POR_PAGINA) break;
}

const ahora = Date.now();
const sinPostulacion = archivos.filter((a) => !enUso.has(a.ruta));
const recientes = sinPostulacion.filter((a) => a.creado && ahora - new Date(a.creado).getTime() < MARGEN_MS);
const huerfanos = sinPostulacion.filter((a) => !recientes.includes(a));

console.log(`Archivos en el bucket cvs: ${archivos.length}`);
console.log(`Con postulación: ${archivos.length - sinPostulacion.length}`);
console.log(`Sin postulación de menos de 24 h (no se tocan): ${recientes.length}`);
console.log(`Huérfanos: ${huerfanos.length}`);
for (const h of huerfanos) console.log(`  ${h.ruta}  (subido ${h.creado ?? "fecha desconocida"})`);

if (!BORRAR) {
  if (huerfanos.length) console.log("\nModo de solo lectura: no se borró nada. Para borrar, agrega --borrar.");
  process.exit(0);
}
if (!huerfanos.length) process.exit(0);

const frase = `BORRAR ${huerfanos.length}`;
const consola = createInterface({ input: process.stdin, output: process.stdout });
const respuesta = await consola.question(`\nEsto borra ${huerfanos.length} archivo(s) y no se puede deshacer. Escribe "${frase}" para confirmar: `);
consola.close();
if (respuesta.trim() !== frase) {
  console.log("No coincide: no se borró nada.");
  process.exit(0);
}

let borrados = 0;
for (let i = 0; i < huerfanos.length; i += 100) {
  const lote = huerfanos.slice(i, i + 100).map((h) => h.ruta);
  const { data, error } = await bucket.remove(lote);
  if (error) {
    console.error(`Falló un lote: ${error.message}. Borrados hasta ahora: ${borrados}.`);
    process.exit(1);
  }
  borrados += data.length;
}
console.log(`Listo: ${borrados} archivo(s) borrados.`);
