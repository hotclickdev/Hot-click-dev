# HOTCLICK — Progreso del Proyecto

> Fecha última actualización: 2026-04-30

---

## Credenciales Admin

| Campo | Valor |
|-------|-------|
| URL | `http://localhost:8080` |
| Correo | `admin@hotclick.com` |
| Contraseña | `Admin1234!` |
| Panel admin | `/admin/admin-dashboard.html` |

---

## Stack Técnico

- **Backend**: Spring Boot 3.4.4 / Java 21
- **Seguridad**: Spring Security + JWT (stateless)
- **BD**: Supabase (PostgreSQL) — Session Pooler `aws-1-us-east-2.pooler.supabase.com:5432`
- **ORM**: JPA/Hibernate, `ddl-auto=none`, naming estándar (minúsculas)
- **Frontend**: HTML/CSS/JS vanilla bajo `src/main/resources/static/`
- **Deploy local**: Docker Compose + Maven local (`.\maven\bin\mvn`)

---

## Comandos

```bash
# Compilar
.\maven\bin\mvn clean package -DskipTests

# Ejecutar local
.\maven\bin\mvn spring-boot:run

# Docker (rebuild completo)
docker-compose down && docker-compose up --build
```

---

## LO QUE SE HIZO

### Backend

| Archivo | Cambio |
|---------|--------|
| `application.properties` | Credenciales Supabase correctas + `&prepareThreshold=0` en JDBC URL |
| `docker-compose.yml` | Mismo `prepareThreshold=0` en variable de entorno |
| `DataSeeder.java` | Siempre resetea contraseña admin al arrancar; eliminadas llamadas a `seedBodegaDefault()` y `seedCategoriasDefault()` |
| `CategoriaController.java` | CRUD completo: GET (activos), POST, PUT `/{id}`, DELETE `/{id}` (soft delete) |
| `BodegaController.java` | CRUD completo: GET (activos), POST, PUT `/{id}`, DELETE `/{id}` (soft delete) |
| `CategoriaRepository.java` | Agregado `findByEstado(Integer estado)` |
| `BodegaRepository.java` | Agregado `findByEstado(Integer estado)` |

### Admin Pages (`/static/admin/`)

| Archivo | Cambio |
|---------|--------|
| `admin-dashboard.html` | Stats cambiados de valores hardcoded (`156`, `$45,678`…) a `—`; donut chart y último pedido en blanco por defecto |
| `admin-categorias.html` | Eliminado array mock JS; ahora llama `GET /api/categorias`, POST/PUT/DELETE real |
| `admin-bodegas.html` | Eliminado array mock JS; ahora llama `GET /api/bodegas`, POST/PUT/DELETE real; usa `window._bodegasCache` |
| `admin-productos.html` | Filtro categoría carga desde API; `cargarSelects()` puebla categorías y bodegas dinámicamente |

### User-facing Pages (`/static/pages/`)

| Archivo | Cambio |
|---------|--------|
| `index.html` | Eliminado `productosMock`; `cargarProductosDestacados()` y `cargarCategoriasHome()` llaman API real |
| `productos.html` | Eliminado `productosMock`; carga desde API, filtrado client-side, paginación, soporte `?catId=` |
| `categorias.html` | Eliminado arrays mock; `cargarCategorias()` hace `Promise.all([/api/categorias, /api/productos?size=200])`; muestra conteo real de productos por categoría |

---

## PENDIENTE

### Alta prioridad

- [ ] **Verificar login admin funciona** tras rebuild Docker (`admin@hotclick.com` / `Admin1234!`)
- [ ] **Verificar RLS Supabase** — si las tablas `hot_click_*` tienen Row Level Security activo, los inserts fallan silenciosamente. Ejecutar en Supabase SQL Editor:
  ```sql
  -- Diagnóstico
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'hot_click%';
  
  -- Fix (si rowsecurity = true)
  ALTER TABLE hot_click_usuario_tb DISABLE ROW LEVEL SECURITY;
  ALTER TABLE hot_click_producto_tb DISABLE ROW LEVEL SECURITY;
  ALTER TABLE hot_click_pedido_tb DISABLE ROW LEVEL SECURITY;
  ALTER TABLE hot_click_pedido_item_tb DISABLE ROW LEVEL SECURITY;
  ALTER TABLE hot_click_bodega_tb DISABLE ROW LEVEL SECURITY;
  ALTER TABLE hot_click_categoria_tb DISABLE ROW LEVEL SECURITY;
  ALTER TABLE hot_click_rol_tb DISABLE ROW LEVEL SECURITY;
  ```

