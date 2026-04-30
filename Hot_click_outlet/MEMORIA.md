# MEMORIA DEL PROYECTO — HOT_CLICK OUTLET
> Última actualización: 2026-04-29

---

## ¿Qué es este proyecto?

**Hot_click_outlet** es una tienda e-commerce de tecnología/electrónica.
Los clientes pueden ver productos, agregarlos al carrito, hacer pedidos y ver
su historial con garantías. Hay administradores que gestionan productos,
bodegas y categorías desde un panel propio.

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Backend | Spring Boot 3.4.4, Java 24 |
| Base de datos | PostgreSQL en Aiven Cloud |
| Seguridad | Spring Security + JWT (stateless) |
| Frontend | HTML + CSS + JavaScript vanilla (multi-página) |
| Contenedor | Docker / Docker Compose |
| Build | Maven local en `maven/bin/` → usar `.\maven\bin\mvn` |

**URL local:** `http://localhost:8080`

---

## Credenciales de admin

| Campo | Valor |
|-------|-------|
| Correo | `admin@hotclick.com` |
| Contraseña | `Admin1234!` |
| Rol | `ADMIN_IT` |

El usuario admin es creado automáticamente por `DataSeeder.java` al iniciar la app.

---

## Estructura de archivos clave

```
Hot_click_outlet/
├── src/main/java/com/hotclick/
│   ├── config/
│   │   ├── DataSeeder.java          ← Siembra roles y admin al arrancar
│   │   ├── SecurityConfig.java      ← JWT + CORS + rutas públicas/privadas
│   │   └── WebConfig.java
│   ├── controller/
│   │   ├── AuthController.java      ← POST /api/auth/login, /register
│   │   ├── UsuarioController.java   ← GET/PUT /api/usuarios/{id}
│   │   ├── ProductoController.java  ← GET /api/productos/**
│   │   ├── PedidoController.java    ← GET/POST /api/pedidos/**
│   │   ├── CarritoController.java
│   │   └── PremioController.java    ← ruleta de premios
│   ├── model/
│   │   ├── Usuario.java             ← tabla hot_click_usuario_tb
│   │   ├── Rol.java                 ← tabla hot_click_rol_tb
│   │   ├── Producto.java
│   │   ├── Pedido.java              ← tiene fechaEntregaReal para garantía
│   │   ├── PedidoItem.java
│   │   ├── Carrito.java / CarritoItem.java
│   │   ├── Premio.java / GiroRuleta.java / ResultadoRuleta.java
│   │   └── Referido.java
│   ├── security/
│   │   ├── JwtUtil.java
│   │   └── JwtRequestFilter.java
│   └── utils/Constants.java         ← ROL_ADMIN_IT, ROL_ADMIN_CLIENTE, ROL_USUARIO_FINAL
│
├── src/main/resources/
│   ├── application.properties       ← ⚠️ ddl-auto=create (borra BD al reiniciar)
│   └── static/
│       ├── pages/
│       │   ├── index.html
│       │   ├── productos.html
│       │   ├── categorias.html
│       │   ├── carrito.html
│       │   ├── perfil.html          ← 3 tabs: Mis Datos / Mis Compras / Cambiar Datos
│       │   ├── producto-detalle.html
│       │   ├── contacto.html
│       │   ├── nosotros.html
│       │   ├── login.html
│       │   ├── registro.html
│       │   └── escaner.html         ← página legacy, ya no se usa activamente
│       ├── admin/
│       │   ├── admin-dashboard.html
│       │   ├── admin-productos.html
│       │   ├── admin-bodegas.html
│       │   └── admin-categorias.html
│       ├── js/
│       │   ├── utils.js             ← mostrarToast, abrirModal, cerrarModal
│       │   ├── api.js               ← apiLogin, apiRegister, apiLogout, getToken, API_URL
│       │   ├── auth.js              ← iniciarSesion, registrarUsuario, cerrarSesion, actualizarIconoSesion
│       │   └── cart.js              ← lógica del carrito
│       └── css/style.css
```

