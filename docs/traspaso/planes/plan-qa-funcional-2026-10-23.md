# Plan de pruebas funcionales QA — HotClick (23/10/2026)

Base revisada en solo lectura: `origin/master` 70cf3639 (`Hot_click_outlet` backend + `Hot_click_outlet/frontend`). Sin código tocado, sin commits, sin llamadas live.

## 0. Reglas obligatorias (todos los QA)
1. **Nunca producción.** Solo ambiente de pruebas/staging con `PAYMENTS` ONVO en sandbox (llaves `onvo_test_`, que **no se imprimen** ni se pegan en reportes).
2. **Cero cobros reales.** Solo tarjeta 4242 (y las de rechazo del sandbox ONVO). Si aparece una llave que no empiece con `onvo_test_`, se para todo y se reporta.
3. **Todo se crea desde la interfaz de HotClick** (registro, negocio, productos, pedidos). Nada de SQL ni de llamadas directas a la API para "arreglar" datos. Si no se puede hacer desde la UI → se reporta como bug.
4. Tilopay está descartado: si alguna pantalla lo ofrece, es bug (el código en master todavía tiene ~29 archivos con Tilopay, p. ej. `/api/billing/tilopay/*`, `/pago/tilopay/respuesta`).
5. Datos de prueba ficticios: correos `qaN+caso@…`, sin cédulas, teléfonos ni SINPE reales.
6. Al terminar: cancelar suscripciones del sandbox y dejar evidencia en log sin secretos.

## 1. Plantilla de bug
```
ID: QA<n>-<nnn>   Título:
Rol/cuenta usada:            Ruta/pantalla:
Pasos: 1. … 2. … 3. …
Esperado:
Obtenido:
Evidencia: captura/video, hora (CR), nº de pedido, id sandbox (sin llaves)
Severidad: Crítica (dinero/seguridad/bloquea flujo) | Alta | Media | Baja
¿Se pudo hacer desde la UI?: sí/no (si no → indicar qué faltó)
```

## 2. Tabla resumen
| QA | Foco | Rutas principales | Depende de | Orden |
|---|---|---|---|---|
| QA 1 | Emprendedor | `/emprende`, `/registro`, `/registrar-negocio`, `/emprendedor/*` | ambiente + sandbox | 1 (paralelo) |
| QA 2 | PYME | `/para-pymes`, `/registro-empresa`, `/registro-empresa/activar-plan`, `/pyme/*` | ídem | 1 (paralelo) |
| QA 3 | Negocio Plus | `/negocio-plus-plan`, `/negocio-plus/*` | ídem | 1 (paralelo) |
| QA 4 | Cliente consumidor | `/registro`, `/login`, `/perfil`, `/mis-pedidos` | ídem | 1 (paralelo) |
| QA 5 | Compra punta a punta | `/carrito`, `/checkout`, `/pago/exito`, `/seguimiento/:token`, `/admin/*` | cuentas de QA 2 y QA 4 | 2 |
| QA 6 | POS y SINPE | `/caja`, `/pos/pago/:token`, `/api/pos/qr/*` | negocio de QA 2 | 2 |
| QA 7 | Admin y seguridad de roles | `/admin/*`, todos los paneles | cuentas de QA 1–4 | 3 |
| QA 8 | Webhooks, renovaciones, móvil/UX/i18n | `/api/webhooks/onvo`, `/api/billing/*` | suscripciones de QA 1–3 | 3 |

Orden: **Fase 1** QA 1–4 en paralelo (crean cuentas) → **Fase 2** QA 5 y 6 usan esas cuentas → **Fase 3** QA 7 y 8 (cruzado, regresión). Pendientes de merge que afectan resultados: #256 (cancelación de suscripción: en master la ruta `/subscriptions/{id}/cancel` da 404 en ONVO, bug confirmado por QA 2), #245 (confirmación SINPE del POS, V186), rama de reembolsos pendientes.

