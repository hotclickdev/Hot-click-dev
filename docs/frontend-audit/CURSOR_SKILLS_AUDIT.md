# CURSOR SKILLS / RULES AUDIT — HOTCLICK Frontend

**Fecha:** 2026-09-03  
**Paso:** 2A — Solo investigación y documentación.  
**Alcance:** Capacidades Agent Skills, Rules, MCP, scripts y workflows disponibles para mejorar frontend seller (Emprendedor / PYME / Negocio Plus).  
**Prohibido en este paso:** crear skills/rules, tocar código de la app, instalar deps, commit.

Complementa: [`FRONTEND_AUDIT.md`](./FRONTEND_AUDIT.md).

---

## 1. Skills existentes

### 1.1 Skills Cursor del proyecto (`.cursor/skills/`)

| Estado | Detalle |
|--------|---------|
| **Ninguna** | No existe el directorio `.cursor/skills/` en el repo. |

### 1.2 Skills Claude en el repo (versionadas)

| Nombre | Ubicación | Propósito | Cuándo se utiliza | Relevante HotClick FE | Reutilizar | Modificar | Crear nueva |
|--------|-----------|-----------|-------------------|----------------------|------------|-----------|-------------|
| `frontend-design` | [`.claude/skills/frontend-design/SKILL.md`](../../.claude/skills/frontend-design/SKILL.md) | UI distintiva anti–AI-slop (tipografía, motion, atmósfera) | Build/styling de páginas o componentes web | Parcial — útil creativo; **puede chocar** con tokens HotClick (Sora/Public Sans) y con user rules de brand | Sí, con cuidado | Ajustar description/constraints para “respetar `hotclick-tokens` + seller shell” | No duplicar |
| `codigo-limpio-sonar` | [`.claude/skills/codigo-limpio-sonar/SKILL.md`](../../.claude/skills/codigo-limpio-sonar/SKILL.md) | Orquesta 4 reglas + Sonar sin pises | Limpieza + quality gate en mismo archivo | Sí (FE+BE) | Sí | No (salvo sync con rules) | No |
| `campana-limpio-sonar` | [`.claude/skills/campana-limpio-sonar/SKILL.md`](../../.claude/skills/campana-limpio-sonar/SKILL.md) | Campaña loteada de limpio+Sonar en todo el repo | Olas de deuda / boy scout masivo | Sí | Sí | No ahora | No |
| `sonar-prevenir` | [`.claude/skills/sonar-prevenir/SKILL.md`](../../.claude/skills/sonar-prevenir/SKILL.md) | Evitar issues que ya tumbaron el gate | Antes de PR / implementar | Sí | Sí | No | No |
| `sonar-revisar` | [`.claude/skills/sonar-revisar/SKILL.md`](../../.claude/skills/sonar-revisar/SKILL.md) | Revisar informe SonarCloud | Post-análisis / dashboard | Sí | Sí | No | No |
| `supabase` | [`Hot_click_outlet/.claude/skills/supabase/SKILL.md`](../../Hot_click_outlet/.claude/skills/supabase/SKILL.md) | Uso de Supabase | DB/auth Supabase | Bajo para UI seller | Sí (backend/data) | No | No |
| `supabase-postgres-best-practices` | [`Hot_click_outlet/.claude/skills/supabase-postgres-best-practices/`](../../Hot_click_outlet/.claude/skills/supabase-postgres-best-practices/) | Best practices Postgres/PgBouncer | Queries, locks, índices | Bajo para UI | Sí | No | No |
| `visibilidad-catalogo-marketplace` | [`Hot_click_outlet/.claude/skills/visibilidad-catalogo-marketplace/SKILL.md`](../../Hot_click_outlet/.claude/skills/visibilidad-catalogo-marketplace/SKILL.md) | No ocultar productos de empresas aprobadas en `/productos` | Catálogo público / flags visibilidad | Marketplace, no shell seller | Sí cuando toque catálogo | No | No |

