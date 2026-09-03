# Seller frontend — pendientes (post merge P1)

**Fecha:** 2026-09-03  
**Rama:** `feat/seller-roadmap-p1`

## Hecho en esta rama

| Ítem | Estado |
|------|--------|
| F3 kit UI → `compartido/ui` | Hecho (merge agente) |
| F6 motion cobro + TarjetaOpcion | Hecho (merge agente) |
| F5 skeletons listados | Hecho (`SkeletonLista`) |
| Empty Pedidos | Hecho |
| F7 lazy routes Emp + Seller | Hecho |
| F9 sidebars POS/Pedidos/Bodegas | Hecho (SellerSidebar) |
| F8 Escape modal + remap assert | Hecho (spec + unit in e2e file) |
| Dead Pos/Cobrar/Login prototipo | Eliminados |
| P0 PWA + paths (master `dc152a0c`) | Previo |

## Todavía pendiente

| # | Qué | Notas |
|---|-----|--------|
| 1 | **F2b wrappers Productos/Planes** | Pedidos/Bodegas chrome distinto; Productos Emp vs compartido siguen forkeados (hooks distintos). Extraer vista compartida con props. |
| 2 | **Focus trap modal Sucursales** | Escape + aria-modal listos; falta trap completo de foco. |
| 3 | **E2E verde CI** | Correr `pnpm exec playwright test tests/seller-*.spec.ts` en máquina con Chrome. |
| 4 | **Menu dual EntradaPagina** | Mobile/desktop siguen con dos `EntradaPagina` (P3). |
| 5 | **Icon maskable dedicado** | Manifest ya marca `purpose: maskable` con `app-icon.png`; ideal asset con safe-zone. |
| 6 | **CRM/Marketing/Inventario seller** | Fuera de alcance sin decisión producto. |

## Orden merge recomendado hacia master

1. Merge `feat/seller-roadmap-p1` → `master` tras typecheck + vitest.
2. Luego F2b Productos/Planes en PR aparte.