## 3. Casos comunes a QA 1–4 (cada uno con su tipo de cuenta)
| # | Caso | Criterio de aceptación |
|---|---|---|
| C1 | Registro con correo nuevo (`/api/auth/register` / `registro-empresa`) | Se envía código; tras `verify-registration`/`verificar-correo-negocio` la cuenta queda activa |
| C2 | Registro con correo repetido | Mensaje claro en español, sin crear duplicado |
| C3 | Reenviar código | Llega nuevo código; el viejo deja de servir |
| C4 | Login / logout / refresh | Entra al panel correcto del rol; logout invalida sesión |
| C5 | Recuperar contraseña (`/recuperar-contrasena` → forgot/verify-code/reset) | Código caduca; la contraseña vieja ya no sirve |
| C6 | Cambiar contraseña y 2FA (correo y TOTP, códigos de recuperación) | Activar/desactivar funciona; login pide 2FA |
| C7 | Textos | Español CR con voseo, sin errores técnicos crudos |

## 4. QA 1 — Emprendedor
**Alcance:** registro, onboarding rápido, plan Emprendedor (gratis primeros 70, luego US$9/mes, comisión 9%), catálogo.
**Datos:** 2 cuentas (`qa1+a`, `qa1+b`), 5 productos ficticios con foto, tarjeta 4242.
| # | Caso | Criterio |
|---|---|---|
| E1 | C1–C7 | ver §3 |
| E2 | `/emprende` muestra cupos (`/api/public/emprende/cupos`) | El contador baja al registrarse un emprendedor gratis |
| E3 | Cliente sube a emprendedor (`/api/auth/upgrade-emprendedor`) | Conserva su historial de comprador y obtiene `ROLE_EMPRENDEDOR` |
| E4 | Onboarding por pasos (`/api/emprendedor/negocio-rapido/onboarding/{paso}`) | Puede salir y retomar en el mismo paso |
| E5 | Cupo agotado (simulado en staging por admin, no por SQL) | Se ofrece US$9/mes; cobro sandbox con 4242 queda pagado |
| E6 | Crear/editar/despublicar producto, stock, imágenes | Aparece en `/emprendimientos/:slug` y `/productos/:id` |
| E7 | Comisión mostrada | 9%; no hardcodeada en pantalla distinta a la configuración |
| E8 | Tienda rápida (`/tienda-rapida/:token`) | Link público abre catálogo correcto |
**Dependencias:** ambiente sandbox. Pendiente de decisión de Andrés: qué pasa con el cupo al darse de baja (marcar resultado como "observación" hasta que se decida).

## 5. QA 2 — PYME
**Alcance:** `/registro-empresa` → `/registro-empresa/activar-plan` → `/pyme/*`; plan US$24, 7.5%.
**Datos:** negocio "QA PYME Prueba", 10 productos, 1 colaborador (`/api/...equipo`), sucursal.
| # | Caso | Criterio |
|---|---|---|
| P1 | C1–C7 | §3 |
| P2 | Elegir plan PYME y pagar (`/api/billing/checkout/{planId}`) con 4242 | Suscripción activa; factura = US$24 (ONVO envía céntimos: 2400) |
| P3 | Tarjeta rechazada del sandbox | Plan NO se activa (fail-closed), mensaje claro |
| P4 | Ver `/api/billing/suscripcion` y facturas | Datos coinciden con ONVO |
| P5 | Cambiar plan (`cambiar-plan`) y cancelar (`cancelar`) | Cancelación al fin de período; **conocido: falla en master hasta #256** |
| P6 | Multi-negocio (`nuevo-negocio`, `mis-negocios`, `seleccionar-empresa`, `/seleccionar-negocio`) | Datos de un negocio no se ven en otro |
| P7 | Catálogo, inventario, bodegas, sucursales | CRUD desde UI completo |
| P8 | Cuenta conectada ONVO no ACTIVE | Cobros salen a nombre de HotClick y se indica en panel |
**Importante:** este negocio es el que recibe pedidos en QA 5 y vende en POS en QA 6. Entregar credenciales por canal interno, nunca en el reporte.

