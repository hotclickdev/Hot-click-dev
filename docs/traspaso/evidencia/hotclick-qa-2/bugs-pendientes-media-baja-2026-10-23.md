# HotClick: bugs pendientes de severidad media y baja (QA funcional 2026-10-23)

Regla de Andrés (21:22 CR): esta noche solo se arreglan los bugs críticos y altos. Los de severidad media y baja se anotan aquí y se arreglan después.
QA: agregá una fila por bug, sin secretos, teléfonos ni cédulas.

| ID | Severidad | Área | Descripción | Evidencia | Reportó |
|---|---|---|---|---|---|
| QA1-005 | Baja | Registro | Los errores de validación muestran nombres internos de campo | /workspace/qa-funcional/qa1/ | QA 1 |
| QA2-003 | Media | /para-pymes | No muestra el precio de US$24 (ya incluido en fix/retiro-tilopay-front-csp) | /workspace/qa-funcional/qa2/ | QA 2 |
| QA2-004 | Baja | Login | El enlace de login apunta a /registrar-negocio | /workspace/qa-funcional/qa2/ | QA 2 |
| QA2-005 | Baja | Planes | activar-plan redirige sin aviso | /workspace/qa-funcional/qa2/ | QA 2 |
| QA2-006 | Baja | Seguridad/UX | El límite de intentos da 429 muy rápido | /workspace/qa-funcional/qa2/ | QA 2 |
| QA4-003 | Baja | UX | Ver el reporte de QA 4 | /workspace/qa-funcional/qa4/ | QA 4 |
| K6 | Media | Cookies | El banner de cookies queda tapado por el modal de cupón | /workspace/qa-funcional/qa4/ | QA 4 |
| 2026-10-23 | QA 8 | Media | `/api/webhooks/stripe` sigue expuesto en localhost:8080 (responde 400, no 404), aunque Stripe no se usa | `curl -X POST localhost:8080/api/webhooks/stripe -d {}` → 400 |
| QA6-001 | Media | POS/Pagos | `PosQrController` expone rutas públicas de Tilopay (descartado por regla 4): `POST /api/pos/qr/pago/{token}/tilopay` y `/tilopay/confirmar` accesibles sin sesión (devuelven cuerpo del controlador, no 404 de ruta) | /workspace/hotclick-reportes/qa6-evidencia/probe-pos-sinpe.txt + PosQrController.java líneas 119-142 (staging 43188186) | QA 6 |
| 2026-10-23 | QA 8 | Baja | Textos en tuteo en vez de voseo: "Intenta de nuevo o contáctanos" (`hooks/usePayment.ts:124`), "¿Dudas? Contáctanos" (`prototipo/visitante/VisitantePagoResultado.tsx:143`), "Necesitas al menos 4 semanas" (`pages/admin/AdminForecast.tsx:166`), "Elige un plan" (`pages/admin/suscripcion/SuscripcionAcciones.tsx:39`), "Tienes una llave" (`components/admin/AdminWebAuthnSetup.tsx:60`) | `rg` sobre frontend/src en master |
| QA5-001 | Media | Checkout invitado | `POST /api/payments/guest-checkout` con productoId inexistente devuelve HTTP 500 genérico ("No se pudo procesar el pedido") en vez de 404/400; `RecursoNoEncontradoException` no se captura en `guestCheckoutSinGuard` | /workspace/hotclick-reportes/qa5/04-guest-checkout-provider.txt, 05-log-500.txt | QA 5 |
| L210 cef046f6 | Media | Sin test que verifique anotarLedger en el camino CANCELADA (status=canceled) | QA | pendiente |
| L210 cef046f6 | Baja | Sin test de OnvoBillingClient con status desconocido explícito (ej. past_due sin cancelAtPeriodEnd) | QA | pendiente |
- medio: el webhook de ONVO no usa el fin de período; ya hay trabajo sin commit en /workspace/bugs-hc-onvo (rama fix/onvo-billing-webhook-verificado). Rama fix/aplicar-plan-local-mes queda vacía. — Dev Pagos, 2026-10-23
| 2026-10-24 | QA 8 | Media | QA8-003: "Video del producto" muestra siempre las pestañas YouTube, Instagram, TikTok y Otra red aunque solo haya un enlace; `ControlPlataforma` en `pages/producto/ProductVideo.tsx` recorre la lista fija `SEGMENTOS` | Código en origin/master 3fb0c7a9 |
| QA1-006 | Media | Registro API | `POST /api/auth/send-verification` sin `telefono` responde 400 genérico ("No se pudo enviar el código…") por violación NOT NULL de `hot_click_usuario_tb.telefono`, en vez de validar y decir "teléfono obligatorio". La UI sí exige teléfono. Consumió el único intento de registro de QA 1 | /workspace/qa-funcional/qa1/evidencia/r2/01-*.txt | QA 1 |
| QA1-007 | Media | Asistente HotClick | Pregunta "¿Cómo funciona el envío y cuánto cuesta?" se trata como búsqueda de productos: "no tenemos productos de «funciona envío cuánto cuesta»"; no contesta sobre envío | /workspace/qa-funcional/qa1/evidencia/r2/chatbot.txt | QA 1 (se repite r3 01:49 CR, evidencia/r3/05-chatbot.txt) |
| QA1-008 | Baja | Asistente HotClick | Con productoId, "¿Qué garantía y qué medidas tiene?" responde solo garantía (no consta), ignora medidas y sugiere "¿Tiene garantía?" otra vez | /workspace/qa-funcional/qa1/evidencia/r2/chatbot.txt | QA 1 |
| QA3-006 | Media | Asistente HotClick | Preguntas de envío ("¿Hacen envíos a Cartago y cuánto cuesta?") y garantía/medidas se tratan como búsqueda de producto ("no tenemos productos de «hacen envíos cartago…»"); no responde la pregunta | /workspace/qa-funcional/qa3/chat1.txt, chat3.txt (24/10 00:31 CR) | QA 3 |
| QA3-007 | Media | Asistente HotClick | "Busco algo cómodo para la sala" y "Ver productos populares" devuelven 0 productos (catálogo público vacío en staging; no se pudo evaluar relevancia) | chat2.txt, chat6.txt | QA 3 |
| QA3-008 | Baja | Textos (C7) | Mensaje de límite de equipo en tuteo/España: "Has alcanzado…", "Ve a Configuración…" (no voseo) | evidencia-http.log 00:31:43 CR | QA 3 |
| QA3-009 | Baja | Registro | nombreAdmin "QA Tres Plus" se parte en nombre "QA" + apellido "Tres Plus"; saludo muestra solo "QA" | evidencia-http.log 00:29:20 / equipo 00:31:43 | QA 3 |
| QA3-010 | Baja | Billing | /api/billing/suscripcion devuelve planNombre "FREE" mientras el límite de equipo y el catálogo dicen "EMPRENDEDOR" | evidencia-http.log 00:30:3x / 00:31:43 | QA 3 |
| QA3-011 | Baja | Productos | Alta de producto pide categoría y luego bodega en errores separados; la bodega exige teléfono (no se indica antes de cargar el producto) | evidencia-http.log 00:30:42 | QA 3 |
| QA2-008 | Media | Productos | "Publicar producto" falla en silencio a veces; queda "Pausado" en la lista pero visible en /productos/14 | /workspace/qa-funcional/qa2/capturas/r2-* | QA 2 |
| QA2-009 | Media | Asistente | El chatbot responde "Tienda no encontrada" a las 3 preguntas (garantía, sala, envío) | r2-05, r2-06 | QA 2 |
| QA2-010 | Media | Productos | No hay campo de enlaces sociales ni sección "Video del producto" en la UI (Emprendedor ni PYME), así que no se pudo verificar el bug de las redes | r2-04 | QA 2 |
| QA2-011 | Baja | Bodega | El teléfono de la bodega solo se acepta tecleando; el error "obligatorio" persiste | — | QA 2 |
| QA2-012 | Baja | Registro | Se envía un correo con código pero no se pide ingresarlo | — | QA 2 |
| QA2-013 | Baja | Productos | /nuevo/catalogo arranca en el paso 2 de 5 (se saltea el paso 1); la guía inicial tapa los clics | r2-07 | QA 2 |

