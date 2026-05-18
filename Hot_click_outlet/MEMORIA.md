# MEMORIA DEL PROYECTO — HOT_CLICK OUTLET
> Última actualización: 2026-05-18

---

## ¿Qué es este proyecto?

**Hot_click_outlet** es una tienda e-commerce de tecnología/electrónica en Costa Rica.
Los clientes pueden ver productos, agregarlos al carrito, hacer pedidos, pagar con tarjeta
(PayXpert), y ver su historial con garantías. Los administradores gestionan productos,
bodegas, categorías, finanzas y pedidos desde un panel React.

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Backend | Spring Boot 3.4.4, Java 24 |
| Base de datos | PostgreSQL en Supabase (Transaction Pooler puerto 6543) |
| Seguridad | Spring Security + JWT (stateless) + 2FA (TOTP) |
| Frontend | React 19 + Vite (en `Hot_click_outlet/frontend/`) |
| State | Zustand (auth + carrito) + React Query |
| Estilos | TailwindCSS 4 |
| Build | Maven local en `maven/bin/` → usar `.\maven\bin\mvn` |
| Imágenes | Supabase Storage (bucket `productos`) |
| Pagos | PayXpert + PayPal Orders API v2 |
| Email | SMTP Gmail (hotclick.cr@gmail.com) |

**URL local:** `http://localhost:8080`  
**Dev frontend:** `http://localhost:3000` (proxy `/api` → 8080)

---

## Credenciales de admin

| Campo | Valor |
|-------|-------|
| Correo | `admin@hotclick.com` |
| Contraseña | `Admin1234!` |
| Rol | `ADMIN_IT` |

El usuario admin es creado automáticamente por `DataSeeder.java` al iniciar la app.

---

## Base de datos

- **Host:** Supabase (aws-1-us-east-2.pooler.supabase.com:6543)
- **`ddl-auto=none`** — El esquema se gestiona manualmente con el archivo `Actualizado.sql`
- **Naming strategy:** `PhysicalNamingStrategyStandardImpl` — los nombres de tabla/columna se usan exactamente como están en las entidades (minúsculas)
- **Moneda:** CRC (₡), enteros sin decimales para todos los montos

### Esquema (resumen por módulo)

| Módulo | Tablas principales |
|--------|-------------------|
| Usuarios/Auth | `hot_click_usuario_tb`, `hot_click_rol_tb`, `hot_click_usuario_rol_tb`, `hot_click_sesion_tb`, `hot_click_codigo_otp_tb` |
| Ubicaciones | `hot_click_pais_tb` → `hot_click_provincia_tb` → `hot_click_canton_tb` → `hot_click_distrito_tb` → `hot_click_barrio_tb` |
| Bodegas | `hot_click_bodega_tb`, `hot_click_bodega_usuario_tb`, `hot_click_bodega_historial_tb` |
| Catálogo | `hot_click_producto_tb`, `hot_click_producto_imagen_tb`, `hot_click_categoria_tb`, `hot_click_marca_tb`, `hot_click_etiqueta_tb` |
| Variantes | `hot_click_producto_variante_tb`, `hot_click_producto_atributo_tb`, `hot_click_producto_atributo_valor_tb` |
| Inventario | `hot_click_movimiento_inventario_tb`, `hot_click_tipo_movimiento_tb`, `hot_click_inventario_periodico_tb` |
| Carrito | `hot_click_carrito_tb`, `hot_click_carrito_item_tb`, `hot_click_carrito_descuento_tb` |
| Pedidos | `hot_click_pedido_tb`, `hot_click_pedido_item_tb`, `hot_click_pedido_historial_estado_tb` |
| Facturación | `hot_click_factura_tb`, `hot_click_factura_detalle_tb` |
| Pagos | `hot_click_pago_tb`, `hot_click_transaccion_pago_tb`, `hot_click_webhook_event_tb`, `hot_click_payment_log_tb` |
| Cotizaciones | `hot_click_cotizacion_tb`, `hot_click_cotizacion_detalle_tb`, `hot_click_cliente_cotizacion_tb` |
| WhatsApp | `hot_click_plantilla_whatsapp_tb`, `hot_click_whatsapp_envio_tb` |
| Gamificación | `hot_click_premio_tb`, `hot_click_giro_ruleta_tb`, `hot_click_resultado_ruleta_tb`, `hot_click_referido_tb` |
| Finanzas | `hot_click_finanza_producto_tb`, `hot_click_finanza_global_tb`, `hot_click_gasto_operativo_tb` |
| Análisis | `hot_click_analisis_producto_tb`, `hot_click_sugerencia_compra_tb`, `hot_click_dashboard_kpi_tb` |
| Sistema | `hot_click_auditoria_tb`, `hot_click_log_error_tb`, `hot_click_alerta_tb` |
| Config | `hot_click_configuracion_moneda_tb`, `hot_click_configuracion_impuesto_tb` |