### 1.3 Skills personales (`~/.claude/skills/`) — relevantes a frontend

Estas viven en la máquina de Andres (no en el repo). El agente Cursor las lista si están en el catálogo de la sesión.

| Nombre | Propósito | Cuándo | Relevante seller FE | Acción |
|--------|-----------|--------|---------------------|--------|
| `componentes-react-hotclick` | Patrones React HotClick (páginas, íconos, loading/error, responsive) | Crear/modificar componentes/páginas | **Alta** | **Reutilizar**; no duplicar en proyecto |
| `frontend-ui-engineering` | UI production-quality, a11y, design system adherence | Cualquier UI user-facing | Alta | Reutilizar |
| `mockup-a-react` | Mockup/Figma → React fiel, sin libertades | Diseño aprobado | Alta (Figma seller) | Reutilizar |
| `accesibilidad-basica` | Contraste, teclado, labels, roles | Formularios / UI custom | Alta | Reutilizar; no skill a11y nueva |
| `performance-frontend` | Bundle, splitting, CWV, móvil | Lento / Lighthouse | Alta | Reutilizar; no skill perf nueva |
| `tests-e2e-playwright` | E2E Playwright, selectores, flakiness | Flujos browser | Alta | Reutilizar + skill QA seller liviana en repo |
| `tests-react` | Unit/component React | Vitest/RTL | Media | Reutilizar |
| `stores-zustand` | Cuándo/cómo Zustand | Estado global | Alta | Reutilizar |
| `servicios-api-frontend` | Axios, JWT, 401, capa services | Nueva API desde React | Alta | Reutilizar |
| `browser-testing-with-devtools` | Chrome DevTools MCP (DOM/network/perf) | Debug visual runtime | Alta si MCP configurado | Reutilizar |
| `pwa-instalable` | Manifest, SW, installability | PWA / “app en teléfono” | Alta (prod vs local) | Reutilizar al tocar SW |
| `manejo-de-errores-consistente` | Errores visibles consistentes | Catch/toast/inline | Alta (gap audit) | Reutilizar |
| `separacion-de-capas` / `estructura-de-carpetas` | Capas y carpetas | Arquitectura | Alta | Reutilizar |
| `fable-explorar` / `fable-planificar` / `fable-implementar` / `fable-verificar` / `fable-entregar` / `fable-flujo-trabajo` / `fable-depurar` | Workflow por fases | Features multi-archivo | Alta (proceso) | Reutilizar |
| `find-skills` / `using-agent-skills` | Descubrir/invocar skills | Meta | Sí | Reutilizar |
| `pagos-stripe`, `recuperacion-carritos-y-marketing`, `busqueda-de-productos`, `precios-promociones-margenes` | Ecommerce dominio | Marketplace/checkout | Media (fuera foco seller shell) | Reutilizar solo si toca ese dominio |
| Backend/infra skills (deploy, AWS, auth-jwt, etc.) | Ops/BE | Fuera FE UX | Baja para este paso | No crear equivalentes FE |

### 1.4 Skills built-in Cursor (`~/.cursor/skills-cursor/`)

**No editar** (reservado por Cursor).

| Nombre | Propósito | Uso en este trabajo FE |
|--------|-----------|------------------------|
| `create-skill` / `create-rule` / `create-hook` | Authoring Cursor | Paso 2B+ al crear artefactos |
| `canvas` | Artefactos analíticos vivos | Auditorías cuantitativas |
| `review-bugbot` / `review-security` | Reviews bajo pedido explícito | Post-PR seller |
| `automate` / `autopilot` / `loop` | Automatizaciones / loops | Opcional QA recurrente |
| `shell` / `sdk` / `split-to-prs` / etc. | Utilidades producto Cursor | Según tarea |

---

## 2. Rules existentes

### 2.1 Rules Cursor del proyecto