- QA3-005 (crítico, pospuesto por Andrés 2026-10-24 00:35 CR): checkout de planes pagados da 409 COBRO_PLAN_NO_DISPONIBLE; conectar SuscripcionTilopayService.iniciarCambioPlan a SuscripcionOnvoChangeService (~4-6 h, Dev Pagos 2).
| QA3-013 | Media | Asistente HotClick | Tras aprobar el negocio, el chat muestra productos "QA-TEST" a visitantes anónimos (global y tienda); no hay filtro de productos de prueba | /workspace/qa-funcional/qa3/r3chat1.txt, r3chat2.txt (24/10 00:35 CR) | QA 3 (+QA 1 r3 24/10 01:49 CR: se repite en "algo cómodo para la sala" y búsqueda por nombre, ver /workspace/qa-funcional/qa1/evidencia/r3/05-chatbot.txt) |
| QA3-014 | Media | Asistente HotClick | Pregunta de garantía/medidas: devuelve el sofá pero no responde garantía ni medidas (las especificaciones del producto sí las tienen); envío sigue sin respuesta (búsqueda vacía) | r3chat1.txt, r3chat3.txt | QA 3 |
| QA3-015 | Baja | Asistente HotClick | "Algo cómodo para la sala" devuelve 1 producto (alfombra) habiendo sofá, sillón, cojín y manta en el catálogo; texto "Te encontré 1 opciones" (concordancia) | r3chat2.txt | QA 3 |
| QA3-016 | Media | Admin | En solicitudes de aprobación, empresa 4 figura con adminCorreo/adminNombre del EDITOR (qa3+editor) en vez del dueño qa3+plus (relacionado con QA3-012) | evidencia-http.log 00:34:44 CR | QA 3 |
- QA2-007 (alto, ligado a QA3-005 pospuesto): /registro-empresa deja la cuenta en plan Emprendedor; no ofrece ni cobra PYME.
| QA3-018 | Baja | Auth 2FA correo | El login con EMAIL_OTP responde "Enviamos un código a tu correo" pero no envía nada: verify responde "No hay un código activo" hasta que se llama a /2fa/email/send. Si el front no lo llama, el mensaje engaña | evidencia-http.log "C6 login con email OTP activo" / "C6 verify código incorrecto" 24/10 00:37 CR | QA 3 |
| QA3-019 | Media | Equipo/roles | El EDITOR puede cambiar la visibilidad pública del negocio (PUT /api/empresa/perfil/visibilidad 200). En el código, /api/empresa/perfil (incluido /fiscal y cert-p12) no tiene control de rol interno; solo se probó visibilidad, con el mismo valor | evidencia-http.log "N7 EDITOR cambia visibilidad" 00:38:37 CR | QA 3 |
| QA3-020 | Baja | Equipo/roles | Cambiar el rol o eliminar al PROPIETARIO como EDITOR da 400 (regla de negocio) en lugar de 403 por permisos | evidencia-http.log "N7 EDITOR cambia rol del dueño" | QA 3 |
| QA3-021 | Baja | Auth | /2fa/verify da 429 tras unos 4 intentos en un minuto (sumando EMAIL_OTP y TOTP), lo que impidió probar los códigos de recuperación. Revisar si el umbral es razonable (puede ser lo esperado) | evidencia-http.log "C6T verify con código de recuperación" 00:37:42 CR | QA 3 |
| QA2-016 | Media | Equipo/POS | No existe el rol Cajero (solo Editor y Lector); el cajero de QA 6 se creó como Editor | r3-05 | QA 2 |
| QA2-017 | Baja | Panel PYME | El banner "Verificá tu correo para activar un plan de pago" sigue con el plan PYME activo por convenio | r3-04 | QA 2 |
| QA2-018 | Baja | Asistente | El historial conserva mensajes sin respuesta | r3-06 | QA 2 |
| QA2-019 | Baja | Admin | /plataforma/tiendas da 404 (la ruta real es /plataforma/negocios) | — | QA 2 |
| QA4-004-PII | Media | Seguridad/Logs (PII) | El detalle "Failing row contains (…)" de Postgres en una `DataIntegrityViolationException` vuelca la fila completa de `hot_click_usuario_tb` al log: identificación (cédula), correo y hash bcrypt de la contraseña. Ya existía antes de QA4-004 y lo detectamos al revisar ese bug. Se loguea en dos lugares: (1) Hibernate `o.h.e.jdbc.spi.SqlExceptionHelper` (WARN/ERROR con el `Detail`); (2) `AuthVerificationHandler.java:42`, `log.error("[send-verification] {}: {}", …, e.getMessage(), e)`, con mensaje y stacktrace. Propuesta: no loguear `getMessage()` ni el stacktrace de `DataIntegrityViolationException` (solo el tipo y el nombre de la constraint o SQLState), o enmascarar `Failing row contains (…)` con un filtro o converter de logback; además, subir `org.hibernate.engine.jdbc.spi.SqlExceptionHelper` a OFF/ERROR sin detalle en prod | /workspace/stg-cedula-backend.log líneas 1509-1546 (24/10 00:29 CR, registro sin teléfono) | QA 4 / Dev registro |
| QA1-009 | Media | Asistente HotClick | Con productoId=16 ("QA1-TEST Cojin sala"), "¿Qué garantía y qué medidas tiene?" responde "no consta la garantía", aunque la descripción corta dice "45x45 cm, garantía 30 días" (el campo garantiaDias=0). Además ignora las medidas (amplía QA1-008). Respuesta incorrecta al comprador | /workspace/qa-funcional/qa1/evidencia/r3/05-chatbot.txt, 04-despues.txt | QA 1 |
| QA1-010 | Baja | Panel /emprendedor | GET /api/emprendedor/negocio-rapido/onboarding da 404 "Este negocio no viene de un enlace de asignación." para emprendedores registrados normalmente; el front (pages/plataforma/consola.ts:30) lo llama siempre → 2 errores de consola por carga. El endpoint existe (NegocioRapidoOnboardingController, servicio línea 82); es ruido, no bloquea. Sugerencia: devolver 200 con "no aplica" o no llamarlo | /workspace/qa-funcional/qa1/evidencia/r3/07-onboarding.txt | QA 1 |