### Triggers del esquema

| Trigger | Función | Acción |
|---------|---------|--------|
| `tg_validar_stock_carrito` | `fn_validar_stock_carrito()` | Valida stock antes de agregar al carrito |
| `tg_marcar_unico_vendido` | `fn_marcar_unico_vendido()` | Marca producto único como vendido al crear pedido item |
| `tg_actualizar_total_carrito` | `fn_actualizar_total_carrito()` | Recalcula total del carrito en cada cambio |

---

## Estructura de archivos clave (backend)

```
Hot_click_outlet/src/main/java/com/hotclick/
├── config/
│   ├── DataSeeder.java          ← Siembra roles y admin al arrancar
│   ├── SecurityConfig.java      ← JWT + CORS + rutas públicas/privadas
│   └── WebConfig.java
├── controller/
│   ├── AuthController.java      ← POST /api/auth/login, /register, 2FA, reset
│   ├── UsuarioController.java   ← GET/PUT /api/usuarios/{id}
│   ├── AdminUsuarioController.java ← Gestión de usuarios (ADMIN_IT)
│   ├── ProductoController.java  ← CRUD /api/productos/**
│   ├── PedidoController.java    ← GET/POST /api/pedidos/**
│   ├── CarritoController.java   ← /api/carrito/**
│   ├── BodegaController.java    ← /api/bodegas/**
│   ├── CategoriaController.java ← /api/categorias/**
│   ├── CotizacionController.java← /api/cotizaciones/**
│   ├── DashboardController.java ← /api/admin/dashboard/**
│   ├── PaymentController.java   ← /api/payment/**
│   ├── WebhookController.java   ← /api/webhooks/payxpert
│   ├── PremioController.java    ← /api/ruleta/**
│   ├── StockController.java     ← /api/stock/**
│   ├── VentaController.java     ← /api/ventas/**
│   ├── HealthController.java    ← GET /api/health
│   └── SpaController.java       ← Redirige SPA → index.html
├── model/
│   ├── Usuario.java             ← hot_click_usuario_tb
│   ├── Rol.java                 ← hot_click_rol_tb
│   ├── Producto.java            ← hot_click_producto_tb
│   ├── Categoria.java / Marca.java / Bodega.java
│   ├── ProductoImagen.java
│   ├── Pedido.java / PedidoItem.java
│   ├── Carrito.java / CarritoItem.java
│   ├── Pago.java / TransaccionPago.java / PaymentLog.java / WebhookEvent.java
│   ├── Premio.java / GiroRuleta.java / ResultadoRuleta.java
│   ├── Cotizacion.java / MovimientoStock.java
│   ├── Estado.java / Referido.java
│   └── BaseEntity.java
├── security/
│   ├── JwtUtil.java
│   └── JwtRequestFilter.java
├── service/         ← 15 servicios (ver lista completa abajo)
├── repository/      ← 19 repositorios JPA
├── dto/             ← 9 DTOs
└── utils/Constants.java  ← ROL_ADMIN_IT, ROL_ADMIN_CLIENTE, ROL_USUARIO_FINAL
```

---

## Estructura del frontend (React)

