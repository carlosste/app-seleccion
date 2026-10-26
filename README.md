# Selección de personal con IA

App web de marca blanca para que gestión humana filtre postulantes más rápido. La IA revisa requisitos mínimos, puntúa respuestas según la rúbrica de cada empresa y resalta evidencias. **La decisión final siempre es de una persona.**

Proyecto académico (Ingeniería de Sistemas, UCC Cali), pensado para escalar después.

## Estado actual: Fase 1 (interfaz)

- Las 9 pantallas del boceto, navegables, con **datos de prueba** en `lib/datos-prueba.ts`.
- Sin base de datos, sin IA y sin guardar nada: los formularios no envían datos.
- La grabación de voz es simulada (cronómetro, sin audio real).
- Botones con acción real: navegación entre pantallas y "Copiar link". El resto de botones (guardar, decidir, agregar) son visuales.

## Acceso de empresas

- Registro: `/empresa/registro` · Ingreso: `/empresa/ingreso` · Panel: `/gestion` (protegido).
- Configura `.env.local` a partir de `.env.example` y aplica la migración
  `supabase/migrations/20261026130000_registro_empresas.sql`.
- En desarrollo, sin `RESEND_API_KEY`, el enlace de confirmación se imprime en la consola del servidor.
- En Supabase → Authentication: deja activado "Confirm email" y, si quieres sesiones más cortas, baja el
  "JWT expiry" (por defecto 3600 s).

## Stack

- Next.js 16 (App Router) + TypeScript
- CSS propio (paleta #2457C5, fondo #F6F7F9, fuente Inter)
- Próximas fases: Supabase (base de datos, autenticación y archivos), Gemini API (solo en el servidor) y despliegue en Vercel

## Cómo correrla

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>. Rutas principales:

- Postulante: `/postular/analista-soporte` (y los pasos `/ingreso`, `/preguntas`, `/terminado`)
- Gestión humana: `/gestion`

Para probar la versión de producción:

```bash
npm run build
npm run start
```

## Reglas del producto (no negociables)

- La IA **sí** extrae datos del CV, aplica requisitos mínimos, transcribe audio, puntúa con la rúbrica citando evidencia y ordena por ajuste al cargo.
- La IA **no** elige "al mejor", no toma la decisión final, no descarta en etapas de preguntas y no evalúa edad, género, acento, tono de voz ni rasgos personales.
- Solo se filtra por edad mínima. Nunca por edad máxima, género o estado civil.
- Las primeras etapas son a ciegas ("Candidato #014"). El nombre se revela en la entrevista final.
- Grabación solo con consentimiento (Ley 1581 de 2012).
