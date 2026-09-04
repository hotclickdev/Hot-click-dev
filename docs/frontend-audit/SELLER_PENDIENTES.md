# Seller frontend — pendientes

**Rama:** `master` (P1 seller mergeado)

## Hecho

- P0 PWA + paths, F3 kit UI, F5 `ListadoFeedback`, F6 motion, F7 lazy (+ Equipo/Sucursales)
- F8 Escape + remap `/admin/bodegas` + fix `AdminRoleSwitch` (solo `ADMIN` plataforma)
- F9 sidebars, empty Pedidos/detalle, dead Emp orphans (Pos/Cobrar/Login/Registro…)
- F2b vistas compartidas: Productos / Pedidos / Bodegas / Planes (chrome Emp vs Seller)
- Focus trap Tab+Escape en modal Sucursales
- Telegram en Opciones (Emp + Seller) + security/rate-limit
- PWA: favicon-192 + **maskable 512** (`/brand/app-icon-maskable-512.png`, safe-zone)
- Wiring test Mis Productos alineado a `ProductosListaVista`
- Deploy EC2 + CI verde (Build React / Java / Sonar / gitleaks)

## Pendiente (producto)

| # | Ítem |
|---|------|
| 1 | CRM/Marketing seller — decisión producto (no inventar módulos) |

## Deuda aparte (bajo impacto)

- Métodos de cobro: API es fuente de verdad; `CLAVE_LOCAL_*` solo limpia legacy
- Extras negocio (categoría/IG/zona) aún parcial en cliente

## Ops

Push/deploy ya hechos para P1. Tras cambios PWA: `pnpm build` + commit static si va a Docker.