```
Hot_click_outlet/frontend/src/
├── pages/
│   ├── HomePage.jsx / ProductsPage.jsx / ProductDetailPage.jsx
│   ├── CartPage.jsx / CheckoutPage.jsx
│   ├── LoginPage.jsx / RegisterPage.jsx / ProfilePage.jsx
│   ├── NosotrosPage.jsx / ContactoPage.jsx / InformacionPage.jsx
│   ├── PaymentStatusPage.jsx
│   └── admin/
│       ├── AdminDashboard.jsx / AdminProducts.jsx / AdminOrders.jsx
│       ├── AdminUsers.jsx / AdminCategories.jsx / AdminWarehouses.jsx
│       ├── AdminNewSale.jsx / AdminFinanzas.jsx / AdminReportes.jsx
│       └── AdminLayout.jsx
├── components/
│   ├── layout/Navbar.jsx / BottomNav.jsx / Footer.jsx
│   └── ui/ Button, Input, Badge, Modal, Toast, Spinner
├── services/
│   ├── api.js           ← Axios instance con interceptor JWT
│   ├── authService.js / productService.js / orderService.js
│   ├── paymentService.js / cartService.js
├── store/
│   ├── authStore.js     ← Zustand: token, userId, userRole
│   └── cartStore.js     ← Zustand: items, totales
├── hooks/usePayment.js
├── utils/format.js      ← Formateo de moneda CRC
└── App.jsx              ← Rutas, ProtectedRoute, AdminRoute
```

---

## API endpoints relevantes

### Autenticación (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login → JWT + userId + role |
| POST | `/api/auth/register` | No | Registro (con email verification) |
| POST | `/api/auth/2fa/setup` | JWT | Iniciar 2FA (TOTP) |
| POST | `/api/auth/2fa/verify` | No | Verificar 2FA durante login |
| POST | `/api/auth/forgot-password` | No | Solicitar reset de contraseña |
| POST | `/api/auth/reset-password` | No | Resetear contraseña con OTP |

### Productos (`/api/productos`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/productos` | No | Catálogo paginado |
| GET | `/api/productos/destacados` | No | Productos destacados |
| GET | `/api/productos/{id}` | No | Detalle de producto |
| POST | `/api/productos` | JWT | Crear producto |
| PUT | `/api/productos/{id}` | JWT | Actualizar producto |
| DELETE | `/api/productos/{id}` | JWT | Eliminar producto |
| POST | `/api/productos/imagen` | JWT | Subir imagen a Supabase |

### Pedidos (`/api/pedidos`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/pedidos` | JWT | Crear pedido |
| GET | `/api/pedidos/{id}` | JWT | Detalle de pedido |
| GET | `/api/pedidos/usuario/{id}` | JWT | Historial del usuario |
| GET | `/api/pedidos` | JWT admin | Listar todos |
| PUT | `/api/pedidos/{id}/estado` | JWT admin | Cambiar estado |

### Pagos (`/api/payment`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/payment/checkout` | JWT | Iniciar pago PayXpert |
| GET | `/api/payment/status/{orderId}` | JWT | Estado del pago |
| POST | `/api/webhooks/payxpert` | No | Webhook de PayXpert |
| POST | `/api/payment/paypal/create-order` | JWT | Crear orden PayPal → retorna approvalUrl |
| POST | `/api/payment/paypal/capture/{paypalOrderId}` | JWT | Capturar pago aprobado |
| POST | `/api/webhooks/paypal` | No | Webhook PayPal (eventos asíncronos) |

### Pedidos extendidos (`/api/pedidos`)
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| PUT | `/api/pedidos/{id}/estado` | JWT admin | Cambiar estado |
| PUT | `/api/pedidos/{id}/envio` | JWT admin | Marcar enviado + guía Correos CR + costo |
| DELETE | `/api/pedidos/{id}` | JWT admin | Eliminar pedido |

