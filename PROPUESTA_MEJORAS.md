# HOTCLICK — Propuesta de Mejoras 2026
> Basada en auditoría completa del proyecto (Mayo 2026)

---

## Estado actual del proyecto

| Área | Progreso |
|------|----------|
| Frontend (páginas públicas) | ✅ ~85% |
| Panel Admin (11 módulos) | ✅ ~80% |
| Backend / API REST | ✅ ~85% |
| Pasarela de pago PayXpert | ⚠️ 70% — falta API key producción |
| Emails transaccionales | ✅ ~75% |
| Envíos / Courier | ❌ 10% — solo costo fijo, sin integración |
| Correos de Costa Rica | ❌ 0% |
| Seguridad / Ops | ⚠️ 60% |

---

## 1. Frontend / UX

### 1.1 Tracking de pedidos para el cliente (PRIORIDAD ALTA)
**Problema:** El cliente paga pero no tiene visibilidad de su pedido después.
**Solución:** Página `/mis-pedidos` en el perfil con:
- Timeline visual: `PENDIENTE → PAGADO → EN_PREPARACION → ENVIADO → ENTREGADO`
- Número de pedido, productos, monto, fecha
- Estado actualizable por admin desde el panel

**Archivos a crear/modificar:**
- `frontend/src/pages/MisPedidosPage.jsx`
- `frontend/src/pages/admin/AdminOrders.jsx` (ya existe — agregar cambio de estado)
- `PedidoController.java` — endpoint GET `/api/pedidos/mis-pedidos`

---

### 1.2 Notificaciones por email post-venta (PRIORIDAD ALTA)
**Problema:** Al confirmar pago no se envía ningún email al cliente.
**Solución:** Email HTML automático al confirmar pago con:
- Resumen del pedido (productos, cantidades, precios)
- Número de pedido y estado
- Instrucciones de retiro o dirección de envío

**Archivos a modificar:**
- `PedidoService.java` — llamar a `JavaMailSender` al confirmar pago
- Crear template HTML para el email de confirmación

---

### 1.3 Galería de imágenes múltiples en producto (PRIORIDAD MEDIA)
**Problema:** El detalle de producto muestra solo una imagen.
**Solución:** Carrusel de hasta 5 imágenes con miniaturas.
Ya existe `ProductoImagen` en el modelo y `ProductoImagenRepository` — solo falta el UI.

**Archivos a modificar:**
- `frontend/src/pages/ProductDetailPage.jsx`
- `frontend/src/pages/admin/AdminNuevoProducto.jsx` (subir múltiples imágenes)

---

### 1.4 Reseñas y calificaciones de productos (PRIORIDAD MEDIA)
**Problema:** No hay forma de que los clientes califiquen productos.
**Solución:** Sistema de estrellas (1-5) + comentario, solo si el cliente compró el producto.
- Promedio de estrellas visible en ProductsPage y ProductDetailPage

**Archivos a crear:**
- `Resena.java` (modelo), `ResenaRepository.java`, `ResenaController.java`
- `frontend/src/components/ui/StarRating.jsx`
- `frontend/src/pages/ProductDetailPage.jsx` (sección de reseñas)

---

### 1.5 Dashboard de reportes mejorado (PRIORIDAD MEDIA)
**Problema:** AdminReportes existe pero tiene datos básicos.
**Solución:** Agregar:
- Gráfica de ventas por mes (recharts — ya instalado)
- Productos más vendidos (top 10)
- Exportar a CSV/Excel

---

## 2. Backend / Negocio

### 2.1 Pasarela de pago PayXpert — completar integración (PRIORIDAD CRÍTICA)
**Estado actual:** El código está completo (checkout, webhook, validación anti-fraude).
**Lo que falta:** Credenciales reales de producción de PayXpert.

**Acción requerida (no es código):**
1. Contactar PayXpert para obtener `ORIGINATOR_ID` y `ORIGINATOR_PASSWORD` de producción
2. Configurar en `docker-compose.yml` variables de entorno:
   ```
   PAYXPERT_ORIGINATOR_ID=tu_id_real
   PAYXPERT_ORIGINATOR_PASSWORD=tu_password_real
   ```
3. Configurar URL del webhook en el portal PayXpert apuntando a:
   `https://tu-dominio.com/api/webhooks/payxpert`

**Mejoras de código pendientes:**
- Reintento automático si falla el webhook (actualmente se pierde si hay error de red)
- Email de confirmación al cliente post-pago (ver punto 1.2)

---

### 2.2 Integración Correos de Costa Rica (PRIORIDAD ALTA)
**Estado actual:** Solo existe costo fijo de ¢2,000 por envío a domicilio.
**Plan ya definido en proyecto (3 etapas):**

**Etapa 1 — Manual (implementar ahora):**
- Admin ingresa número de guía manualmente en el pedido
- Email automático al cliente con el número de guía
- Link de tracking: `https://rastreo.correos.go.cr/?codigo={guia}`

**Etapa 2 — Semi-automático (cuando tengan volumen):**
- Formulario para generar etiqueta desde admin
- Correos CR API (si está disponible)

**Etapa 3 — Automatizado:**
- Webhook de Correos CR para actualizar estado automáticamente

