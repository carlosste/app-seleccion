"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { postularse, type EstadoPostulacion } from "@/app/postular/acciones";

// Mensajes por código de error, y a qué campo apunta cada uno (para marcarlo y llevar el foco).
const ERRORES: Record<string, { texto: string; campo?: Campo }> = {
  datos: {
    texto:
      "Revisa tus datos. Nombre, correo, teléfono y documento (de 6 a 20 letras o números) son obligatorios, y debes marcar las dos autorizaciones.",
  },
  cv: { texto: "Sube tu hoja de vida en PDF (un PDF real, no otro archivo renombrado), de máximo 4 MB.", campo: "cv" },
  documento: {
    texto: "Ya existe una cuenta con ese documento y otro correo. Escribe el correo que usaste la primera vez.",
    campo: "correo",
  },
  "correo-documento": { texto: "Ese correo ya tiene una cuenta con otro documento. Revisa el número de documento.", campo: "documento" },
  "correo-registrado": { texto: "Ese correo ya está registrado en otra cuenta. Usa otro correo.", campo: "correo" },
  empresa: { texto: "Ese correo es de una cuenta de empresa. Para postularte usa tu correo personal.", campo: "correo" },
  limite: { texto: "Esta empresa ya no recibe más postulaciones por ahora." },
  "limite-intentos": { texto: "Hubo demasiadas postulaciones desde tu red. Intenta de nuevo en una hora." },
  general: { texto: "Algo salió mal. Tus datos siguen aquí: intenta de nuevo." },
};

type Campo = "nombre" | "correo" | "telefono" | "documento" | "cv" | "acepto_datos" | "acepto_grabacion";

const LIMITE_CV = 4 * 1024 * 1024;

// Revisión en el navegador para responder al instante; el servidor vuelve a revisar todo.
function revisar(fd: FormData): Partial<Record<Campo, string>> {
  const e: Partial<Record<Campo, string>> = {};
  const texto = (k: string) => String(fd.get(k) ?? "").trim();
  if (texto("nombre").length < 3) e.nombre = "Escribe tu nombre completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto("correo"))) e.correo = "Escribe un correo válido, como nombre@correo.com.";
  if (texto("telefono").replace(/\D/g, "").length < 7) e.telefono = "Escribe un teléfono de al menos 7 números.";
  if (!/^[A-Za-z0-9]{6,20}$/.test(texto("documento").replace(/[\s.-]/g, ""))) e.documento = "Tu documento va de 6 a 20 letras o números.";
  const cv = fd.get("cv");
  if (!(cv instanceof File) || cv.size === 0) e.cv = "Elige tu hoja de vida en PDF.";
  else if (!cv.name.toLowerCase().endsWith(".pdf") && cv.type !== "application/pdf") e.cv = "La hoja de vida debe ser un PDF.";
  else if (cv.size > LIMITE_CV) e.cv = `Tu PDF pesa ${(cv.size / 1024 / 1024).toFixed(1)} MB; el máximo es 4 MB.`;
  if (fd.get("acepto_datos") !== "on") e.acepto_datos = "Marca esta autorización para continuar.";
  if (fd.get("acepto_grabacion") !== "on") e.acepto_grabacion = "Marca esta autorización para continuar.";
  return e;
}

const ORDEN: Campo[] = ["nombre", "correo", "telefono", "documento", "cv", "acepto_datos", "acepto_grabacion"];