### Dashboard con datos reales (Plan ya diseñado — `CLAUDE.md` / plan mode)

El plan completo está en `.claude/plans/structured-sparking-chipmunk.md`. Resumen:

- [ ] **`DashboardDTO.java`** — DTO con inner classes `CategoriaConteoDTO` y `UltimoPedidoDTO`
- [ ] **`UsuarioRepository.java`** — agregar `countUsuariosActivos()` con `@Query`
- [ ] **`ProductoRepository.java`** — agregar `countProductosActivos()` y `countPorCategoria()`
- [ ] **`PedidoRepository.java`** — agregar `countTotalPedidos()` y `sumTotalVentas()`
- [ ] **`DashboardService.java`** — agregar servicio que agrega métricas
- [ ] **`DashboardController.java`** — endpoint `GET /api/admin/dashboard`
- [ ] **`SecurityConfig.java`** — proteger `/api/admin/**` con `hasAnyAuthority("ADMIN_IT", "ADMIN_CLIENTE")`
- [ ] **`js/api.js`** — agregar función `apiObtenerDashboard()`
- [ ] **`admin-dashboard.html`** — reemplazar `—` placeholder por datos reales desde API

### Funcionalidades faltantes

- [ ] **Pedidos** — No existe tabla/entidad de pedidos aún o no está verificado. Falta:
  - Entidad `Pedido` y `PedidoItem`
  - `PedidoController` con endpoints para crear/listar pedidos
  - Página `admin-pedidos.html` (no existe)
  - Flujo de checkout en el frontend (carrito → pedido)
- [ ] **Usuarios admin** — Página `admin-usuarios.html` (no existe o no está conectada a API)
- [ ] **Imágenes de productos** — Campo `linkAmazon` existe pero no hay upload real de imágenes; `prodImagen` en el modal no persiste nada
- [ ] **Búsqueda global** — La barra de búsqueda del topbar admin no filtra correctamente en todas las páginas
- [ ] **Paginación server-side** — Actualmente se carga `?size=100` o `?size=200` y se pagina client-side; para catálogos grandes se necesita paginación real

### Mejoras técnicas

- [ ] Cambiar `ddl-auto=create` → `validate` o `none` cuando el esquema sea estable
- [ ] Agregar `@Cacheable` en `DashboardService` (TTL 5 min) para no recalcular en cada request
- [ ] Verificar que `SecurityConfig` tiene regla para `/api/admin/**` (puede que no esté agregada aún)

---

## Flujo de datos (cómo funciona ahora)

```
Admin crea datos (categorías, bodegas, productos)
    → POST/PUT /api/... con JWT
    → Spring Security verifica token
    → Service guarda en Supabase via JPA
    → Supabase PostgreSQL persiste

Usuario visita tienda
    → index.html / productos.html / categorias.html
    → fetch GET /api/productos | /api/categorias (sin auth)
    → Spring devuelve JSON
    → JS renderiza cards dinámicamente
```

---

## Estructura de archivos relevante

```
Hot_click_outlet/
├── src/main/java/com/hotclick/
│   ├── config/
│   │   ├── DataSeeder.java          ← seed admin al arrancar
│   │   ├── SecurityConfig.java      ← rutas públicas/protegidas
│   │   └── JwtUtils.java
│   ├── controller/
│   │   ├── ProductoController.java
│   │   ├── CategoriaController.java ← CRUD completo ✓
│   │   └── BodegaController.java    ← CRUD completo ✓
│   ├── repository/
│   │   ├── CategoriaRepository.java ← findByEstado ✓
│   │   └── BodegaRepository.java    ← findByEstado ✓
│   └── model/
│       ├── Producto.java
│       ├── Categoria.java
│       └── Bodega.java
└── src/main/resources/
    ├── application.properties       ← Supabase credentials ✓
    └── static/
        ├── admin/
        │   ├── admin-dashboard.html ← stats en blanco ✓
        │   ├── admin-productos.html ← conectado a API ✓
        │   ├── admin-categorias.html← conectado a API ✓
        │   └── admin-bodegas.html   ← conectado a API ✓
        ├── pages/
        │   ├── index.html           ← productos/categorias desde API ✓
        │   ├── productos.html       ← desde API + filtros client-side ✓
        │   └── categorias.html      ← desde API + conteo real ✓
        └── js/
            ├── api.js               ← funciones fetch centralizadas
            ├── auth.js              ← login/register/JWT
            ├── cart.js              ← carrito localStorage
            └── utils.js             ← helpers (escapeHtml, toast, modal)
```
