# HOTCLICK — E-commerce Costa Rica

Plataforma de e-commerce para venta de productos de segunda mano y nuevos en Costa Rica. Desarrollada con Spring Boot + React.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Spring Boot 3.4.4 · Java 24 |
| Frontend | React 18 · Vite · Tailwind CSS · Zustand · Framer Motion |
| Base de datos | PostgreSQL en Supabase |
| Almacenamiento | Supabase Storage (imágenes de productos y marcas) |
| Email | SendGrid via ResendEmailService |
| Pagos | PayXpert (webhook) |
| Deploy | Render (auto-deploy desde `master`) |
| Package manager | pnpm (frontend) · Maven local en `maven/bin/` (backend) |

---

## Estructura del proyecto

```
proyecto-2026/
├── Hot_click_outlet/
│   ├── src/main/java/com/hotclick/   ← Backend Spring Boot
│   │   ├── controller/               ← REST controllers
│   │   ├── model/                    ← Entidades JPA
│   │   ├── service/                  ← Lógica de negocio
│   │   ├── repository/               ← Spring Data repos
│   │   └── security/                 ← JWT auth
│   ├── src/main/resources/
│   │   ├── application.properties    ← Config (DB, JWT, SendGrid)
│   │   └── static/                   ← Frontend compilado (build output)
│   ├── frontend/                     ← React app (Vite)
│   │   └── src/
│   │       ├── pages/                ← Páginas (cliente + admin)
│   │       ├── components/           ← UI components reutilizables
│   │       ├── store/                ← Zustand stores
│   │       ├── services/             ← Axios services
│   │       ├── layouts/              ← AdminLayout, MainLayout, AuthLayout
│   │       └── utils/                ← format.js, analytics.js
│   └── Actualizado.sql               ← Schema PostgreSQL (aplicar manualmente)
└── CLAUDE.md                         ← Guía para Claude Code
```

---

## Levantar el proyecto localmente

### Backend

```bash
# Requiere Java 24
.\maven\bin\mvn spring-boot:run
# Corre en http://localhost:8080
```

### Frontend (dev server)

```bash
cd Hot_click_outlet/frontend
pnpm install
pnpm dev
# Corre en http://localhost:3000 (proxy /api → 8080)
```

### Build de producción

```bash
cd Hot_click_outlet/frontend
pnpm build
# Genera archivos en src/main/resources/static/
# Luego Spring Boot sirve el frontend en /
```

---

## Funcionalidades

### Tienda (cliente)
- Catálogo de productos con filtros por categoría, marca, condición y precio
- Búsqueda con resultados instantáneos (SearchPanel) — filtra por nombre, marca y categoría
- Carrito de compras persistido en localStorage
- Pago con tarjeta (PayXpert) o cotización por WhatsApp
- Página de detalle de producto con galería de imágenes
- Lista de deseos
- Historial de pedidos del cliente
- Login / registro con JWT

### Panel Admin
| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/admin` | KPIs: ventas, pedidos, usuarios |
| Productos | `/admin/productos` | CRUD completo con imágenes múltiples |
| Pedidos | `/admin/pedidos` | Tracker de estado, notificaciones WhatsApp + email al cliente |
| Marcas | `/admin/marcas` | CRUD con logo (Supabase Storage) |
| Finanzas | `/admin/finanzas` | Pedidos entregados con desglose productos vs envío |
| Usuarios | `/admin/usuarios` | Gestión de cuentas y roles |
| Reportes | `/admin/reportes` | Gráficos de ventas |
| Publicaciones | `/admin/publicaciones` | Blog / noticias |

### Notificaciones al cliente
Desde el panel de pedidos el admin puede enviar:
- **WhatsApp** — link `wa.me` con estado, productos, guía de envío y courier (Correos CR o entrega directa HOTCLICK)
- **Email** — email HTML con resumen del pedido, estado actual y link de rastreo

### Finanzas
Los pedidos aparecen en finanzas automáticamente al marcarse como **ENTREGADO**. La vista muestra:
- Total ingresos por productos (verde)
- Total costos de envío / moto (amarillo)
- Total cobrado (azul)
- Tabla detallada con desglose por pedido y filtros de período

---

## Variables de entorno (application.properties)

```properties
spring.datasource.url=jdbc:postgresql://...supabase.com:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=...
jwt.secret=...
resend.api-key=...
supabase.url=https://...supabase.co
supabase.key=...
supabase.bucket=hotclick-images
payxpert.api-key=...
```

---

## Deploy en Render

El proyecto se despliega automáticamente en Render al hacer push a `master`. El frontend debe compilarse antes del commit:

```bash
cd Hot_click_outlet/frontend && pnpm build
git add .
git commit -m "descripción"
git push origin master
```

Render recompila el backend con Maven y sirve el JAR resultante. El frontend (archivos estáticos en `src/main/resources/static/`) queda embebido en el JAR.

---

## Contacto

HOTCLICK · Costa Rica · hotclick.cr@gmail.com · WhatsApp: +506 8974-5370 (Andrés Zúñiga)
