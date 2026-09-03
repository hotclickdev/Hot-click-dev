---
name: hotclick-seller-qa
description: >
  QA post-cambio del frontend seller HotClick (/emprendedor|/pyme|/negocio-plus).
  Usar tras modificar pantallas, wizards, formularios, motion, responsive,
  estados UI, gates/planes o compartido seller. Verificación typecheck/lint/
  vitest/Playwright seller + checklist multi-plan.
---

# HotClick Seller QA

Guía especializada para **verificar** cambios en el frontend seller.

**Rutas:** `/emprendedor` · `/pyme` · `/negocio-plus`  
**Código:** `Hot_click_outlet/frontend/src/prototipo/`  
**Cwd de comandos:** `Hot_click_outlet/frontend`

Complementa (no duplica):

| Artefacto | Rol |
|-----------|-----|
| `.cursor/rules/seller-prototipo.mdc` | Rutas, capas, reutilización |
| `.cursor/rules/hotclick-design-tokens.mdc` | Tokens / UI / anti AI-slop |
| `.cursor/skills/hotclick-seller-ux/SKILL.md` | **Cómo** diseñar/implementar UX |
| Esta skill | **Cómo** validar que el cambio no rompe |

Otras skills personales (coordinar, no copiar): `tests-e2e-playwright`, `accesibilidad-basica`, `performance-frontend`, `pwa-instalable`.

---

## 1. Cuándo usar esta skill

Activar cuando la tarea involucre modificar o crear:

- pantallas / componentes / navegación seller
- formularios, wizards, motion
- Productos, Pedidos, Cobro, Perfil, Bodegas, Equipo, Sucursales, Plan, Ayuda
- responsive, estados loading/error/success/empty
- permisos o gates por plan
- componentes compartidos seller (`prototipo/compartido/`)

---

## 2. Regla fundamental

Después de cualquier modificación seller:

1. verificar TypeScript  
2. verificar lint  
3. ejecutar los tests **relevantes**  
4. verificar rutas  
5. verificar responsive  
6. verificar estados de UI  
7. verificar accesibilidad  
8. verificar permisos por plan  
9. verificar regresiones entre planes  
10. verificar que no exista duplicación innecesaria  

No declarar la tarea completada solo porque “compila”.

---

## 3. Validación técnica (comandos reales)

Usar **solo** scripts de `package.json` (o Playwright apuntando a specs existentes). No inventar scripts.

| Comando | Qué es | Cuándo en seller |
|---------|--------|------------------|
| `pnpm typecheck` | `tsc` app + node + e2e | Siempre tras cambio TS/TSX |
| `pnpm lint` | `eslint .` | Tras cambio en `src/` seller |
| `pnpm lint:ci` | Subset analytics/App — **no cubre prototipo** | **No** usarlo como gate seller |
| `pnpm test` | Vitest | Si tocó helpers/tokens/unit tests |
| `pnpm test:e2e` | Playwright suite completa | Solo si el alcance lo exige |
| `pnpm test:e2e:smoke` | `tests/smoke.spec.ts` | Smoke genérico de app |
| `pnpm test:e2e:ci` | POS + descubri **sin seller** | **No** afirmar cobertura seller |
| `pnpm build` | typecheck + vite → `static/` | Antes de deploy / si el cambio debe verse en prod |

### Matriz sugerida (no ejecutar todo a ciegas)

| Cambio | Mínimo |
|--------|--------|
| Copy / estilo local en una page | `typecheck` + checklist manual |
| Wizard / `FormularioPorPasos` / producto | `typecheck` + `lint` + E2E wizard del plan tocado |
| `compartido/motion` o tokens motion | `typecheck` + `pnpm test` (unit tokens) + E2E seller-wizard* |
| Equipo (PYME) | `typecheck` + checklist + E2E PYME si existe cobertura |
| Sucursales (Plus) | `typecheck` + checklist + E2E Plus si existe cobertura |
| Shell / sidebar / gates | `typecheck` + `seller-sidebar` / `emprendedor-sidebar` |
| Shared page usada por 2–3 planes | E2E/checklist en **cada** plan afectado |

### E2E seller existentes (ejecución selectiva)

No hay script npm dedicado. Ejemplo:

```bash
pnpm exec playwright test tests/seller-wizard.spec.ts
pnpm exec playwright test tests/seller-wizard-errors.spec.ts
pnpm exec playwright test tests/seller-sidebar.spec.ts
pnpm exec playwright test tests/emprendedor-wizard.spec.ts
pnpm exec playwright test tests/emprendedor-sidebar.spec.ts
```

Helpers: `tests/seller-wizard-helpers.ts` (auth mock, prefijos PYME/Plus, viewport móvil en wizards).

**Playwright config:** Chromium Desktop por defecto; helpers seller fijan ~390×844 donde aplica; `baseURL` `http://127.0.0.1:3000` (o `PLAYWRIGHT_BASE_URL`).

Al final del trabajo: listar comandos ejecutados y resultado. Si falla: causa, ¿introducido vs preexistente?, no ocultar, no decir “todo OK”.

---

## 4. Validación de rutas

Comprobar según el cambio:

- `/emprendedor`, `/pyme`, `/negocio-plus` siguen resolviendo
- Emprendedor: `/emprendedor/opciones/*` (estructura anidada)
- PYME/Plus: `SellerRoutes` + `SellerShell` (paths planos)
- `PlanPathGate`, `FigmaSellerGate`, `planPaths`
- POS seller → redirect `/admin/pos`