## 6. QA 3 — Negocio Plus
**Alcance:** `/negocio-plus-plan`, `/negocio-plus/*`, plan US$49, 6%.
Casos N1 = C1–C7; N2 pago 4242 → factura US$49; N3 rechazo → no activa; N4 funciones exclusivas del plan visibles solo en Plus (comparar con PYME; lo que la página `/planes` prometa y no exista → bug); N5 bajar de Plus a PYME; N6 comisión 6% en la configuración; N7 equipo/roles internos.
**Datos:** negocio "QA Plus Prueba", 10 productos. **Dependencia:** ninguna.

## 7. QA 4 — Cliente consumidor
**Alcance:** `/registro`, `/login`, `/perfil`, `/wishlist`, `/carrito`, `/mis-pedidos`, invitado.
Casos K1 = C1–C7; K2 navegación `/productos`, `/categorias`, `/buscar/foto`, `/tiendas/:provincia`; K3 wishlist y carrito persisten tras logout/login; K4 carrito abandonado (`/recuperar-carrito/:token`); K5 perfil y direcciones; K6 consentimientos/cookies; K7 un cliente NO entra a `/pyme/*`, `/admin/*`, `/emprendedor/*`.
**Datos:** `qa4+persona1` (será la **Persona 1** de QA 5), `qa4+persona2`.

## 8. QA 5 — Compra de punta a punta
**Actores:** Persona 1 (QA 4), negocio PYME (QA 2), admin.
| # | Caso | Criterio |
|---|---|---|
| F1 | Persona 1 agrega 2 productos del PYME y paga con 4242 (`/api/payments/checkout`) | `/pago/exito`; pedido `PAGADO` solo tras confirmación de ONVO (webhook), no por el redirect |
| F2 | Compra como invitado (`guest-checkout`) | Recibe token de seguimiento `/seguimiento/:token` |
| F3 | Tarjeta rechazada / el cliente cancela (`/pago/cancelado`) | Pedido no queda pagado, stock se libera |
| F4 | SINPE en línea | Se confirma **solo vía ONVO**; no debe existir botón para que el cliente "marque pagado". Ojo: master tiene `/api/sinpe/{pedido}/comprobante` y aprobación admin `/api/sinpe/admin/comprobantes/{id}/aprobar` → verificar si está expuesto en UI y reportar si contradice la regla |
| F5 | PYME ve el pedido en `/api/pedidos/pendientes` / panel y avanza estados `PENDIENTE → PAGADO → EN_PREPARACION → ENVIADO → ENTREGADO` (`PUT /api/pedidos/{id}/estado`) | Cada cambio aparece en `/mis-pedidos/:id` y `/seguimiento/:token` |
| F6 | Coordinar entrega: guía y envío (`PUT /{id}/guia`, `/{id}/envio`, `/{id}/despacho`) | Cliente ve número de guía |
| F7 | Notificaciones (`POST /{id}/notificar`, correo/Telegram) | Llegan al cliente y al negocio con datos correctos |
| F8 | Cancelación por el negocio después de pagado | Pasa a reembolso pendiente (manual por admin). **`REEMBOLSO_PENDIENTE` no encontrado en el código de master** (está en rama `feat/onvo-reembolsos-pendientes`); hoy reportar el comportamiento real |
| F9 | Wallet del PYME (`/api/wallet/saldo`, `transacciones`) | Monto neto = total − 7.5%; transacción registrada una sola vez |
| F10 | Payout (`/api/wallet/payout`) y aprobación admin (`/api/admin/payouts/...`) | Admin aprueba/rechaza; saldo cuadra |
| F11 | Admin supervisa `/api/admin/pagos`, `pagos/kpis`, `webhooks` | Ve el pago y el webhook ligado al pedido |
| F12 | Repetir F1 con negocio Emprendedor (9%) y Plus (6%) | Comisión correcta por plan |
**Orden:** después de Fase 1. **Dependencias:** productos con stock de QA 2, webhook ONVO sandbox apuntando al staging.

