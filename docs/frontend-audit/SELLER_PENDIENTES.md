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
| 1 | QA visual Emp Productos (`FilaProductoLista` vs Figma) |
| 2 | Playwright seller verde en CI (Chrome) — specs ya en `test:e2e:ci` |
| 3 | Asset maskable PWA con safe-zone |
| 4 | CRM/Marketing seller — decisión producto (no inventar módulos) |

## Deuda aparte (no bloquea merge P1)

- Métodos de cobro: restos `localStorage` / API payouts
- Extras negocio (categoría/IG/zona) aún parcial en cliente

## Merge

Tras smoke visual Productos + Playwright seller: merge `feat/seller-roadmap-p1` → `master` cuando Andres lo pida. Recordar `pnpm build` antes de commit/deploy Docker.