export function FormularioPostulacion({
  token,
  empresa,
  casillaDatos,
  casillaGrabacion,
}: {
  token: string;
  empresa: string;
  casillaDatos: string;
  casillaGrabacion: string;
}) {
  const [estado, accion, enviando] = useActionState<EstadoPostulacion, FormData>(postularse, { error: null, vez: 0 });
  const [locales, setLocales] = useState<Partial<Record<Campo, string>>>({});
  const aviso = useRef<HTMLDivElement>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const delServidor = estado.error ? ERRORES[estado.error] ?? ERRORES.general : null;
  const errores: Partial<Record<Campo, string>> = { ...locales };
  if (delServidor?.campo && !errores[delServidor.campo]) errores[delServidor.campo] = delServidor.texto;

  // Si el servidor rechaza, el foco va al aviso (o al campo que falló) para que se lea enseguida.
  useEffect(() => {
    if (!estado.error) return;
    const campo = ERRORES[estado.error]?.campo;
    const destino = campo ? formulario.current?.querySelector<HTMLElement>(`[name="${campo}"]`) : aviso.current;
    destino?.focus();
  }, [estado]);

  // onSubmit + startTransition: React no vacía el formulario si algo falla (ni la hoja de vida).
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const encontrados = revisar(fd);
    setLocales(encontrados);
    const primero = ORDEN.find((c) => encontrados[c]);
    if (primero) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    startTransition(() => accion(fd));
  }

  const limpiar = (campo: Campo) => () => setLocales((p) => (p[campo] ? { ...p, [campo]: undefined } : p));

  const props = (campo: Campo) => ({
    id: campo,
    name: campo,
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": [errores[campo] ? `${campo}-error` : null, campo === "documento" ? "documento-ayuda" : null]
      .filter(Boolean)
      .join(" ") || undefined,
    onChange: limpiar(campo),
  });

  const error = (campo: Campo) =>
    errores[campo] ? (
      <span id={`${campo}-error`} className="campo-error">
        {errores[campo]}
      </span>
    ) : null;

  return (
    <form ref={formulario} action={accion} onSubmit={enviar} noValidate className="tarjeta tarjeta-compacta form-postular">
      <input type="hidden" name="token" value={token} />
      <p className="texto-gris">Todos los campos son obligatorios.</p>

      {delServidor && !delServidor.campo && (
        <div ref={aviso} tabIndex={-1} className="nota nota-error" role="alert">
          {delServidor.texto}
        </div>
      )}

      <div className="campo">
        <label htmlFor="nombre">Nombre completo</label>
        <input {...props("nombre")} className="inp" placeholder="Tu nombre" maxLength={120} autoComplete="name" />
        {error("nombre")}
      </div>
      <div className="campo">
        <label htmlFor="correo">Correo electrónico</label>
        <input
          {...props("correo")}
          type="email"
          className="inp"
          placeholder="nombre@correo.com"
          maxLength={254}
          autoComplete="email"
          inputMode="email"
        />
        {error("correo")}
      </div>
      <div className="campo">
        <label htmlFor="telefono">Teléfono</label>
        <input {...props("telefono")} type="tel" className="inp" placeholder="300 000 0000" maxLength={20} autoComplete="tel" />
        {error("telefono")}
      </div>
      <div className="campo">
        <label htmlFor="documento">Número de documento</label>
        <input {...props("documento")} className="inp" placeholder="1234567890" maxLength={20} autoComplete="off" />
        <span id="documento-ayuda" className="texto-gris">
          Con este número vuelves a entrar: es tu ID y tu contraseña.
        </span>
        {error("documento")}
      </div>
      <div className="campo">
        <label htmlFor="cv">Hoja de vida (PDF, máximo 4 MB)</label>
        <input {...props("cv")} type="file" accept="application/pdf,.pdf" className="inp inp-archivo" />
        {error("cv")}
      </div>

      <div className="nota nota-az nota-datos">
        <span>
          <b>Tus datos.</b> Responsable: <b>{empresa}</b>. Se usan solo para este proceso de selección. Una IA de un proveedor
          externo (Google) analiza tu hoja de vida y tus respuestas; la decisión de cada etapa la toma una persona, salvo el
          descarte por no cumplir un requisito mínimo. Puedes conocer, corregir o pedir que se borren tus datos.
        </span>
        <Link href="/privacidad" target="_blank" className="enlace-alto">
          Lee la política de tratamiento de datos (se abre en otra pestaña)
        </Link>
      </div>

      <div className="casilla">
        <input {...props("acepto_datos")} type="checkbox" />
        <label htmlFor="acepto_datos">{casillaDatos}</label>
        {error("acepto_datos")}
      </div>
      <div className="casilla">
        <input {...props("acepto_grabacion")} type="checkbox" />
        <label htmlFor="acepto_grabacion">{casillaGrabacion}</label>
        {error("acepto_grabacion")}
      </div>

      <button type="submit" className="btn btn-grande" disabled={enviando}>
        {enviando ? "Enviando tu postulación…" : "Postularme"}
      </button>
    </form>
  );
}