| Nombre | Ubicación | Propósito | Cuándo | Relevante | Reutilizar | Modificar | Crear |
|--------|-----------|-----------|--------|-----------|------------|-----------|-------|
| `codigo-limpio` | [`.cursor/rules/codigo-limpio.mdc`](../../.cursor/rules/codigo-limpio.mdc) | Funciones chicas, capas (services/no axios en page), TS sin `any`, errores visibles, refactor bit-idéntico en pago/auth/POS/wizard, Sonar protocol | `alwaysApply: true` en todo el repo | **Crítica** | Sí | Solo si hace falta sync con seller (no en 2A) | — |

**No hay** otras `.mdc` bajo `.cursor/rules/`.

### 2.2 Instructions / docs de agente

| Artefacto | Ubicación | Propósito | Acción |
|-----------|-----------|-----------|--------|
| `CLAUDE.md` | [raíz](../../CLAUDE.md) | Comandos Maven/pnpm, arquitectura, secretos, deploy, constraints PgBouncer | Reutilizar; no reemplazar con skill |
| `AGENTS.md` | — | **No existe** | Opcional futuro; no bloqueante |
| User rules (Cursor) | Settings del usuario | Git/PR protocol, frontend design hard rules (brand, hero, anti purple/cream), comunicación | Ya activas; no versionar aquí |
| `docs/frontend-audit/FRONTEND_AUDIT.md` | [docs](./FRONTEND_AUDIT.md) | Mapa seller + P0–P3 + roadmap | Fuente de verdad para crear rules/skills 2B |

### 2.3 Diferencia Rule vs Skill (criterio usado)

| | **Rule** | **Skill** |
|--|----------|-----------|
| Aplicación | Automática (always / globs) | Bajo demanda / descripción gatillo |
| Contenido ideal | Constraints cortas, always-true | Procedimientos, checklists, “cómo” |
| Seller | Tokens, capas, no double EntradaPagina | Cómo armar wizard motion / QA Playwright |

---

## 3. Tools disponibles

### 3.1 MCP / namespaces (sesión Cursor típica)

| Tool / namespace | Uso frontend |
|-----------------|--------------|
| `cursor-ide-browser` | Navegar, snapshot, click, screenshot seller routes |
| `plugin-figma-figma` | Design ↔ code (get_design_context, use_figma, etc.) |
| `user-sentry` | Issues/errores prod |
| `cursor-app-control` | Workspace/root, dialogs |
| `cursor` (CreateGoal, GenerateImage, UpdateGoal) | Goals / assets |
| Chrome DevTools MCP | Si configurado — vía skill `browser-testing-with-devtools` |

### 3.2 Task subagents

`explore`, `generalPurpose`, `shell`, `ci-investigator`, `bugbot`, `security-review`, `best-of-n-runner`, `cursor-guide`.

### 3.3 Scripts frontend (`Hot_click_outlet/frontend/package.json`)

| Script | Comando | Notas |
|--------|---------|-------|
| Dev | `pnpm dev` | Vite :3000; **SW off** |
| Build | `pnpm build` | **Incluye typecheck** + vite → `static/` |
| Typecheck | `pnpm typecheck` | `tsc` app + node + e2e |
| Lint | `pnpm lint` / `lint:ci` | ESLint; CI scope reducido |
| Unit | `pnpm test` | Vitest |
| E2E | `pnpm test:e2e` | Playwright full |
| E2E smoke | `pnpm test:e2e:smoke` | smoke.spec |
| E2E CI | `pnpm test:e2e:ci` | Solo POS + descubri — **sin seller** |

### 3.4 Browser / QA reality

- Playwright seller specs existen (`seller-wizard*`, `emprendedor-wizard*`, sidebars) pero **no** están en `test:e2e:ci`.
- Browser MCP puede fallar (tabs/auth vacíos) — documentado en audit FE.
- Reduced motion del OS apaga Framer springs → QA debe chequear Windows Animation effects.

---

## 4. Skills recomendadas (proyecto)

**No crear 9 skills.** Target: **2 skills** en `.cursor/skills/` + reutilizar personales/repo.