---

## API endpoints relevantes

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login → retorna JWT + userId + role |
| POST | `/api/auth/register` | No | Registro de nuevo usuario |
| GET | `/api/usuarios/{id}` | JWT | Datos del usuario |
| PUT | `/api/usuarios/{id}` | JWT | Actualizar nombre, teléfono, contraseña |
| GET | `/api/pedidos/usuario/{id}` | JWT | Historial de pedidos del usuario |
| GET | `/api/pedidos/pendientes` | JWT | Pedidos pendientes (admin) |
| PUT | `/api/pedidos/{id}/estado` | JWT | Cambiar estado del pedido |
| GET | `/api/productos/**` | No | Catálogo de productos |
| GET | `/api/ruleta/premios` | No | Premios disponibles ruleta |
| GET | `/api/health` | No | Estado del servidor |

---

## Flujo de autenticación (frontend)

1. Usuario llena modal de login → llama `iniciarSesion()` en `auth.js`
2. `auth.js` llama `apiLogin()` de `api.js` → `POST /api/auth/login`
3. Backend responde `{ token, userId, role }`
4. `api.js` guarda en `localStorage`: `jwtToken`, `userId`, `userRole`
5. `auth.js` revisa el rol:
   - `ADMIN_IT` o `ADMIN_CLIENTE` → muestra modal "¿Entrar como Admin o Cliente?"
   - Cualquier otro rol → redirige a `perfil.html`
6. `actualizarIconoSesion()` se ejecuta en cada `DOMContentLoaded` para reflejar el estado de sesión en el nav

---

## Página de perfil (`perfil.html`) — tabs

| Tab | Qué hace |
|-----|----------|
| **Mis Datos** | Muestra nombre, correo, teléfono del usuario (GET /api/usuarios/{id}) |
| **Mis Compras** | Lista pedidos con barra de garantía de 40 días desde `fechaEntregaReal` |
| **Cambiar Datos** | Formulario para actualizar nombre, teléfono, contraseña (PUT /api/usuarios/{id}) |

**Garantía:** 40 días desde `fechaEntregaReal`.
- Verde: quedan más de 15 días
- Amarillo: quedan entre 1 y 15 días
- Rojo: expirada

Si el usuario tiene rol ADMIN, aparece botón "Ir al Panel Admin".

---

## Roles del sistema

| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `ROL_ADMIN_IT` | `ADMIN_IT` | Máximo acceso, gestiona sistema |
| `ROL_ADMIN_CLIENTE` | `ADMIN_CLIENTE` | Administrador de negocio |
| `ROL_USUARIO_FINAL` | `USUARIO_FINAL` | Cliente normal |

Los roles se guardan en `hot_click_rol_tb` y se asignan en `hot_click_usuario_rol_tb`.

---

## Problemas conocidos / deuda técnica

### CRÍTICO — ddl-auto=create
```properties
spring.jpa.hibernate.ddl-auto=create
```
**Cada vez que se reinicia la app se borra toda la base de datos.**
DataSeeder recrea los roles y el admin, pero todos los productos, pedidos y
usuarios de clientes se pierden. Cuando el esquema sea estable, cambiar a
`validate` o `update`.

### Pendiente — Tab de Testimonios
El usuario mencionó que los clientes deberían poder "agregar testimonios" en
su perfil. Nunca se implementó. Falta:
- Modelo `Testimonio` (usuario, texto, fecha, estado)
- Endpoint `POST /api/testimonios` y `GET /api/testimonios`
- Tab "Mis Testimonios" en `perfil.html`
- Mostrar testimonios aprobados en `nosotros.html` o `index.html`

