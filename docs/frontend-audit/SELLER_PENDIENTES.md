# Seller frontend — pendientes

**Rama:** `feat/seller-roadmap-p1`

## Hecho

- P0 PWA + paths, F3 kit UI, F5 `ListadoFeedback`, F6 motion, F7 lazy (+ Equipo/Sucursales)
- F8 Escape + remap `/admin/bodegas` + fix `AdminRoleSwitch` (solo `ADMIN` plataforma)
- F9 sidebars, empty Pedidos/detalle, dead Emp orphans (Pos/Cobrar/Login/Registro…)
- F2b vistas compartidas: Productos / Pedidos / Bodegas / Planes (chrome Emp vs Seller)
- Focus trap Tab+Escape en modal Sucursales
- PWA favicon-192 en manifest/vite
- Telegram en Opciones (Emp + Seller) + security/rate-limit

## Pendiente

| # | Ítem |
|---|------|
| 1 | Asset maskable PWA con safe-zone |
| 2 | CRM/Marketing seller — decisión producto (no inventar módulos) |

## Verificado (2026-09-04)

- Playwright seller suite local: **32/32** (wizards Emp/PYME/Plus, Escape, remap, sidebar)
- QA visual Emp `/productos`: chrome Emp + `FilaProductoLista` + empty conversacional OK
- Fix a11y: `TarjetaOpcion` como `role="radio"` dentro de radiogroups

## Deuda aparte (no bloquea merge P1)

- Métodos de cobro: restos `localStorage` / API payouts
- Extras negocio (categoría/IG/zona) aún parcial en cliente

## Merge

Merge `feat/seller-roadmap-p1` → `master` cuando Andres lo pida. Recordar `pnpm build` antes de commit/deploy Docker.
