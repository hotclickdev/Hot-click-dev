# HOTCLICK — Frontend React

Aplicación React para la tienda y panel admin de HOTCLICK.

## Stack

- **React 18** + **Vite**
- **Tailwind CSS** (utility-first styling)
- **Zustand** (estado global: auth, carrito, UI, wishlist)
- **Framer Motion** (animaciones)
- **Axios** (HTTP con interceptor JWT)
- **React Router v6**
- **i18next** (internacionalización)
- **pnpm** (package manager)

## Comandos

```bash
pnpm dev          # Dev server en http://localhost:3000
pnpm build        # Build → ../src/main/resources/static/
pnpm build:watch  # Build con watch
pnpm lint         # ESLint
```

## Estructura

```
src/
├── pages/
│   ├── HomePage.jsx
│   ├── ProductsPage.jsx
│   ├── ProductDetailPage.jsx
│   ├── CartPage.jsx
│   ├── CheckoutPage.jsx
│   ├── MisPedidosPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── AdminProducts.jsx
│       ├── AdminNuevoProducto.jsx
│       ├── AdminOrders.jsx        ← tracker + notificaciones WA/email
│       ├── AdminMarcas.jsx        ← CRUD marcas con logo
│       ├── AdminFinanzas.jsx      ← desglose productos vs envío
│       ├── AdminUsers.jsx
│       ├── AdminReportes.jsx
│       └── AdminPublicaciones.jsx
├── components/
│   ├── ui/                        ← Button, Input, Modal, Toast, Spinner...
│   │   ├── AuthPromptModal.jsx    ← modal login para usuarios anónimos
│   │   ├── MiniCartDrawer.jsx
│   │   └── SearchPanel.jsx        ← búsqueda con marcas
│   └── ProtectedRoute.jsx
├── store/
│   ├── authStore.js
│   ├── cartStore.js               ← toWhatsAppMessage()
│   ├── uiStore.js                 ← authPromptOpen
│   └── wishlistStore.js
├── services/
│   ├── api.js                     ← Axios + interceptor JWT
│   ├── authService.js
│   ├── orderService.js            ← notificar(id)
│   ├── marcaService.js            ← getPublicas() sin auth
│   └── productService.js
├── layouts/
│   ├── AdminLayout.jsx
│   ├── MainLayout.jsx
│   └── AuthLayout.jsx
└── utils/
    ├── format.js                  ← formatPrice (₡), formatDate, formatDateTime
    └── analytics.js
```

## Alias de importación

`@/` apunta a `src/` (configurado en `vite.config.ts`).

## Notas

- El build de producción se sirve desde Spring Boot — **no hay servidor Node en producción**.
- La API en dev se proxea a `http://localhost:8080` vía Vite.
- Los montos siempre son enteros en colones (₡), sin decimales.