### Pendiente — Panel admin incompleto
Las páginas admin (`admin-productos.html`, `admin-bodegas.html`,
`admin-categorias.html`) existen pero su funcionalidad real (CRUD operativo,
validaciones, subida de imágenes) puede estar incompleta o en borrador.

### Pendiente — Carrito → Pedido
El flujo completo desde `carrito.html` hasta crear un pedido real en la BD
puede no estar terminado. Revisar `CarritoController` y `PedidoController`.

### Pendiente — Ruleta de premios
Existe modelo `Premio`, `GiroRuleta`, `ResultadoRuleta` y endpoint
`/api/ruleta/premios`, pero la UI de la ruleta no está claramente integrada
en el frontend.

### Pendiente — Foto de perfil
`Usuario` tiene campo `fotoPerfilUrl` pero no hay UI ni endpoint para subir foto.

### Pendiente — Referidos
Existe modelo `Referido` pero ningún controller ni UI lo usa todavía.

---

## Errores comunes (histórico)

| Error | Causa | Solución |
|-------|-------|----------|
| `PSQLException: column contains null values` | `ddl-auto=update` + nueva columna NOT NULL en BD con datos | Cambiar a `create` o agregar valor default |
| `No property 'nivel' found for type 'Categoria'` | `CategoriaRepository` tenía método con campo inexistente | Borrar el método del repository |
| HTTP 403 en `/pages/index.html` | `SecurityConfig` solo permitía `/*.html` | Agregar `/pages/**` al permitAll |
| 401 en `/api/auth/login` desde browser | CORS preflight (OPTIONS) bloqueado por Spring Security | Agregar bean `CorsConfigurationSource` correcto |
| Modal admin no aparece | Usuario en BD sin roles / handler inline sobreescribía `iniciarSesion()` | DataSeeder + reemplazar handlers inline |
| `SyntaxError: Identifier 'API_URL' already declared` | Página tenía `const API_URL` y también cargaba `api.js` | Eliminar la declaración duplicada inline |
| Login se pide dos veces | `actualizarIconoSesion()` no se llamaba al cargar la página | Agregar `DOMContentLoaded` en `auth.js` |

---

## Reglas de desarrollo importantes

- **Siempre usar `.\maven\bin\mvn`**, no `mvn` global
- **Nunca agregar `const API_URL` inline** en las páginas HTML — ya viene de `api.js`
- **Nunca duplicar** `mostrarToast`, `abrirModal`, `cerrarModal` inline — vienen de `utils.js`
- Todos los HTML en `/pages/` deben cargar en orden: `utils.js` → `api.js` → `auth.js` → `cart.js`
- El JWT se guarda en `localStorage` con clave `jwtToken`. El userId en `userId`. El rol en `userRole`
- El modo actual (admin/cliente) se guarda en `localStorage` con clave `modoActual`

---

## Navegación actual del nav (todas las páginas)

```
Logo | Inicio · Productos · Categorías · Nosotros · Contacto · Mi cuenta | 🛒
```

- "Mi cuenta" → `perfil.html`
- 🛒 → `carrito.html`
- NO hay botón de login a la derecha (fue eliminado)
- El login se hace desde el modal que se abre con el botón en el nav o directamente desde `login.html`

---

## Objetivos a largo plazo (sin implementar)

1. **Testimonios** de clientes en perfil y página pública
2. **Sistema de referidos** (modelo existe, falta todo lo demás)
3. **Ruleta de premios** funcional en el frontend
4. **Subida de foto de perfil**
5. **Panel admin completo** (CRUD productos con imágenes, gestión de pedidos, reportes)
6. **Migrar `ddl-auto` a `validate`** cuando el esquema sea estable
7. **Notificaciones WhatsApp** (campo `facturaEnviadaWhatsapp` en Pedido sugiere integración futura)
8. **Paginación y filtros** en listado de productos
9. **Sistema de estados de pedido** con flujo completo (PENDIENTE → PROCESANDO → ENVIADO → ENTREGADO)
