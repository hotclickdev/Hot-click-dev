# Fase 2 — Etapa B — Casos P0 de seguridad
Base: `/workspace/hotclick/plan-fase2-pruebas-seguridad.md` (aportes HotClick Seguridad P0-1…P0-5 + A1/A2/A4/A5/A6/A10/QA POS).
Endpoints verificados en el código en `75ce0566becea85d0601d8245bd6f7156749d19a` (head PR #460; re-verificar contra el master final del paso 0).
**Reglas:** solo local/staging, **ONVO modo test**, cuentas QA sembradas, sin datos reales (ni tarjetas, SINPE, teléfonos, cédulas reales), sin secretos en evidencia. Cada resultado se registra con hash, rol, evidencia. Rutas relativas a `Hot_click_outlet/src/main/java/com/hotclick/`.

## P0-1 Montos y pagos (servidor manda)
| ID | Objetivo | Precondiciones | Pasos | Resultado esperado | Endpoint / archivo | Sev. si falla |
|---|---|---|---|---|---|---|
| P0-1.01 | Monto calculado en servidor | Cliente QA, carrito con 1 producto ₡10 000 | Interceptar `POST /api/payments/checkout` y cambiar precio/total/subtotal en el cuerpo | Total cobrado = precio de BD + envío + IVA; campos de monto del cliente ignorados o 400 | `controller/PaymentController.java:36`, `service/PaymentService.java` | ALTO |
| P0-1.02 | Lo mismo para invitado | Sin sesión | Igual con `POST /api/payments/guest-checkout` | Igual que 01 | `PaymentController.java:103` | ALTO |
| P0-1.03 | Cantidades raras | Cliente QA | Cantidad 0, -1, 1.5, 999999, string, null en `POST /api/carritos/{carritoId}/items` y checkout | 400; nunca total negativo ni stock negativo | `controller/CarritoController.java:54`, `PaymentController.java:36` | ALTO |
| P0-1.04 | Cupones | Cupón QA 10% | Validar con `GET /api/cupones/validar`; reusar agotado, vencido, de otra tienda, apilar 2, mayúsculas/espacios | Descuento solo calculado en servidor; agotado/vencido/ajeno rechazado; total ≥ 0 | `controller/CuponController.java:48` | ALTO |
| P0-1.05 | Doble clic / doble pago | Pedido pendiente | 2-5 `POST /api/payments/checkout` concurrentes mismo carrito | Un solo Pago/cobro ONVO; los demás reutilizan o 409 | `PaymentController.java:36` | ALTO |
| P0-1.06 | Moneda ₡ vs US$ | Plan/producto en USD (#388), `PLANES_MONEDA` revisado | Checkout de suscripción `POST /api/billing/checkout/{planId}` y compra; comparar moneda y monto enviados a ONVO test | Moneda y monto coinciden con BD; sin mezcla ₡/US$ ni redondeo erróneo (al colón) | `controller/SuscripcionController.java:120` | ALTO |
| P0-1.07 | Split de carrito con 2 tiendas | 2 tiendas QA | Comprar en ambas; revisar Pagos y comisiones | Suma de partes = total cobrado al colón; comisión correcta | `PaymentController.java:36`, `controller/AdminComisionController.java` | MEDIO |
| P0-1.08 | Monto POS y QR en servidor | Cajero QA con turno abierto | Alterar total en `POST /api/pos/venta` y en el QR `POST /api/pos/qr/pago/{token}/sinpe-onvo` | Total recalculado en servidor; manipulación → 400 | `controller/PosController.java:31`, `controller/PosQrController.java:144` | ALTO |
| P0-1.09 | Precio de oferta en self-checkout (MED abierto A3) | Producto con oferta | `POST /api/qr/{token}/pedido` con precio alterado / oferta vencida | Precio vigente de BD | `controller/SelfCheckoutController.java:51` | MEDIO |
| P0-1.10 | Reembolso ≤ cobrado | Pago capturado en REEMBOLSO_PENDIENTE | Resolver con `POST /api/admin/sobreventa/pedidos/{id}/resolver` dos veces / en paralelo; caso grupo parcial (#460) | Nunca reembolso > cobrado ni doble; segundo intento 400 | `controller/AdminSobreventaController.java:30`, `service/payment/SobreventaResolucionService.java` | ALTO |
| P0-1.11 | No comprar en tienda pausada/impago | Tienda QA pausada | Checkout contra esa tienda | 4xx, sin Pago creado | `PaymentController.java:36` | MEDIO |
| P0-1.12 | Cancelar pedido ajeno/pagado | 2 clientes QA | `POST /api/payments/cancel/{numeroPedido}` y `/guest/cancel/{numeroPedido}` con número ajeno o ya pagado | 403/404/400; no libera stock ni cambia estado | `PaymentController.java:88`, `:127` | ALTO |

## P0-2 Webhooks ONVO (modo test)
| ID | Objetivo | Precondiciones | Pasos | Resultado esperado | Endpoint / archivo | Sev. |
|---|---|---|---|---|---|---|
| P0-2.01 | Autenticación del webhook | Staging con secret de test | `POST /api/webhooks/onvo` sin header, con `X-Webhook-Secret` erróneo, vacío | 401; log sin el secret ni cuerpo; alerta tras repetidos | `controller/OnvoWebhookController.java:73-87` | ALTO |
| P0-2.02 | El cuerpo no confirma nada | Secret válido | Enviar evento "pagado" inventado para una sesión no pagada | Reconsulta GET a ONVO; no se marca CAPTURADO | `OnvoWebhookController.java`, `payment/OnvoCapturaService.java` | ALTO |
| P0-2.03 | Replay / idempotencia | Pago capturado en test | Reenviar el mismo evento N veces y en paralelo | Un solo efecto (DUPLICADO); stock/correos una vez | `payment/OnvoCapturaService.java` (Captura.DUPLICADO) | ALTO |
| P0-2.04 | Orden de eventos | Pago pendiente | Enviar "fallido" después de "pagado" y viceversa | Estado final coherente; un fallo tardío no libera reservas de un pago capturado | `OnvoCapturaService.java`, `repository/PagoRepository.java` (paso a FALLIDO condicional) | ALTO |
| P0-2.05 | Evento de otra cuenta/comercio | Sesión de otra cuenta ONVO test | Enviar su id | Reconsulta no lo encuentra → no captura; sin 500 | `OnvoWebhookController.java` | ALTO |
| P0-2.06 | Monto o moneda distintos | Sesión test con monto ≠ pedido | Webhook válido | No CAPTURADO; alerta [ALERTA-PAGO] | `OnvoCapturaService.java` | ALTO |
| P0-2.07 | Falla cerrada | ONVO GET caído/timeout (mock) | Webhook válido | No 2xx sin procesar (ONVO reintenta); no captura; estado INCIERTO | `OnvoWebhookController.java:29-30` | ALTO |
| P0-2.08 | Cobro sobre grupo cancelado / parcial / reintento sobre reembolso (#459/#460) | Grupo con 2 paquetes | Cancelar uno o todos en paralelo al webhook; reenviar sobre pago REEMBOLSO_PENDIENTE | Cancelado: REEMBOLSO_PENDIENTE + alerta; parcial: paquete en REVISION_SOBREVENTA; reintento: no vuelve a CAPTURADO ni re-alerta | `service/payment/PaymentOrderConfirmationService.java`, `OnvoWebhookController.java:176,189` | ALTO |
| P0-2.09 | SINPE vía ONVO | Pedido SINPE test | Confirmar dos veces, sobre cancelado | Una captura; cancelado → reembolso pendiente | `service/sinpe/SinpeOnvoMarketplaceService.java` | ALTO |
| P0-2.10 | Estados de suscripción | Plan test | Renovación, impago, cancelación, evento repetido; plan solo se activa por webhook confirmado | Idempotente; gracia/pausa correcta; reconsulta antes de la baja (A5-01) | `controller/SuscripcionController.java`, `controller/CuentaSuspendidaController.java:97` | ALTO |
| P0-2.11 | Tamaño y rate limit con secret inválido | — | Cuerpo enorme; >30 intentos/min con secret malo | 413/429; secret válido nunca se limita | `OnvoWebhookController.java:55-59` | MEDIO |

## P0-3 IDOR entre tenants y por rol
| ID | Objetivo | Precondiciones | Pasos | Resultado esperado | Endpoint / archivo | Sev. |
|---|---|---|---|---|---|---|
| P0-3.01 | Pedidos de otra tienda | Tiendas A y B, dueño A | `GET/PUT/DELETE /api/pedidos/{id}` con id de B; `PUT /{id}/estado`, `/guia`, `/envio` | 403/404 | `controller/PedidoController.java:144,191,229,250,302` | ALTO |
| P0-3.02 | Pedidos de otro usuario | Clientes 1 y 2 | `GET /api/pedidos/usuario/{usuarioId}` y `/api/pedidos/{id}/compra` con ids ajenos | 403/404 | `PedidoController.java:160,177` | ALTO |
| P0-3.03 | Perfil de otro usuario | 2 usuarios | `GET/PUT /api/usuarios/{id}` ajeno | 403 | `controller/UsuarioController.java:43,54` | ALTO |
| P0-3.04 | Estado de pago ajeno | 2 clientes | `GET /api/payments/status/{numeroPedido}` ajeno | Sin datos ajenos (403/404) | `PaymentController.java:75` | MEDIO |
| P0-3.05 | POS entre tiendas | Cajero tienda A | Abrir/cerrar turno de B (`PUT /api/pos/caja/{id}/cerrar`), anular/devolver venta de B (`/api/pos/ventas/{pedidoId}/anular`, `/devolver`), QR de B | 403/404 | `controller/TurnoCajaController.java:46`, `PosAnulacionController.java:36,43`, `PosQrController.java:89,95` | ALTO |
| P0-3.06 | Permisos cajero vs dueño | Cajero QA | Ver reportes, cambiar precios, caja de otro cajero | 403 | `PosController.java`, `TurnoCajaController.java` | ALTO |
| P0-3.07 | Inventario/paquetes ajenos | Tiendas A y B | `/api/inventario/paquetes/{id}` (GET, líneas, cerrar, asignar, importar) con id de B | 403/404 | `controller/InventarioPaqueteController.java:47-126` | ALTO |
| P0-3.08 | Comprobantes SINPE ajenos | 2 clientes | `GET /api/sinpe/comprobantes/{id}/url-firmada` ajeno | 403 | `controller/SinpeController.java:109` | ALTO |
| P0-3.09 | Matriz rol×endpoint admin (Auditor 2) | EDITOR/LECTOR de Pyme | Executive, Inventario (`/api/admin/inventario`), AiCopilot (`/api/admin/ai/chat`) | 403 | `ExecutiveController.java`, `InventarioController.java`, `AiCopilotController.java` | ALTO |
| P0-3.10 | Escalada de rol | ADMIN de equipo, emprendedor | `PUT /api/admin/usuarios/{id}/rol`, `POST /api/empresas/{id}/equipo`, `POST /api/empresas/{id}/impersonar` sin ser admin de plataforma | 403; auditado | `AdminUsuarioController.java:56`, `EmpresaController.java:134,163` | ALTO |
| P0-3.11 | Cambio de negocio a uno ajeno | Usuario de A | `POST /api/auth/seleccionar-empresa` / `cambiar-negocio` con empresa B | 403 | `AuthController.java:69,84` | ALTO |
| P0-3.12 | Aislamiento del asistente IA (A6) | 2 tiendas | Memoria/sesión/RAG/token HMAC de A usado en B | Sin fuga | `AiCopilotController.java:47` y servicio del asistente | ALTO |

## P0-4 Autenticación
| ID | Objetivo | Precondiciones | Pasos | Resultado esperado | Endpoint / archivo | Sev. |
|---|---|---|---|---|---|---|
| P0-4.01 | JWT manipulado | Token QA | alg=none, firma cambiada, rol alterado, vencido | 401 | `AuthController.java` + filtro JWT de `security/` | ALTO |
| P0-4.02 | Refresh tras logout/desactivar | Sesión QA | `POST /api/auth/logout`, luego `/refresh`; desactivar cuenta y usar token (caché 30 s) | 401 tras logout; ≤30 s tras desactivar | `AuthController.java:106,115`, `AdminUsuarioController.java:68` | ALTO |
| P0-4.03 | Fuerza bruta login | Cuenta QA | Muchos `POST /api/auth/login` erróneos por usuario e IP | 429/bloqueo; mensaje uniforme | `AuthController.java:99` | ALTO |
| P0-4.04 | Recuperación de contraseña | Cuenta QA | `forgot-password` (enumeración), `verify-code` fuerza bruta, `reset-password` con código reusado/vencido | Respuesta uniforme; código de un uso, con expiración y tope | `AuthController.java:205,210,215` | ALTO |
| P0-4.05 | Toma de cuenta por cambio de correo | 2 cuentas | Cambiar correo a uno existente con mayúsculas/espacios (`PUT /api/usuarios/{id}`); alta/login con variantes | Rechazo; normalización lower/trim; verificación del nuevo correo | `UsuarioController.java:54`, `AuthController.java:30,99` | ALTO |
| P0-4.06 | 2FA | Cuenta con TOTP | `2fa/verify` fuerza bruta, recuperación vacía (debe 400 no 500), desactivar sin clave, SSO sin 2FA | Topes; 400; exige reautenticación | `AuthController.java:132-183`, `ClerkSyncController.java:30` | ALTO |
| P0-4.07 | Política de clave | — | Clave de 6-7 en alta y `change-password` | Mismo mínimo (8) en todo | `AuthController.java:30,124,215` | MEDIO |
| P0-4.08 | Sin correos/claves en logs | Logs staging | Revisar logs tras 01-06 | Sin correo en claro, clave, código ni token | — (logs) | MEDIO |

## P0-5 Endpoints destructivos / admin
| ID | Objetivo | Precondiciones | Pasos | Resultado esperado | Endpoint / archivo | Sev. |
|---|---|---|---|---|---|---|
| P0-5.01 | Resets no disparables en prod | Perfil prod en staging aislado | `POST /api/admin/reset-plataforma-qa`, `/reset-datos`, `/reset-codigo` como ADMIN, EMPRENDEDOR y anónimo | 404/403 con flag apagado (`resetPlataformaKeepQaService.habilitado()`); ningún dato borrado | `controller/AdminResetController.java:62,106,123` | ALTO |
| P0-5.02 | Borrado de usuarios | ADMIN de equipo / emprendedor | `DELETE /api/admin/usuarios/{id}` (incl. admin plataforma y a sí mismo) | Solo admin de plataforma; auditado; nunca borra admin | `AdminUsuarioController.java:62` | ALTO |
| P0-5.03 | Borrado de pedidos | Emprendedor tienda A | `DELETE /api/pedidos/{id}` propio pagado y ajeno | Pagado no se borra; ajeno 403 | `PedidoController.java:302` | ALTO |
| P0-5.04 | Suspensiones y feature flags | No admin | `POST /api/admin/suspensiones/{empresaId}/suspender`, `/extension`; `POST /api/feature-flags/{empresaId}/{flag}/on` | 403 | `AdminSuspensionController.java:27,32`, `FeatureFlagController.java:41` | ALTO |
| P0-5.05 | Confirmación manual de pagos | FINANCE/emprendedor | `POST /api/admin/pagos/{pagoId}/confirmar-sinpe` / `rechazar-sinpe`; dos veces | Solo rol permitido; idempotente; revisa sobreventa | `AdminPagoController.java:126,133` | ALTO |
| P0-5.06 | Cierre de cuenta titular | Usuario QA | `POST .../cierre` sin reautenticación / de otro | Exige reautenticación; solo propio | `controller/CuentaTitularController.java:35` | ALTO |
| P0-5.07 | Borrados masivos/bulk de catálogo | Tienda A | `DELETE` categoría/bodega de B; `POST /bulk` con ids de B | 403/404 | `CategoriaController.java:104,167`, `BodegaController.java:142,236` | MEDIO |
| P0-5.08 | Vaciar carrito ajeno | 2 clientes | `DELETE /api/carritos/{carritoId}/vaciar` ajeno | 403 | `CarritoController.java:76` | MEDIO |
| P0-5.09 | Resolver sobreventa | FINANCE, emprendedor, admin impersonando | `POST /api/admin/sobreventa/pedidos/{id}/resolver` | 403 salvo ADMIN plataforma no impersonando; motivo ≤500 auditado | `AdminSobreventaController.java:30` | ALTO |

## Conteo
- P0-1 Montos y pagos: 12
- P0-2 Webhooks ONVO: 11
- P0-3 IDOR multi-tenant/rol: 12
- P0-4 Auth: 8
- P0-5 Destructivos/admin: 9
- **Total: 52**

Nota: rutas de `CarritoController`, `EmpresaController`, `FeatureFlagController` y `CuentaTitularController` usan el `@RequestMapping` de clase; confirmar prefijo exacto antes de ejecutar.