No modificar rutas solo para hacer pasar una prueba. Marketplace `/productos` ≠ `/{plan}/productos`.

---

## 5. Validación multi-plan

Si la funcionalidad existe en más de un plan, comparar Emprendedor / PYME / Negocio Plus:

- misma intención UX
- comportamiento coherente
- permisos correctos
- capacidades específicas del plan
- sin duplicación accidental de páginas

Especial atención: Productos, Pedidos, Bodegas, Plan, **Equipo (solo PYME)**, **Sucursales (solo Negocio Plus)**.

No asumir que lo de un plan debe existir en los demás.

---

## 6. Validación de UI states

Operaciones async: `idle` · `loading` · `success` · `error` · `empty`.

Comprobar: loading visible; skeleton si aplica; no empty falso durante carga; error comprensible + recuperación; success; empty accionable. No depender solo de Toast.

(Criterios de diseño: skill `hotclick-seller-ux`.)

---

## 7. Formularios y wizards

Formularios: labels, required, validación, errores, loading, anti doble-submit, CTA, recuperación.

Wizards: progreso, navegación, datos entre pasos, anti doble-submit, envío, éxito, volver. Si existe `FormularioPorPasos`, no aceptar otro sistema paralelo sin justificación.

---

## 8. Accesibilidad

Checklist mínimo: teclado, focus-visible, labels, botones semánticos, headings, aria solo si hace falta, contraste, no color-only, Escape + focus en modales, targets táctiles.

**Hecho del repo:** no hay suite axe dedicada al seller. `idioma.spec.ts` cubre panel a11y del marketplace, no el shell seller. Usar checklist + skill `accesibilidad-basica`. No crear infraestructura a11y nueva en un PR de QA.

---

## 9. Responsive

Mínimo: **390px** y desktop. Revisar: bottom nav, safe-area, sticky CTA, overflow-x, listas, forms, modales, textos largos, targets.

Usable ≠ “no hay scrollbar”. Sidebars seller: specs `*-sidebar.spec.ts` en desktop; wizards suelen mockear móvil vía helpers.

---

## 10. Motion

- Primitives en `prototipo/compartido/motion/`
- Una sola `EntradaPagina` por nivel
- No Tailwind transform + Framer en el mismo nodo
- `prefers-reduced-motion` / `useReducedMotion`
- Motion no bloquea ni es solo decoración

Implementación detallada → `hotclick-seller-ux`.

---

## 11. Regresión visual y funcional

Si toca `compartido/`, asumir impacto Emprendedor + PYME + Plus. Revisar pantallas similares y navegación. No tratar un shared change como “local”.

---

## 12. Tests E2E

Antes de crear un test nuevo: buscar equivalente, reutilizar helpers, seguir convenciones, evitar duplicar.

Priorizar cobertura de: navegación, CRUD, forms, wizard, permisos, errores, responsive si ya hay patrón.

Selectores: roles, labels, texto significativo, atributos estables. Evitar clases Tailwind generadas.

Convenciones Playwright del equipo → skill `tests-e2e-playwright` (no duplicar aquí).

---

## 13. Clasificación de riesgos

| Nivel | Ejemplos | Validación |
|-------|----------|------------|
| **P0** | auth, routing, permisos, pérdida datos, cobro crítico, app rota | typecheck + lint + E2E afectados + checklist rutas/planes |
| **P1** | producto CRUD, pedidos, bodegas, equipo, sucursales, forms clave | typecheck + lint + E2E wizard/sidebar relevante |
| **P2** | visual, responsive, motion, empty, feedback | typecheck + checklist + unit motion si aplica |
| **P3** | copy, microinteracciones | typecheck + smoke visual rápido |

A mayor riesgo, mayor profundidad.

---

## 14. Smoke test mínimo

Cuando corresponda:

- app inicia (`pnpm dev` / Playwright webServer)
- acceso al área seller del plan
- nav principal
- rutas sin error obvio
- acción principal de la pantalla
- consola sin errores graves
- responsive básico 390 / desktop

Opcional: `pnpm test:e2e:smoke` (smoke global, no seller-específico).

---

## 15. Definition of Done

Una tarea seller **no** está terminada hasta:

- [ ] TypeScript correcto (`pnpm typecheck`)
- [ ] lint correcto (`pnpm lint`) — o N/A justificado
- [ ] tests relevantes ejecutados (listar cuáles)
- [ ] rutas verificadas
- [ ] responsive verificado
- [ ] loading / error / success / empty según aplique
- [ ] accesibilidad revisada (checklist)
- [ ] permisos por plan revisados
- [ ] impacto multi-plan revisado
- [ ] motion revisado si aplica
- [ ] sin duplicación innecesaria
- [ ] sin cambios fuera de alcance

Si algo no aplica, **indicarlo explícitamente**.

---

## 16. Reporte final obligatorio

```markdown
### Cambios
…

### Validaciones
Comandos/tests y resultado

### Resultado
PASS | FAIL | PARTIAL

### Riesgos
Pendientes / revisar

### Archivos afectados
…
```

No decir solo “todo correcto”.

---

## 17. Principio final

QA evita regresiones: una mejora UX no debe romper funcionalidad, navegación, a11y, responsive, permisos, otros planes ni compartidos.

Prioridad:

```text
UX correcta > funcionalidad > accesibilidad > consistencia > responsive > tests > performance > motion
```