## QA5-003 (Baja, no-prod) — FK a "HOT_CLICK_PEDIDO_TB" en esquema local
- Prod (`\d hot_click_pago_tb`) tiene fk_id_pedido -> hot_click_pedido_tb(id_pedido) en minúsculas: solo desfase del esquema local (V1:1190). Cerrado como no-prod.
- Ticket: V9:7 y V11 alteran la tabla con nombre en mayúsculas sin guard (IF EXISTS / to_regclass). Agregar guard.
| QA3-P01 | Media | PROD hotclick.lat | /api/billing/suscripcion da FREE/SIN_SUSCRIPCION para empresa 73 con plan NEGOCIO_PLUS (ai/uso sí NEGOCIO_PLUS) | qa3/qa3-prod-negocio-plus-2026-10-24.md |
| QA3-P02 | Baja | PROD hotclick.lat | Invitar miembro divide nombre al revés (nombre "PRUEBA", apellido "QA3 Editor") | idem |
| QA3-P03 | Baja | PROD hotclick.lat | Dashboard totalUsuarios=1 con 2 miembros | idem |
| QA5-B456-01 | Baja | Error crudo de ONVO ("mobileNumber.number must be…") se devuelve al cliente en 400 de /api/sinpe/guest-checkout | qa5/area1-b4560f3c/caso1-sinpe-webhook.md |
| QA5-B456-02 | Media | Fallo tras crear intent ONVO deja payment intent huérfano (sin cancelar) | qa5/area1-b4560f3c/caso1-sinpe-webhook.md |
| QA5-62B7-01 | media | El descuento de stock al confirmar un pago ONVO no crea fila en hot_click_movimiento_stock_tb (no queda en el kardex) | qa5/area1-caso3-fix/resultado.md | Dev Pagos/Marketplace |
| QA5-62B7-02 | baja | En local los emails de confirmación fallan con SendGrid 401 y no llegan a Mailpit | qa5/area1-caso3-fix/backend.log | CI/CD |
| A9-C3 | Media | Front montos | US$ en 3 formatos (re-QA d552ab88) | cotizacionService.ts:43, planesPrecios.ts:24, suscripcionHelpers.ts:43 | QA 8 |
| A9-C4 | Media | Front montos | ₡ con NBSP en 22 `fmt` locales | POSReceipt.tsx:4, comprasHelpers.ts:3 | QA 8 |
| A9-C5 | Media | Front errores | err.message crudo en la UI | TilopayCardForm.tsx:81, configUi.tsx:37, WebAuthnStep.tsx:14 | QA 8 |
| A9-C6 | Media | Front móvil/a11y | Modales sin scroll ni role=dialog | ModalCliente.tsx, ProveedorFormModal.tsx | QA 8 |
| A9-C7 | Media | Textos | Usted/tú en vez de vos | TiendaRapidaPanel.tsx:117, es.json:3283, AdminReporteContador.tsx:138, CategoriaSelect.tsx:71 | QA 8 |
| A9-C8 | Baja | a11y | Labels sin htmlFor, outline-none | CapturaProductoForm.tsx:73-75 | QA 8 |
| A9-C9 | Baja | Móvil | Botones cerrar de 32 px | ClienteDetailModal.tsx:46, ProveedoresTable.tsx:85, SidebarContent.tsx:85 | QA 8 |
| A9-C10 | Baja | a11y | Texto de 10 px en checkout | MetodosPago.tsx:72 | QA 8 |
| A8-C3 | Media | Telegram | Dedup de updates solo en memoria | TelegramUpdateDedup.java:15 | QA 8 |
| A8-C4 | Media | Telegram | revocarMiembro corta la vinculación en todas las empresas | TelegramConfigService.java:88-97 | QA 8 |
| A8-C6 | Baja | Telegram | Tx con HTTP dentro y candados sin purga | TelegramUpdateRouter.java:19,29 | QA 8 |
| A8-C7 | Baja | Telegram | /start distingue mayúsculas | TelegramVinculacionService.java:37-43 | QA 8 |
| QA4-005 | Cliente | /pyme como invitado redirige con redirect anidado (/login?redirect=%2Flogin%3Fredirect%3D%252Fpyme), posible artefacto | Baja | QA 4 | 2026-10-26 |
| QA6-R4-01 | Media | POS/Inventario | GET /api/productos/14/kardex (producto propio con movimiento de venta POS) da 500 "Error interno"; producto propio sin movimientos da 200 [] | /workspace/hotclick-reportes/qa6-evidencia/area4/run.log | QA 6 | **Cerrado 2026-10-26: re-QA en master 2c051030 (PR 341) da 200 con el movimiento VENTA_POS; evidencia qa6-evidencia/area4-2c051030/run.log** |
| QA6-R4-02 | Baja | POS | PUT /api/pos/caja/9999/cerrar (turno inexistente) da 500 en vez de 404 | /workspace/hotclick-reportes/qa6-evidencia/area4/run.log | QA 6 | **Cerrado 2026-10-26: re-QA en master 2c051030 (PR 341) da 404 "Turno no encontrado"; evidencia qa6-evidencia/area4-2c051030/run.log** |
| QA6-R4-03 | Baja | POS | POST /api/pos/qr/pago/{token}/tilopay sin sesión da 401 (no 410/404 como dice el código, que la trata como pública); con sesión 410/404. No expone nada | /workspace/hotclick-reportes/qa6-evidencia/area4/run.log | QA 6 |
| QA6-R4-04 | Baja | Pagos/config | En staging, POST /api/webhooks/tilopay sin X-Webhook-Secret da 200 (perfil de simulación con secret vacío). Verificar que prod tenga secret o retirar la ruta | /workspace/hotclick-reportes/qa6-evidencia/area4/run.log | QA 6 |
| QA4-006 | Cliente | /registro muestra al usuario el error crudo del proveedor (SendGrid respondió 401 ...) | Baja | QA 4 | 2026-10-26 |
| QA5-M-01 | Media | Admin/compra manual (P-07) | POST /api/admin/asignar/compra como admin de plataforma sin bodegaId: devuelve 400 genérico pero el pedido SÍ queda creado (pedido 24, bodega 1 de plataforma). @CacheEvict(key="#empresa.id.toString()") en PedidoService.crearPedidoManual falla con empresa=null después del commit → reintentos duplican pedidos. Además queda PENDIENTE aunque se pide ENTREGADO | /workspace/hotclick-reportes/qa5/area1-master/p07-p08.md, backend.log 13:05:14 | QA 5 |