| Skill propuesta | Contenido esencial | Cubre candidatas | Por qué skill (no rule) |
|-----------------|--------------------|------------------|-------------------------|
| **`hotclick-seller-ux`** | Capas A/B/C; `FormularioPorPasos`; tokens `formularioMotionTokens`; primitivas EntradaPagina / PasoAnimado / ListaStagger / CampoAnimado / TarjetaOpcion / PantallaExito; anti double Entrada; anti pelea Tailwind↔Framer; estados idle→error; rutas `/emprendedor|/pyme|/negocio-plus` | architecture (parcial) + ux-ui + motion | Procedimiento + checklist al implementar pantallas |
| **`hotclick-seller-qa`** | Rutas correctas (no `/productos` marketplace); Playwright seller; viewport 390; reduced-motion; hard refresh / SW; checklist visual post-deploy | hotclick-qa | Workflow de verificación |

**Architecture “pura”:** preferir **rule** `seller-prototipo` (paths, services, no forks nuevos) + sección corta en `hotclick-seller-ux`. Evita skill architecture separada si la rule ya fuerza wiring.

---

## 5. Rules recomendadas (proyecto)

| Rule propuesta | Globs sugeridos | Contenido | Sustituye candidata |
|----------------|-----------------|-----------|---------------------|
| **`codigo-limpio.mdc`** | (existente, always) | Mantener | — |
| **`seller-prototipo.mdc`** | `**/prototipo/**` | Prefijos plan; Emprendedor `/opciones/*` vs flat PYME/Plus; pages → services; no axios; preferir `compartido/` sobre fork emp; POS → `/admin/pos` | hotclick-frontend-architecture |
| **`hotclick-design-tokens.mdc`** | `**/prototipo/**`, `**/styles/hotclick-tokens.css` | Usar `hc-*` / tokens; `Boton`/`Campo` compartidos; **no** nuevos `BotonPrimario`/`CampoTexto`; safe-area + bottom nav tipografía; sin purple/cream AI defaults en seller | design-system + responsive |

Opcional (si se hincha design-tokens): rule `seller-a11y-checklist.mdc` con Escape/focus-trap en modales seller — o dejar en skill UX + `accesibilidad-basica`.

---

## 6. Skills que NO necesitamos (ahora)

| Candidata original | Veredicto | Motivo |
|--------------------|-----------|--------|
| `hotclick-frontend-architecture` como skill | **Innecesaria como skill** | Mejor como **rule** `seller-prototipo` |
| `hotclick-design-system` como skill | **Innecesaria como skill** | Mejor como **rule** tokens |
| `hotclick-motion` separada | **Fusionar** en `hotclick-seller-ux` | Un solo gatillo “wizard/motion seller” |
| `hotclick-ux-ui` separada | **Fusionar** en `hotclick-seller-ux` | Evita solape |
| `hotclick-responsive` | **No skill** | Sección en rule design-tokens |
| `hotclick-accessibility` | **No crear** | Ya existe `accesibilidad-basica` |
| `hotclick-performance` | **No crear** | Ya existe `performance-frontend` + `pwa-instalable` |
| `hotclick-ecommerce` | **No ahora** | Foco seller shell; marketplace tiene skills dominio personales + `visibilidad-catalogo` |
| Duplicar `frontend-design` en `.cursor/skills` | **No aún** | Ya en `.claude/skills`; ajustar constraints antes de copiar |
| Duplicar `componentes-react-hotclick` en repo | **No** | Personal y suficiente; si el equipo lo necesita → copiar **una** vez al repo, no reinventar |

---

## 7. Estructura propuesta

**NO crear estos archivos en el Paso 2A.** Solo propuesta.

