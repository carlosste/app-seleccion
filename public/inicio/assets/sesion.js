// Menú de la cuenta en la página de inicio.
// Pregunta a /api/sesion si hay una empresa con sesión. Si la hay, marca <html data-sesion="empresa">
// (sesion.css esconde "Iniciar sesión / Registrar empresa") y muestra la bolita con las iniciales.
// Al tocarla se abre el menú con nombre, correo, empresa, "Ir al panel" y "Cerrar sesión".

function iniciales(nombre, correo) {
  const base = (nombre || "").trim() || (correo || "").split("@")[0];
  const partes = base.split(/[\s._-]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : base.slice(0, 2);
  return letras.toUpperCase();
}

async function cargarSesion() {
  try {
    const r = await fetch("/api/sesion", { credentials: "same-origin", cache: "no-store" });
    if (!r.ok) return null;
    const { sesion } = await r.json();
    return sesion;
  } catch {
    return null;
  }
}

function prepararMenu(perfil) {
  const boton = perfil.querySelector(".perfil__boton");
  const menu = perfil.querySelector(".perfil__menu");

  const abrir = (si) => {
    boton.setAttribute("aria-expanded", String(si));
    menu.hidden = !si;
    if (si) menu.querySelector("a, button")?.focus();
  };

  boton.addEventListener("click", () => abrir(menu.hidden));
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !perfil.contains(e.target)) abrir(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      abrir(false);
      boton.focus();
    }
  });
}

const sesion = await cargarSesion();
if (sesion) {
  const perfil = document.querySelector("[data-perfil]");
  if (perfil) {
    perfil.querySelector("[data-perfil-iniciales]").textContent = iniciales(sesion.nombre, sesion.correo);
    perfil.querySelector("[data-perfil-nombre]").textContent = sesion.nombre || "Sin nombre";
    perfil.querySelector("[data-perfil-correo]").textContent = sesion.correo;
    perfil.querySelector("[data-perfil-empresa]").textContent = sesion.empresa;
    perfil.hidden = false;
    prepararMenu(perfil);
  }
  document.documentElement.dataset.sesion = "empresa";
}
