# Anexo 1 — Sistema visual

**Alcance:** READ-ONLY. Evidencia en `Hot_click_outlet/frontend/src`.  
**Documento padre:** [../visual-ux-audit.md](../visual-ux-audit.md)

---

## 1. Qué existe (tokens canónicos)

Fuente principal: [`styles/hotclick-tokens.css`](../../frontend/src/styles/hotclick-tokens.css) (Brand Book v1.1) + bridge Tailwind v4 `@theme` en [`index.css`](../../frontend/src/index.css).

| Capa | Definido | Valor / notas |
|------|----------|---------------|
| Rojo Hot (primario) | `--hc-red-500` | `#E73B33` |
| Azul Click (secundario / link) | `--hc-blue-600` | `#1747A8` |
| Neutros | `--hc-n-0` … `--hc-n-950` | Escala completa |
| Semánticos | success / warning / danger / info | + variantes `-bg` |
| Tipografía | Sora (display), Public Sans (text), IBM Plex Mono | `--hc-font-*` |
| Radios | 6 / 10 / 16 / 24 / 999px | `--hc-r-sm` … `--hc-r-full` |
| Sombras | 3 niveles + CTA | `--hc-shadow-1..3`, `--hc-shadow-cta` |
| Espaciado | base 4px (`--hc-sp-1` … `--hc-sp-24`) | **No cableado a `@theme`** — se usa Tailwind default o px ad-hoc |
| Overlays | `--hc-overlay`, `--hc-overlay-soft` | Modal usa rgba hardcodeado en vez del token |
| Motion CSS | `--hc-ease`, duraciones | Kit Framer seller en `formularioMotionTokens.ts` (paralelo) |

### Temas por zona (paletas divergentes intencionales)

| Clase | Uso | Efecto |
|-------|-----|--------|
| `.hc-superadmin-theme` | Admin IT | Fondo blanco, primario `#E31E24` |
| `.hc-sistema-theme` | Escape admin vendedor | Fondo crema `#ede5da`, bordes cálidos |
| `.hc-seller-theme` | Shells Figma vendedor | Rebind `--color-hc-*` |
| `.hc-tenant-theme` | `/tienda/:slug` | Variables `--t-*` por tenant |
| `html.dark` / `[data-theme="dark"]` | A11y panel / preferencia | Overrides |

---

## 2. Tokens rotos o inconsistentes

| Hecho observado | Evidencia | Problema | Impacto |
|-----------------|-----------|----------|---------|
| `--hc-card` se usa y **nunca se define** | `securityUi.tsx`, `AdminCotizaciones.tsx`, `nueva-cotizacion/SectionCard.tsx` | Fondo de card transparente / incorrecto | UI rota en security y cotizaciones |
| `bg-[var(--color-accent)]` | `PayoutModal.tsx`, `AdminBilletera.tsx` | `@theme` define `--color-hc-accent`, no `--color-accent` | Color inválido |
| CTA primario rojo vs azul | `.hc-btn-primary` → rojo; `cfg-btn-primary` → `var(--hc-accent)` azul | Misma acción “guardar/primario” cambia de color según pantalla | Confusión de marca |
| Ghost vs outline invertidos | `Button.tsx` mapea `secondary`→outline, `ghost`→ghost; comentarios CSS dicen lo opuesto | API de variantes engañosa | Bugs de estilo al reutilizar |
| Mono stack distinto | tokens: IBM Plex Mono; `configUi.tsx`: JetBrains/Fira | Tipografía inconsistente en config | Detalle visual |
| Radio 14px hardcodeado | `ui.tsx` Boton, `AdminUi.tsx` | Fuera de escala 6/10/16/24 | Inconsistencia de “familia visual” |
| Overlay modal | `Modal.tsx` usa `rgba(0,0,12,0.55)` | Ignora `--hc-overlay` | Scrims distintos |

---

## 3. Botones — inventario

**Veredicto:** Unificar a **un** primitivo React + clases `.hc-btn-*`. Deprecar el resto.

| # | Implementación | Path | Color primario | Import sites (aprox.) | Acción |
|---|----------------|------|----------------|----------------------|--------|
| 1 | `Button` | `components/ui/Button.tsx` | Rojo `.hc-btn-primary` | ~33 | **Mantener** (canónico storefront/admin) |
| 2 | CSS `.hc-btn-*` | `index.css` | Rojo | vía Button | **Mantener** |
| 3 | `Boton` | `prototipo/compartido/ui.tsx` | Rojo `bg-hc-primary`, `rounded-[14px]` | ~23 | **Combinar** → adaptador sobre Button |
| 4 | `AdminPrimaryButton` (+ Dark/Secondary/Danger) | `prototipo/admin/AdminUi.tsx` | Rojo, min-h-12 | SuperAdmin | **Combinar** |
| 5 | `cfg-btn-*` | `AdminConfiguracion.tsx` / `configUi.tsx` | **Azul** | Config | **Reemplazar** por `.hc-btn-*` (rojo primario) |
| 6 | `BotonPrimario` / `BotonSecundario` | `prototipo/emprendedor/ui/*` | Rojo | Emp (deprecated) | **Eliminar** tras migrar |
| 7 | `EnlacePrimario` | idem | — | deprecated | **Eliminar** |
| 8 | `Chip` / `AdminFilterChip` | ui.tsx / AdminUi | — | filtros | **Combinar** un Chip |
| 9 | `BotonesAgregarProducto` | compartido | — | — | **Simplificar** |
| 10 | `BotonesAprobarRechazar` | admin/aprobaciones | success/danger | — | Mantener dominio |
| 11 | `SaveButton` | configUi | cfg azul | — | **Reemplazar** |
| 12 | `ConfirmModal` actions | ConfirmModal.tsx | hex hardcode | — | **Reemplazar** por Button |
| 13 | TabBtn / PeriodSelector | securityUi | inline style | — | **Simplificar** |
| 14 | Raw `<button>` | Sistema*, reportes, etc. | mixto | muchos | **Migrar** gradualmente |

