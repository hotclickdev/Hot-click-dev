# HOTCLICK — Frontend

SPA de la tienda pública, las áreas de vendedor (`/emprendedor`, `/pyme`, `/negocio-plus`) y el panel `/admin`. En producción no hay servidor Node: Vite compila a `Hot_click_outlet/src/main/resources/static/` y lo sirve Spring Boot.

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- Zustand (auth, carrito, wishlist, UI)
- TanStack Query
- Axios (`src/services/`; interceptor JWT y refresh)
- React Router 7
- i18next
- Framer Motion
- pnpm 11 · Node >= 22.13

## Comandos

```bash
pnpm dev          # http://localhost:3000  (proxy /api → :8080)
pnpm build        # typecheck + build → ../src/main/resources/static/
pnpm build:watch
pnpm typecheck
pnpm lint
pnpm test         # Vitest
pnpm test:e2e     # Playwright
```

El build de producción hay que correrlo antes de commit y antes de `docker build`. La imagen de la app no compila este paquete.

## Estructura

```text
src/
├── app/            AppRoutes.tsx, chrome, rutas de vendedor
├── pages/          Tienda, legales, admin/
├── components/
├── store/          Zustand
├── services/       HTTP (api.ts y un servicio por dominio)
├── layouts/
└── utils/          format (₡), analytics, planes
```

`@/` apunta a `src/` (`vite.config.ts`).

## Notas

- Montos en colones enteros, sin decimales (`Intl.NumberFormat('es-CR')`).
- Clerk, GA4, Sentry, PostHog y Clarity respetan el consentimiento de cookies donde aplica.
