# Matriz de pruebas Fase 2 · Etapa A (rol × flujo)

**Estado del plan:** aprobado por Andrés el 30-oct-2026 a las 5:50 PM CR, incluido el deploy a staging del master final; el POS queda incluido y los respaldos pasan a la Fase 3. **Fuente: el Mentor** (no hay confirmación directa de Andrés en estos archivos).
**Pendientes antes de iniciar:** MED de precio de oferta del área 3; MEDIO-2 del área 6; re-auditoría del área 8 (#382). Área 2 quedó ✅ en `23f8c156`.

**Roles de equipo reales (adf05174):** PROPIETARIO, ADMIN, EDITOR, LECTOR (`EquipoController.java:24`, `PropietarioGuard.java:31`) y CAJERO (`PosAnulacionService.java:45`). "Contador" y "vendedor" no existen en el código ni en la UI: **supuesto** contador = LECTOR y vendedor = EDITOR.
**Cajero:** decidido (a), según el Mentor: Dev Marketplace hará CAJERO asignable y corregirá el alta de productos por cajero y el 403 del ADMIN en visibilidad. Las filas del cajero quedan preparadas con la semilla 02; repetir desde la app cuando entre el PR.
**Gracia:** `hotclick.billing.dias-gracia=8` (`application.properties:549`). Detalle en `datos-prueba.md`.

Total de filas: 88. Hash: master `adf05174` (solo lectura), se confirma en el paso 0. Resultado: pendiente / OK / FALLA (con severidad). Evidencia sin datos reales, SINPE ni teléfonos; anotar M/E (móvil/escritorio).

| # | rol | flujo | hash | resultado | evidencia |
|---|---|---|---|---|---|
| 1 | Invitado (sin sesión) | Navegar catálogo y buscar | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 2 | Invitado (sin sesión) | Carrito de dos tiendas | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 3 | Invitado (sin sesión) | Checkout invitado con ONVO test | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 4 | Invitado (sin sesión) | Intentar rutas privadas (debe pedir login) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 5 | Invitado (sin sesión) | Móvil 360 px y escritorio | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 6 | Cliente consumidor | Registro y login (correo con mayúsculas/espacios) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 7 | Cliente consumidor | Recuperar contraseña | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 8 | Cliente consumidor | Cambiar correo (toma de cuenta) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 9 | Cliente consumidor | Exportar y borrar datos (Ley 8968) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 10 | Cliente consumidor | Compra completa ONVO test | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 11 | Cliente consumidor | Reembolso y pago fallido con reintento | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 12 | Cliente consumidor | Envío GAM / fuera GAM y #447 (provincia/cantón inválido = 400) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 13 | Cliente consumidor | Sesión expirada / token tras desactivar | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 14 | Cliente consumidor | Asistente IA dentro del tope | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 15 | Cliente consumidor | Notificaciones correo | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 16 | Cliente consumidor | Móvil 360 px y escritorio | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 17 | Emprendedor (dueño) | Registro y alta de tienda | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 18 | Emprendedor (dueño) | Periodo gratis 70 primeros (configurable) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 19 | Emprendedor (dueño) | CRUD productos y carga masiva CSV | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 20 | Emprendedor (dueño) | Recibir pedido y cambiar estado | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 21 | Emprendedor (dueño) | POS en plan Emprendedor | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 22 | Emprendedor (dueño) | Prohibido: datos de otra tienda (IDOR) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 23 | Emprendedor (dueño) | Upgrade a Pyme | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 24 | Emprendedor (dueño) | Cuenta en gracia / impago / vencida (tienda pausada no vende) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 25 | Emprendedor (dueño) | Móvil 360 px y escritorio | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 26 | Pyme - PROPIETARIO (dueño) | Invitar equipo y asignar roles | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 27 | Pyme - PROPIETARIO (dueño) | Multi-bodega (dos bodegas cobran una vez) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 28 | Pyme - PROPIETARIO (dueño) | Facturación (emisión automática apagada) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 29 | Pyme - PROPIETARIO (dueño) | Downgrade / cancelación | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 30 | Pyme - PROPIETARIO (dueño) | Sucursal crear/renombrar/desactivar | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 31 | Pyme - ADMIN equipo | Gestión de productos y pedidos | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 32 | Pyme - ADMIN equipo | Sucursal crear/renombrar/desactivar | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 33 | Pyme - ADMIN equipo | Prohibido: billing y BAJO del ADMIN | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 34 | Pyme - EDITOR (vendedor/operador, supuesto) | Pedidos e inventario permitido | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 35 | Pyme - EDITOR (vendedor/operador, supuesto) | Prohibido: Executive, Forecast, Inventario, AiCopilot = 403 | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 36 | Pyme - EDITOR (vendedor/operador, supuesto) | Prohibido: finanzas | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 37 | Pyme - LECTOR (contador, supuesto) | Lectura de reportes/facturas | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 38 | Pyme - LECTOR (contador, supuesto) | Prohibido: cualquier escritura = 403 | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 39 | Negocio Plus - PROPIETARIO (dueño) | Billing: prueba, cobro, impago, cancelación (webhook ONVO test) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 40 | Negocio Plus - PROPIETARIO (dueño) | Upgrade/downgrade de plan | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 41 | Negocio Plus - PROPIETARIO (dueño) | Roles internos y 2FA (recuperación TOTP vacía = 400) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 42 | Negocio Plus - PROPIETARIO (dueño) | Asistente/Copilot dentro del tope | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 43 | Negocio Plus - PROPIETARIO (dueño) | Telegram: vincular/revincular | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 44 | Negocio Plus - ADMIN/EDITOR/LECTOR | Permitido y prohibido por rol (matriz rol×endpoint) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 45 | Cajero POS (rol_en_empresa CAJERO) | Abrir/cerrar caja y turno (arqueo, diferencia) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | preparada con la semilla 02 | repetir desde la app cuando entre el PR de Dev Marketplace (CAJERO asignable) |
| 46 | Cajero POS (rol_en_empresa CAJERO) | Venta efectivo | pendiente (master actual adf05174, confirmar al hacer el paso 0) | preparada con la semilla 02 | repetir desde la app cuando entre el PR de Dev Marketplace (CAJERO asignable) |
| 47 | Cajero POS (rol_en_empresa CAJERO) | Venta tarjeta ONVO test y QR | pendiente (master actual adf05174, confirmar al hacer el paso 0) | preparada con la semilla 02 | repetir desde la app cuando entre el PR de Dev Marketplace (CAJERO asignable) |
| 48 | Cajero POS (rol_en_empresa CAJERO) | Anulación y devolución (nota de crédito + stock) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | preparada con la semilla 02 | repetir desde la app cuando entre el PR de Dev Marketplace (CAJERO asignable) |
| 49 | Cajero POS (rol_en_empresa CAJERO) | Stock 0 / otra bodega / última unidad vs online | pendiente (master actual adf05174, confirmar al hacer el paso 0) | preparada con la semilla 02 | repetir desde la app cuando entre el PR de Dev Marketplace (CAJERO asignable) |
| 50 | Cajero POS (rol_en_empresa CAJERO) | Prohibido: reportes, cambiar precios, caja de otro, tienda B | pendiente (master actual adf05174, confirmar al hacer el paso 0) | preparada con la semilla 02 | repetir desde la app cuando entre el PR de Dev Marketplace (CAJERO asignable) |
| 51 | Cajero POS (rol_en_empresa CAJERO) | No vender con turno cerrado | pendiente (master actual adf05174, confirmar al hacer el paso 0) | preparada con la semilla 02 | repetir desde la app cuando entre el PR de Dev Marketplace (CAJERO asignable) |
| 52 | Admin plataforma | Envíos (zonas y tarifas) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 53 | Admin plataforma | Planes y precios (PLANES_MONEDA) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 54 | Admin plataforma | Moderación de productos/reseñas | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 55 | Admin plataforma | Soporte y desbloqueo de cuentas | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 56 | Admin plataforma | Emisión a nombre de HotClick | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 57 | Admin plataforma | Endpoints destructivos no disparables (flags) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 58 | Soporte Telegram | Vincular cuenta y comandos | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 59 | Soporte Telegram | Alta de producto por Telegram (aprobación, bodega ajena 400) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 60 | Soporte Telegram | Pausa y bloqueo 3/s | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 61 | Soporte Telegram | Notificaciones Telegram | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 62 | Cruzado | Compra completa ONVO test (split y comisión al colón) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 63 | Cruzado | POS -> inventario -> factura | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 64 | Cruzado | Suscripción: prueba, cobro, impago, cancelación | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 65 | Cruzado | Webhooks ONVO: duplicado, fuera de orden, monto distinto | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 66 | Cruzado | Envíos GAM / fuera GAM | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 67 | Cruzado | Perfiles dev/prod | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 68 | Cuenta en gracia | Tienda sigue vendiendo con aviso de gracia | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 69 | Cuenta en gracia | Pago dentro de la gracia reactiva el plan (solo webhook confirmado) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 70 | Cuenta en impago | Tienda pausada no vende (online ni POS) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 71 | Cuenta en impago | Reintento de pago fallido ONVO test | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 72 | Cuenta en impago | Reconsulta ONVO antes de la baja (GET caído = INCIERTA) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 73 | Cuenta vencida | Acceso restringido y datos conservados | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 74 | Cuenta vencida | Reactivación por pago | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 75 | Cambio de plan | Upgrade Emprendedor -> Pyme | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 76 | Cambio de plan | Upgrade Pyme -> Negocio Plus | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 77 | Cambio de plan | Downgrade Negocio Plus -> Pyme (pierde roles/billing) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 78 | Cambio de plan | Downgrade Pyme -> Emprendedor | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 79 | Cambio de plan | Fin del periodo gratis de los 70 primeros -> cobro | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 80 | Pyme - EDITOR (vendedor/operador, supuesto) | BAJO: menú 'MIS SUCURSALES' no debe mostrarse/operar para EDITOR | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 81 | Pyme - LECTOR (contador, supuesto) | BAJO: menú 'MIS SUCURSALES' no debe mostrarse/operar para LECTOR | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 82 | Re-QA staging | #444 re-QA en staging | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 83 | Re-QA staging | #447 re-QA en staging (provincia/cantón inválido = 400, zona y tarifa en pedido, dirección canónica) | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 84 | Cuenta en gracia | Día 8 vende normal; día 9 pasa a SUSPENDIDO_IMPAGO | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 85 | Cuenta en impago | Admin 'Dar 3 días extra' (EXTENSION_IMPAGO): solo pedidos de la gracia | pendiente (master actual adf05174, confirmar al hacer el paso 0) | pendiente |  |
| 86 | PENDIENTE DE DECISIÓN | Asignación de cajero tras V135: la app no permite asignar CAJERO (EquipoController.java:24, EmpresaAdminService.java:36); solo la semilla lo crea | 916e61f0 | Decidido (a), según el Mentor; pendiente PR |  |
| 87 | Cajero POS (rol_en_empresa CAJERO) | cajero NO puede crear productos (POST /api/productos) | pendiente (PR Dev Marketplace) | HALLAZGO MEDIO confirmado por QA: responde 200 (ProductoController.java:123-124 solo revisa hasAnyRole, no rol_en_empresa); se corrige en el PR de Dev Marketplace del cajero | /workspace/qa/paso0/evid/reval/crear-producto.txt |
| 88 | ADMIN (rol_en_empresa ADMIN) | ADMIN de equipo puede cambiar la visibilidad de la tienda | pendiente (PR Dev Marketplace) | HALLAZGO BAJO: 403 al ADMIN de equipo (PropietarioGuard.java:42-44, falla cerrado); pendiente del PR | /workspace/qa/paso0/evid/reval/matriz.txt |