```text
.cursor/
├── rules/
│   ├── codigo-limpio.mdc              # EXISTE — alwaysApply
│   ├── seller-prototipo.mdc           # NUEVA (Paso 2B)
│   └── hotclick-design-tokens.mdc     # NUEVA (Paso 2B) — tokens + responsive seller
└── skills/
    ├── hotclick-seller-ux/
    │   ├── SKILL.md                   # motion + formularios + capas A/B/C
    │   └── reference.md               # opcional: mapa primitivas + anti-patrones
    └── hotclick-seller-qa/
        └── SKILL.md                   # Playwright seller + SW + reduced-motion
```

### Qué debería contener cada uno

#### `seller-prototipo.mdc` (Rule)
- Rutas y gates (`PlanPathGate`, prefijos).
- Capas: page → `services/` → API; stores sin HTTP.
- Emprendedor nested `/opciones/*` vs PYME/Plus flat.
- Preferir wrappers thin a `compartido/` frente a forks.
- Fuera de alcance: POS/login (redirects).

#### `hotclick-design-tokens.mdc` (Rule)
- `hotclick-tokens.css`, tipografía Sora/Public Sans.
- Primitivos: `compartido/ui.tsx` (`Boton`, `Campo`, `Chip`).
- Prohibido introducir nuevos controles del kit emp paralelo.
- Responsive: `md` breakpoint, `max-w-md`, safe-area bottom nav, labels legibles.
- Alinear con user rules anti–AI-slop **sin** romper brand HotClick.

#### `hotclick-seller-ux/SKILL.md` (Skill)
- Cuándo: wizards, listados Capa C, cobro, equipo, sucursales, producto.
- Tokens numéricos actuales (0.42s, 48px, springs, stagger 0.09).
- Checklist: EntradaPagina una sola; PantallaExito al finish; CampoAnimado; reduced-motion.
- Anti-patrones: Tailwind `-translate` + Framer en el mismo nodo; navigate sin éxito; layoutId inventado.

#### `hotclick-seller-qa/SKILL.md` (Skill)
- Verificar en `/emprendedor|/pyme|/negocio-plus`, no marketplace.
- Comandos: `pnpm typecheck`, `pnpm test`, Playwright seller specs.
- Hard refresh post-deploy; SW silent reload risk.
- Nota: incluir seller en CI es mejora futura (no implementar en 2A).

### Relación con `.claude/skills/`

Mantener Sonar/campaña/frontend-design en `.claude/skills/` (ya versionados). No migrar a `.cursor/skills/` en bloque. Cursor Agent ya puede leer ambos según configuración de la sesión.

---

## 8. Orden recomendado de creación (Paso 2B+)

| Orden | Artefacto | Tipo | Por qué primero |
|-------|-----------|------|-----------------|
| 1 | `seller-prototipo.mdc` | Rule | Evita wiring/rutas/forks incorrectos en cualquier cambio seller |
| 2 | `hotclick-design-tokens.mdc` | Rule | Evita segundo kit UI y estilos genéricos |
| 3 | `hotclick-seller-ux` | Skill | Guía implementación motion/UX del roadmap FE audit |
| 4 | `hotclick-seller-qa` | Skill | Cierra el loop verificación (Playwright + prod SW) |
| 5 | Ajuste description de `frontend-design` (repo) | Skill Claude existente | Reducir choque con tokens HotClick |
| 6 | (Opcional) Ampliar `test:e2e:ci` con seller | Código — **otro paso** | No es skill; es CI |

**No implementar nada de esta tabla en el Paso 2A.**

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Hay skills Cursor en el proyecto? | **No** |
| ¿Hay rules Cursor? | **Sí — solo** `codigo-limpio` |
| ¿Hay skills útiles ya? | **Sí** — personales (React/a11y/perf/Playwright) + repo (Sonar, frontend-design, catálogo) |
| ¿Necesitamos 9 skills HotClick? | **No** — 2 skills + 2 rules nuevas |
| ¿Próximo paso? | Paso 2B: crear rules/skills en el orden de la §8 (aprobación explícita) |

---

*Fin CURSOR_SKILLS_AUDIT.md — Paso 2A. Cero cambios de aplicación.*