## 9. Propuesta QA 6, 7 y 8
### QA 6 — POS y SINPE presencial
`/caja`, turno de caja (`TurnoCajaController`), `POST /api/pos/venta`, `/api/pos/historial`, QR de pago `/pos/pago/:token`, `PUT /api/pos/qr/{token}/confirmar-sinpe`, admin `POST /api/admin/pagos/{id}/confirmar-sinpe`.
Casos: venta efectivo/tarjeta; QR con 4242; confirmación SINPE manual **con referencia obligatoria** (sin referencia → rechazo); el **vendedor no puede confirmar su propia venta** (con otro usuario sí); apertura/cierre de caja cuadra; offline (`/sin-conexion`). Nota: la referencia obligatoria y la regla del propio vendedor llegan con #245 — **no encontradas en master**; si se prueba antes del merge, se esperan fallas. Además, `PosQrController` aún expone rutas Tilopay → bug.
### QA 7 — Admin y seguridad de roles
Matriz rol × ruta: cliente, emprendedor, PYME, Plus, colaborador, admin contra `/admin/*`, `/pyme/*`, `/negocio-plus/*`, `/emprendedor/*`, y APIs (`/api/pedidos/usuario/{otroId}`, `/api/carrito/{otroUsuarioId}`, `/api/pedidos/{idAjeno}` → deben dar 403: posible IDOR, prioridad alta). Impersonación (`ImpersonacionController`) queda auditada; `AuditoriaAdmin` registra acciones; usuarios, comisiones, billing admin, tickets de soporte, moderación; aislamiento entre negocios (tenant).
### QA 8 — Webhooks, renovaciones y móvil/UX/i18n
Webhooks: `/api/webhooks/onvo` con firma inválida → rechazo; evento duplicado → idempotente; webhook fuera de orden. Renovación mensual en sandbox (adelantar fecha en ONVO test si lo permite); fallo de renovación → plan suspendido, no gratis; cancelación tras #256 (re-prueba de QA 2). `/api/webhooks/stripe` existe en master → confirmar que no se use. Móvil: flujos de QA 4 y QA 5 en celular (360 px) y PWA; textos en voseo; montos en ₡/US$ correctos; accesibilidad básica.

## 10. Mejoras propuestas al flujo de compra
| # | Propuesta | Tipo |
|---|---|---|
| M1 | Quitar rutas y pantallas Tilopay (`/pago/tilopay/respuesta`, `/api/payments/tilopay/*`, `/api/billing/tilopay/*`, POS QR tilopay) | Hecho visto en el código |
| M2 | La cancelación de suscripción usa `/subscriptions/{id}/cancel` (404 en ONVO) → merge #256 | Hecho visto (OnvoBillingClient.java:119) |
| M3 | Unificar SINPE en línea solo por ONVO y retirar del flujo web el comprobante manual (`/api/sinpe/.../comprobante`) | Hecho visto (rutas existen) + sugerencia |
| M4 | Estados como strings sueltos (`"PENDIENTE"`, `"PAGADO"`, etc. repetidos en el código) → usar un enum con transiciones válidas | Hecho visto + sugerencia |
| M5 | Cola de reembolso pendiente visible para cliente y admin | Sugerencia (no encontrado en master) |
| M6 | Seguimiento público por token ya existe (`/seguimiento/:token`): agregar línea de tiempo con hora de cada estado y aviso automático en cada cambio (hoy notificar es acción manual `POST /{id}/notificar`) | Hecho visto + sugerencia |
| M7 | Recuperar carrito abandonado existe; sumar recordatorio antes de que expire la sesión de pago | Hecho visto + sugerencia |
| M8 | Mostrar al negocio el desglose comisión/neto en el pedido, no solo en wallet | Sugerencia |
| M9 | `DELETE /api/pedidos/{id}` existe: para pedidos pagados debería ser anulación auditada, no borrado | Hecho visto + sugerencia |
| M10 | Chat o mensaje cliente–negocio por pedido para coordinar entrega | Sugerencia (no encontrado como flujo de pedido) |

## 11. Entrega de cada QA
Formato: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso, más la lista de bugs con la plantilla §1.