---

## 4. Inputs — inventario

| # | Implementación | Path | Acción |
|---|----------------|------|--------|
| 1 | `Input` + `.hc-input` | `components/ui/Input.tsx`, `index.css` | **Mantener** canónico |
| 2 | `Campo` → `CampoAnimado` | prototipo ui + motion | **Mantener** para wizards seller |
| 3 | `CampoTexto` (deprecated) | emprendedor/ui | **Eliminar** |
| 4 | `StyledInput` / `cfg-input` | configUi | **Reemplazar** → Input |
| 5 | `AdminSearchField` | AdminUi | **Combinar** |
| 6 | `SmartField` | checkout | **Evaluar** unificar look con Input (checkout glass aesthetic) |
| 7 | Local `Campo` ×3 | SistemaProductoForm, TiendaCheckout, etc. | **Combinar** nombre+impl |
| 8 | Raw inputs Sistema | `#d8cfc0` borders | **Reemplazar** |
| 9 | `PhoneField` | components/ui | **Mantener** |
| 10 | `CampoDatoCobro` / personalizado | prototipo | Mantener dominio |

---

## 5. Cards, badges, tablas, modales, toasts

### Cards

No hay `<Card>` compartido en `components/ui/`. Existen: `.hc-card` CSS, `TarjetaOpcion`, `Card` security (token roto), `Block`/`cfg-card`, `AdminStatCard`, `StatCard`×2, `KpiCard`×3, `ProductCard`, + ~15 domain cards.

**Veredicto:** Crear `Card` primitivo + `StatCard` único. Domain cards pueden extender.

### Badges

| Familia | Paths | Acción |
|---------|-------|--------|
| `Badge` storefront | `components/ui/Badge.tsx` | Corregir bias dark-theme |
| `.hc-badge` CSS | index.css | Usar desde componente |
| `AdminBadge`, `BadgePlan`, `BadgeEstado` | admin / prototipo | Combinar |
| `EstadoBadge` ×5+ | ordenes, empresas, compras, servicios, garantías, suscripcion… | **Unificar** mapa de estados → un `EstadoBadge` |

### Tablas

Sin primitivo. 11 módulos nombrados + ~30 tablas inline. Patrón común: `min-w-[900px]` + scroll horizontal + fila-tarjeta móvil en algunos.

**Veredicto:** `DataTable` compartido con variante mobile-cards.

### Modales

| Impl | Path | Nota |
|------|------|------|
| `Modal` | components/ui/Modal.tsx | Focus trap + Framer — **canónico** |
| `ConfirmModal` | wraps Modal | Botones no usan Button |
| `AuthPromptModal` | custom overlay | **No usa Modal**; además nunca se abre (`setAuthPromptOpen(true)` ausente) |
| ~20 admin modals | ProductoFormModal, MarcaFormModal, … | Mix Modal vs custom |
| Drawers | recoleccion, servicios | Separados |

### Toasts

| Sistema | Path | Nota |
|---------|------|------|
| `ToastProvider` / `useToast` | Toast.tsx | Canónico (~100+ call sites) |
| `SocialProofToast` | SocialProofToast.tsx | Intencional (marketing) |

---

## 6. Tres tracks visuales (causa raíz)

```text
Track A — Storefront / admin clásico
  Button + Input + .hc-* + MainLayout / AdminLayout

Track B — Seller Figma mobile-first
  Boton + CampoAnimado + rounded-[14px] + max-w-md shells

Track C — Config / Sistema warm
  cfg-btn (azul) + inline styles + .hc-sistema-theme cream
```

**Problema:** El usuario (y el vendedor que salta entre Figma y `/admin/pos|config|billing`) percibe **tres productos distintos**.

**Propuesta conceptual:** Un Design System React mínimo (Button, Input, Card, Badge, Modal, Table, Chip) alimentado solo por tokens. Track B = mismos componentes + layout mobile. Track C = theme CSS, no otro set de botones.

---

## 7. Veredicto de unificación (resumen)

| Tipo | Estado actual | Unificar a | Prioridad |
|------|---------------|------------|-----------|
| Tokens rotos | `--hc-card`, `--color-accent` | Definir / corregir refs | P0 |
| Botones | 12+ sistemas | `Button` + `.hc-btn-*` | P0 |
| Inputs | 10+ | `Input` + `Campo` wizard | P1 |
| Badges estado | 5+ `EstadoBadge` | 1 mapa + 1 componente | P1 |
| Cards KPI | 3+ | 1 `StatCard` | P2 |
| Tablas | 0 primitivo | `DataTable` | P2 |
| Modales | 1 bueno + bypasses | Extender `Modal` | P1 |
| Toasts | 1 bueno | Mantener | — |
| Espaciado tokens | Documentación | Cablear o dejar Tailwind | P3 |
| Radios 14px | Hardcode | Mapear a `--hc-r-md` o token nuevo | P2 |