**Archivos a crear/modificar:**
- `Pedido.java` — agregar campo `numeroGuia` y `urlTracking`
- `PedidoController.java` — endpoint PUT `/api/admin/pedidos/{id}/guia`
- `AdminOrders.jsx` — campo para ingresar guía
- Email automático al cliente con guía

---

### 2.3 Cupones de descuento (PRIORIDAD MEDIA)
**Solución:** Sistema simple de códigos de cupón:
- Admin crea cupones: código, % o monto fijo, fecha expiración, usos máximos
- Cliente ingresa código en el checkout
- Validación en backend antes de crear el pedido

**Archivos a crear:**
- `Cupon.java`, `CuponRepository.java`, `CuponController.java`
- `frontend/src/pages/CheckoutPage.jsx` — campo de cupón

---

### 2.4 Exportar reportes a Excel (PRIORIDAD MEDIA)
**Solución:** Endpoint que genera `.xlsx` con Apache POI (agregar dependencia al pom.xml):
- Reporte de ventas por rango de fechas
- Inventario actual con stock
- Lista de clientes

---

### 2.5 WhatsApp Business API (PRIORIDAD BAJA)
**Solución actual:** Botón flotante de WhatsApp (ya implementado).
**Mejora futura:** Integrar WhatsApp Business API (Meta) para enviar:
- Confirmación de pedido por WhatsApp
- Notificación cuando el pedido es enviado
- Esto requiere cuenta Business verificada en Meta

---

## 3. Seguridad / Ops

### 3.1 Variables de entorno en archivo .env (PRIORIDAD ALTA)
**Problema actual:** `SPRING_DATASOURCE_PASSWORD: "HotClick2026!"` está hardcodeada en `docker-compose.yml` (visible en Git).
**Solución:**
```bash
# Crear Hot_click_outlet/.env (agregar a .gitignore)
SPRING_DATASOURCE_PASSWORD=HotClick2026!
SUPABASE_SERVICE_KEY=sb_secret_...
MAIL_PASSWORD=rsluhsnfexlfjike
PAYXPERT_ORIGINATOR_ID=...
PAYXPERT_ORIGINATOR_PASSWORD=...
APP_URL=https://hotclick.cr
```
Y en `docker-compose.yml` usar `env_file: .env`

---

### 3.2 Dominio + HTTPS (PRIORIDAD ALTA)
**Para producción real se necesita:**
1. Dominio: `hotclick.cr` (registrar en NIC Costa Rica: ~$30/año)
2. Servidor: VPS en DigitalOcean/Linode (~$12/mes con 2GB RAM) o Railway/Render (más fácil)
3. SSL gratuito con Let's Encrypt + Nginx como reverse proxy

**Opciones de deploy recomendadas (de más fácil a más control):**

| Opción | Costo | Dificultad | Control |
|--------|-------|------------|---------|
| Railway | ~$5-20/mes | ⭐ Muy fácil | Bajo |
| Render | ~$7/mes | ⭐⭐ Fácil | Medio |
| DigitalOcean Droplet | ~$12/mes | ⭐⭐⭐ Medio | Alto |
| VPS propio | Varía | ⭐⭐⭐⭐ Difícil | Total |

---

### 3.3 Subir imagen Docker a registry (PRIORIDAD MEDIA)
**Para deploy automático:**
```bash
docker tag hotclick-outlet:latest ghcr.io/hotclickdev/hotclick-outlet:latest
docker push ghcr.io/hotclickdev/hotclick-outlet:latest
```
Esto permite hacer deploy desde cualquier servidor con solo:
```bash
docker pull ghcr.io/hotclickdev/hotclick-outlet:latest && docker-compose up -d
```

---

### 3.4 CI/CD con GitHub Actions (PRIORIDAD MEDIA)
**Flujo automatizado:**
```
git push → GitHub Actions → docker build → docker push → deploy en servidor
```
Sin necesidad de compilar manualmente cada vez que hay cambios.

---

### 3.5 Backups de base de datos (PRIORIDAD MEDIA)
**Supabase** ya hace backups automáticos en el plan gratuito (7 días).
**Mejora:** Exportar backup semanal a Google Drive o S3 como copia adicional.

---

### 3.6 Rate limiting y protección DDoS (PRIORIDAD BAJA)
**Agregar a Spring Security:**
- Rate limiting en `/api/auth/login` (máx 10 intentos por IP/minuto)
- Rate limiting en `/api/contacto` (evitar spam)
- Ya tienen el mecanismo de bloqueo de cuenta (intentos fallidos en `Usuario`)

---

## Priorización recomendada

### Inmediato (esta semana)
1. ✅ Variables en `.env` — sacar contraseña del Git
2. ✅ Email post-venta al cliente — confirmar pedido
3. ✅ Tracking manual con número de guía (Correos CR Etapa 1)

### Corto plazo (próximo mes)
4. Página "Mis pedidos" para el cliente
5. Credenciales PayXpert producción (depende de PayXpert)
6. Dominio + HTTPS + servidor real

### Mediano plazo (2-3 meses)
7. Galería de imágenes múltiples
8. Cupones de descuento
9. Sistema de reseñas
10. CI/CD con GitHub Actions

### Largo plazo (6 meses+)
11. WhatsApp Business API
12. Exportar reportes Excel
13. Correos CR Etapa 2 (API oficial)
14. App móvil (React Native reutilizando lógica)

---

*Documento generado: Mayo 2026 | HOTCLICK e-commerce Costa Rica*
