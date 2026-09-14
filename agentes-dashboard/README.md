# Dashboard de agentes de ingeniería (I1)

> **Pausado — reorganización (2026-09-14).** Catálogo de solo lectura. Los workflows de agentes no disparan; ver [`docs/AGENTES_DISABLED.md`](../docs/AGENTES_DISABLED.md).

App Next.js **aparte** de Spring Boot. No vive en `Hot_click_outlet/src/main/resources/static/`. Andrés la abre en el PC (local) o en Vercel para siempre; no depende de un preview efímero de una VM de Cursor.

Rutas (UI en español):

| Ruta | Qué muestra |
| --- | --- |
| `/agentes` | Registro D1–D12, S1–S14, E1–E18, DOC1, SCALE1, I1 |
| `/agentes/plan` | Resumen de olas 1–7 (qué hay en `master`) |
| `/agentes/inspecciones` | Historial I1 (`data/inspections.json`) |
| `/agentes/hallazgos` | Atajos a Issues (`eng-agent`, `flake`, `api-drift`, …) |

## Local

Requisito: Node 22+. Desde la raíz del clone:

```bash
cd agentes-dashboard
npm install
npm run dev
```

Abrí [http://localhost:43127/agentes](http://localhost:43127/agentes).

```bash
npm run inspect    # I1: escribe data/inspections.json
npm test           # node:test del inspector
npm run build      # chequeo de producción
```

`POST /api/inspect` (botón en `/agentes/inspecciones`) corre el mismo script en Node. En local tiene el árbol `.github/workflows` + `docs/`.

## Vercel (durable)

1. [vercel.com/new](https://vercel.com/new) → importar `hotclickdev/Hot-click-dev`.
2. **Root Directory:** `agentes-dashboard` (no la raíz del monorepo).
3. Framework preset: Next.js. Build: `npm run build`. Output: default `.next`.
4. **No hace falta ningún secreto.** No pongas `ANTHROPIC_*`, Stripe, JWT ni DSN.
5. Dominio: el de Vercel, o un CNAME tipo `agentes.hotclick.lat` si más adelante lo apuntás.

Tras el deploy: `https://<proyecto>.vercel.app/agentes`.

En Vercel **no** está el repo completo (workflows/docs). `POST /api/inspect` responde 409 a propósito. La corrida durable es:

- local `npm run inspect` + commit del JSON, o
- GitHub Action `.github/workflows/inspect-agents.yml` (lunes 08:15 America/Costa_Rica) que actualiza el JSON (PR) y, si no hay permisos de push, sube artifact + Issue.

Si conectás Vercel a `master`, cada merge del PR de I1 redespliega el historial.

## I1 — qué marca

Para cada ID conocido el script busca el YAML en `.github/workflows/` y menciones en `docs/AGENTES_*.md`:

| Estado | Significado |
| --- | --- |
| `al_dia` | Doc + workflow + script; trigger coherente con la cadencia |
| `activar` | Hueco real (hoy: S13, no asignado en ninguna ola) |
| `actualizar` | El doc promete un workflow que no está, o al revés |
| `mejorar` | Corre, pero falta el script referido |

No toca schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG) ni lógica de pago/auth.

## No servir desde Spring

Docker / `pnpm build` del frontend de la tienda **no** empaquetan este dashboard. Si algún día se quisiera servir en `:8080/agentes`, habría que copiar el `next build` a static o un reverse proxy — hoy no está hecho; usá Vercel o `npm run dev`.