### Otros
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health` | No | Estado del servidor |
| GET | `/api/ruleta/premios` | No | Premios disponibles |
| GET | `/api/categorias/**` | No/JWT | Gestión categorías |
| GET | `/api/admin/dashboard/**` | JWT admin | KPIs y métricas |

---

## Flujo de autenticación (React)

1. Usuario llena `LoginPage.jsx` → llama `authService.login()`
2. `api.js` hace `POST /api/auth/login`
3. Backend responde `{ token, userId, role }`
4. `authStore.js` (Zustand) guarda token + userId + role
5. Si el token tiene 2FA pendiente → redirige a pantalla de verificación 2FA
6. Según rol: admin → `/admin/dashboard`, usuario → `/perfil` o página anterior
7. `api.js` tiene interceptor que agrega `Authorization: Bearer <token>` a cada request

---

## Flujo de pagos (PayXpert)

1. Checkout → `POST /api/payment/checkout` → retorna `redirectUrl`
2. Frontend redirige al usuario a `redirectUrl` (iframe/ventana PayXpert)
3. Usuario paga → PayXpert llama `POST /api/webhooks/payxpert`
4. Webhook actualiza `hot_click_pago_tb` + `hot_click_transaccion_pago_tb`
5. Usuario retorna a `/pago/exito` o `/pago/cancelado` → `PaymentStatusPage.jsx`

---

## Roles del sistema

| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `ROL_ADMIN_IT` | `ADMIN_IT` | Máximo acceso, gestiona sistema y usuarios |
| `ROL_ADMIN_CLIENTE` | `ADMIN_CLIENTE` | Administrador de negocio |
| `ROL_USUARIO_FINAL` | `USUARIO_FINAL` | Cliente registrado |

---

## Garantía de productos

- **Duración:** 40 días desde `fechaEntregaReal` del pedido
- **Colores en UI:**
  - Verde: quedan > 15 días
  - Amarillo: quedan 1–15 días
  - Rojo: expirada

---

## Pendientes / deuda técnica

| Feature | Estado | Notas |
|---------|--------|-------|
| Testimonios | Sin implementar | Tabla `hot_click_testimonio_tb` existe en schema pero no hay modelo JPA ni endpoints |
| Referidos | Sin implementar | Tabla `hot_click_referido_tb` + modelo `Referido.java` existen, sin controller ni UI |
| Ruleta frontend | Parcial | Backend completo (`/api/ruleta/**`), UI no integrada claramente |
| Foto de perfil | Sin implementar | Campo `foto_perfil_url` existe, sin upload UI ni endpoint |
| Cotizaciones | Parcial | Controller existe, revisar si UI admin está completa |
| Variantes de producto | Sin implementar | Tablas `hot_click_producto_variante_tb` en schema, sin modelo JPA |
| Sistema de ubicaciones | Sin UI | Tablas Pais/Provincia/Canton/Distrito/Barrio en schema, sin datos cargados |
| Análisis automático | Sin implementar | Tablas de análisis en schema, sin lógica de cálculo |

---

## Problemas históricos resueltos

| Error | Causa | Solución |
|-------|-------|----------|
| `max clients` error en BD | Session pooler (puerto 5432) con conexiones directas | Migrar a Transaction Mode pooler (puerto 6543) + `prepareThreshold=0` |
| `PSQLException: column null values` | `ddl-auto=update` + columna NOT NULL sin default | Cambio a `ddl-auto=none`, migraciones manuales con `Actualizado.sql` |
| HTTP 403 en rutas SPA | SecurityConfig no permitía rutas React | Agregar `/**` y rutas específicas al `permitAll` |
| 401 en `/api/auth/login` | CORS preflight bloqueado | Agregar `CorsConfigurationSource` correcto en `SecurityConfig` |
| Stock negativo en carrito | Sin validación de stock | Trigger `tg_validar_stock_carrito` en BD + `StockInsuficienteException` |

---

## Reglas de desarrollo importantes

- **Siempre usar `.\maven\bin\mvn`**, no `mvn` global
- **`ddl-auto=none`** — nunca cambiar a `create` en producción; todo cambio de esquema va en `Actualizado.sql`
- El frontend React se compila con `npm run build` en `Hot_click_outlet/frontend/` → output en `src/main/resources/static/`
- En desarrollo usar `npm run dev` en el frontend (puerto 3000); el proxy redirige `/api` al backend (8080)
- Monedas siempre en enteros (₡ colones), sin decimales
- Naming strategy: PhysicalNamingStrategyStandardImpl — los nombres en entidades JPA deben ser **exactamente iguales** a los nombres en BD (minúsculas)

---

## Objetivos a largo plazo

1. **Testimonios** con moderación y visualización pública
2. **Sistema de referidos** con giros de ruleta como recompensa
3. **Ruleta de premios** integrada en el frontend
4. **Subida de foto de perfil** via Supabase Storage
5. **Variantes de producto** (tallas, colores) con UI
6. **Sistema de ubicaciones** completo con datos de Costa Rica
7. **Análisis automático de inventario** con sugerencias de recompra
8. **Notificaciones WhatsApp** via API (campo `factura_enviada_whatsapp` en pedido)
9. **Sistema de cotizaciones** completo con envío por WhatsApp
