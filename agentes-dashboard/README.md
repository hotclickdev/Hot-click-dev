# Dashboard de agentes de ingeniería (I1)

El registro **vive en el admin HotClick**: [`/admin/agentes`](https://hotclick.lat/admin/agentes) (React + Spring, rol ADMIN). Esta carpeta `agentes-dashboard/` es un **espejo opcional** (local o Vercel) del mismo catálogo I1; no es el producto que sirve Spring.

Rutas en el admin:

| Ruta | Qué muestra |
| --- | --- |
| `/admin/agentes` | Registro D1–D12, S1–S14, E1–E18, DOC1, SCALE1, I1 |
| `/admin/agentes/plan` | Resumen de olas 1–7 (qué hay en `master`) |
| `/admin/agentes/inspecciones` | Historial I1 + botón «Correr inspector I1» |
| `/admin/agentes/hallazgos` | Atajos a Issues (`eng-agent`, `flake`, `api-drift`, …) |

API (ADMIN): `GET /api/admin/agentes`, `POST /api/admin/agentes/inspecciones`. El JSON semilla está en `Hot_click_outlet/src/main/resources/agentes/` (copia de `data/` aquí).

## Espejo Next.js (opcional)

App Next.js **aparte** de Spring Boot. No vive en `Hot_click_outlet/src/main/resources/static/`. Útil en el PC o Vercel si no querés levantar el admin.

Rutas del espejo: `/agentes`, `/agentes/plan`, `/agentes/inspecciones`, `/agentes/hallazgos`.

## Local (espejo)

Requisito: Node 22+. Desde la raíz del clone:

```bash
cd agentes-dashboard
npm install
npm run dev
```

Abrí [http://localhost:43127/agentes](http://localhost:43127/agentes).

```bash
npm run inspect    # I1: escribe data/inspections.json y copia al classpath Spring
npm test           # node:test del inspector
npm run build      # chequeo de producción
```

`POST /api/inspect` (botón en el espejo) corre el mismo script en Node. En local tiene el árbol `.github/workflows` + `docs/`.

## Vercel (espejo durable)

1. [vercel.com/new](https://vercel.com/new) → importar `hotclickdev/Hot-click-dev`.
2. **Root Directory:** `agentes-dashboard` (no la raíz del monorepo).
3. Framework preset: Next.js. Build: `npm run build`. Output: default `.next`.
4. **No hace falta ningún secreto.** No pongas `ANTHROPIC_*`, Stripe, JWT ni DSN.
5. Dominio: el de Vercel, o un CNAME tipo `agentes.hotclick.lat` si más adelante lo apuntás.

Tras el deploy: `https://<proyecto>.vercel.app/agentes`.

En Vercel **no** está el repo completo (workflows/docs). `POST /api/inspect` responde 409 a propósito. La corrida durable es:

- local `npm run inspect` + commit del JSON, o
- GitHub Action `.github/workflows/inspect-agents.yml` (lunes 08:15 America/Costa_Rica) que actualiza el JSON (PR) y copia a `Hot_click_outlet/src/main/resources/agentes/` para el admin.

## I1 — qué marca

Para cada ID conocido el script busca el YAML en `.github/workflows/` y menciones en `docs/AGENTES_*.md`:

| Estado | Significado |
| --- | --- |
| `al_dia` | Doc + workflow + script; trigger coherente con la cadencia |
| `activar` | Hueco real (hoy: S13, no asignado en ninguna ola) |
| `actualizar` | El doc promete un workflow que no está, o al revés |
| `mejorar` | Corre, pero falta el script referido |

No toca schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG) ni lógica de pago/auth.
