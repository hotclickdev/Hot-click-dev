# Auditoría 7: Facturación electrónica Hacienda CR

- Repo: hotclickdev/Hot-click-dev, commit `fb9ef78e` (master). Modo: solo lectura.
- Ruta base: `Hot_click_outlet/src/main/java/com/hotclick/` (abreviada como `…/`).
- No hubo requests a prod ni a Hacienda. No se corrieron tests porque el box no tiene `java` ni `mvn`. Tests existentes: `XmlFacturaBuilderTest`, `ClaveNumericaServiceTest`.
- No se compararon los XSD oficiales v4.4 (no se descargaron, para no salir del alcance). Los ítems que dependen del XSD dicen "confirmar contra el XSD oficial".
- No hay datos reales. Placeholders: `<CEDULA_EMISOR>`, `<PEDIDO_ID>`.

Conteo: **ALTO 5 · MEDIO 7 · BAJO 4** · Mejoras 8

---

## CORRECCIONES

### A1 [ALTO] La firma XAdES no existe: se envía XML sin firmar aunque haya certificado
- **Archivo:** `…/service/FirmaDigitalService.java:34-51`. Si hay `certP12Path`, solo registra "stub activo" en el log y devuelve `xmlSinFirmar`, también en `PROD`. Solo lanza error en PROD cuando no hay certificado (l.35-40).
- **Riesgo:** Hacienda rechaza todos los comprobantes. Además se gastan consecutivos y el sistema cree que la facturación funciona.
- **Reproducir:** configurar una empresa de prueba con `ambienteHacienda=PROD`, `certP12Path` con cualquier valor y credenciales ATV. Al llamar `firmar(xml, empresa)` sale el mismo string, sin `<ds:Signature>`.
- **Corrección:** implementar XAdES-EPES con la política de Hacienda: cargar el .p12 desde Storage, descifrar el PIN, cachear el KeyStore y firmar enveloped con SHA-256. Mientras no esté implementado, lanzar excepción si `ambiente=PROD`, sin excepciones.
- **Garantía:** test unitario con un .p12 de prueba autogenerado. El XML firmado debe tener `ds:Signature`, `xades:SignedProperties` y `SignaturePolicyIdentifier`, y validarse con `XMLSignatureFactory`. Otro test: PROD + stub ⇒ excepción.

### A2 [ALTO] `@Async` no aplica: el envío corre sincrónico y dentro de la transacción de `emitir`
- **Archivo:** `…/service/FacturacionService.java:60` llama a `procesarAsync` (l.78-86) desde la misma clase. Spring no intercepta esa auto-invocación, así que se pierden `@Async` y el `@Transactional` propio.
- **Riesgo:** el `POST /emitir` queda bloqueado por el HTTP a Hacienda, incluidos los reintentos de Resilience4j. El HTTP ocurre dentro de una transacción de BD, lo que contradice el diseño documentado (PgBouncer). Si el envío pasa y luego falla el commit de `emitir`, el comprobante queda enviado a Hacienda pero no existe en la BD.
- **Reproducir:** en un test de integración, loguear `Thread.currentThread().getName()` dentro de `procesarComprobante`. Sale el hilo del request y no `taskExecutor`. Otra forma: `TransactionSynchronizationManager.isActualTransactionActive()` da true durante `haciendaClient.enviar`.
- **Corrección:** disparar el procesamiento con un evento `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` en un bean separado, o inyectar un bean `FacturacionAsyncRunner`. Sacar `@Transactional` del método que hace HTTP y usar transacciones cortas antes y después.
- **Garantía:** test de integración que verifique un hilo distinto, que no haya transacción activa durante `enviar` y que la respuesta del endpoint llegue en menos de 200 ms con un mock de Hacienda que tarda 5 s.

### A3 [ALTO] Los reintentos y el circuit breaker de Hacienda nunca se disparan
- **Archivo:** `…/service/HaciendaApiClient.java:55-56` (anotaciones) y `96-100` (`catch (Exception) { return false; }`). También en `consultarEstado` (l.108-109, 132-135).
- **Riesgo:** `@Retry` y `@CircuitBreaker` solo reaccionan a excepciones, y el método se las traga. Resultado: cero reintentos rápidos, el circuito nunca abre y en una caída de Hacienda se golpea la API sin freno. También se tratan igual un 400 (XML inválido, no se debe reintentar) y un 5xx o timeout (sí se debe reintentar).
- **Reproducir:** test con `MockRestServiceServer` que devuelva 503. `enviar` hace 1 sola llamada (no N) y el estado del CircuitBreaker `hacienda` sigue CLOSED después de muchos fallos.
- **Corrección:** relanzar una `HaciendaTransitoriaException` en 5xx, timeout o IO. Para 4xx, devolver un resultado tipado (`RECHAZO_RECEPCION` con el header `X-Error-Cause`) que no se reintente. Configurar `retryExceptions` y `ignoreExceptions`.
- **Garantía:** tests con 503 (N intentos y circuito que abre), 400 (1 intento, sin reintento, mensaje guardado) y 202 (OK).

### A4 [ALTO] Se puede emitir un segundo comprobante para el mismo pedido mientras el primero está en ERROR o en contingencia
- **Archivo:** `…/service/facturacion/FacturacionEmisionSupport.java:33-36` (`ESTADOS_ACTIVOS` = PENDIENTE, ENVIADO, ACEPTADO, sin `ERROR`) y `:68-70`. Lo mismo para la compra en `:105-109`.
- **Riesgo:** un comprobante en `ERROR` sigue vivo, porque `FacturacionContingenciaService` lo reenvía con la misma clave. Si el usuario vuelve a pulsar "emitir", se crea otro consecutivo y otra clave para el mismo pedido. Hacienda puede terminar aceptando los dos: doble facturación y doble IVA declarado.
- **Reproducir:** forzar que `enviar` devuelva false (mock) ⇒ comprobante en ERROR y encolado. Llamar de nuevo `POST /api/.../emitir/<PEDIDO_ID>` ⇒ se crea un segundo comprobante.
- **Corrección:** incluir `ERROR` en los estados activos. Solo permitir reemisión desde `RECHAZADO` o `ANULADO`. Agregar un índice único parcial en BD (`fk_pedido` WHERE estado IN activos).
- **Garantía:** test del caso anterior que espera `IllegalStateException`. Migración con el índice único y un test de concurrencia (2 hilos emitiendo a la vez ⇒ 1 solo comprobante).

### A5 [ALTO] Si faltan credenciales, el envío se da por exitoso y el comprobante queda ENVIADO para siempre
- **Archivo:** `…/service/HaciendaApiClient.java:58-61` (`return true; // stub`) y `:111-113` (`en_procesamiento`). `tieneCredenciales` (l.142-145) solo mira cédula y usuario, no `claveHaciendaEnc`. `HaciendaTokenService.getToken` devuelve `""` si falla (l.71 del bloque del token) y se manda `Bearer ` vacío.
- **Riesgo:** en cualquier ambiente, incluido PROD, un cliente sin usuario ATV deja comprobantes en ENVIADO y la consulta responde `en_procesamiento` sin fin. Nunca se aceptan y nadie se entera. No hay guardia de ambiente.
- **Reproducir:** empresa con `usuarioHacienda` vacío ⇒ `enviar` devuelve true sin HTTP y el estado queda ENVIADO para siempre.
- **Corrección:** quitar el stub fuera de un perfil `dev`/`test` explícito (`@Profile` o flag). Si no hay credenciales o el token viene vacío, lanzar excepción de configuración y dejar el comprobante en `PENDIENTE_CONFIG` con un mensaje visible.
- **Garantía:** test: empresa sin credenciales con perfil prod ⇒ excepción y estado distinto de ENVIADO. Test de token vacío ⇒ no se hace POST.

### M1 [MEDIO] El XML 4.4 está incompleto respecto a la estructura oficial (confirmar contra el XSD oficial)
- **Archivo:** `…/service/XmlFacturaBuilder.java`.
  - l.85-86: `CondicionVenta` y `MedioPago` fijos en `01`. En v4.4 `MedioPago` va en `ResumenFactura/MedioPago/TipoMedioPago`. Además, un pago SINPE o con tarjeta se declara como efectivo.
  - l.147-166: faltan `BaseImponible`, `ImpuestoAsumidoEmisorFabrica`, `Descuento` y `UnidadMedida` real. Las líneas con IVA 0 no llevan `<Impuesto>`; en 4.4 la línea exenta o 0% debería declarar el impuesto con su `CodigoTarifaIVA`.
  - l.170-180: faltan `TotalServGravados`/`TotalMercanciasGravadas`, `TotalExento`, `TotalGravado` correcto, `TotalVenta`, `TotalDescuentos`, `TotalVentaNeta` y `TotalMedioPago`.
- **Riesgo:** Hacienda rechaza el XML. El validador local (`…/service/hacienda/XmlFacturaSchemaValidator.java:1-20`) usa un "subset" propio, así que no detecta nada de esto.
- **Reproducir:** validar la salida de `XmlFacturaBuilderTest` contra el XSD oficial `FacturaElectronica_V4.4.xsd`.
- **Corrección:** versionar los XSD oficiales en `src/main/resources/hacienda/`, validar contra ellos y completar los nodos.
- **Garantía:** test que valide contra el XSD oficial para estos casos: factura gravada, tiquete, línea exenta y línea con descuento.

### M2 [MEDIO] `TotalGravado` incluye líneas exentas o con IVA 0
- **Archivo:** `…/service/XmlFacturaBuilder.java:117-126, 176`. `base` suma todas las líneas sin importar el IVA.
- **Riesgo:** totales mal declarados y rechazo, o IVA mal reportado en la D-104.
- **Reproducir:** pedido con un producto `porcentajeIva=0` ⇒ `TotalGravado` = suma total.
- **Corrección:** acumular por separado gravado y exento (y no sujeto), y por mercancía o servicio.
- **Garantía:** test con una línea al 13% y una al 0%: TotalGravado = solo la base de la primera y TotalExento = la segunda.

### M3 [MEDIO] No hay soporte para exoneraciones
- **Archivo:** no hay ninguna referencia a "exonera" en el backend (`rg -i exonera` sin resultados). Ver `…/service/hacienda/ImpuestoLinea.java`.
- **Riesgo:** a clientes exonerados (zona franca, instituciones) se les cobra y declara el IVA completo. No se puede emitir `Exoneracion` (tipo documento, número, institución, porcentaje).
- **Corrección:** modelar la exoneración del receptor o del pedido, calcular `MontoExoneracion` e `ImpuestoNeto`, y emitir el nodo `Exoneracion`.
- **Garantía:** tests de exoneración total y parcial, con XML válido contra el XSD.

### M4 [MEDIO] El total guardado no coincide con el total del XML
- **Archivo:** `…/service/facturacion/FacturacionEmisionSupport.java:89` (`setTotalFactura(pedido.getTotalPedido())`) frente a `XmlFacturaBuilder.java:144` (base = precio × cantidad + IVA calculado aparte).
- **Riesgo:** reportes y UI muestran un total distinto al declarado. Hay dos causas: el envío y los cupones no van al XML, y si `precioVenta` ya incluye IVA, el XML suma el 13% de nuevo. Lo segundo **no está verificado**: hay que confirmar si `Producto.precioVenta` se captura con IVA incluido.
- **Reproducir:** pedido de 1 línea a 1130 con 13% ⇒ XML TotalComprobante 1277, mientras `totalFactura` = 1130 más el envío.
- **Corrección:** definir una sola fuente de verdad (`ImpuestoLinea` → `aplicarTotales` también en `emitir`). Si el precio incluye IVA, desglosar base = precio / 1.13. Agregar el envío como línea de servicio con su CAByS y los descuentos como `MontoDescuento`.
- **Garantía:** test que compare `cf.totalFactura` con el `TotalComprobante` del XML y con `pedido.totalPedido`.

### M5 [MEDIO] `tipo` sin validar: quema consecutivos y permite factura sin receptor
- **Archivo:** `…/controller/FacturaController.java:42-43` → `FacturacionEmisionSupport.java:72-75`.
- **Riesgo:** con `tipo="99"` o un valor no numérico se reserva el consecutivo (REQUIRES_NEW, ya commiteado) y luego `ClaveNumericaService.armar` lanza error (l.44). Queda un hueco y una fila de consecutivo basura. Con `tipo="01"` (factura) no se fija el receptor en `emitir` y el XML sale con `<Receptor>` vacío (`XmlFacturaBuilder.java:82-83, 102-112`).
- **Reproducir:** `POST /emitir/<PEDIDO_ID>` con body `{"tipo":"ZZ"}` ⇒ 500 y `ultimo_numero` aumentado para `tipo='ZZ'`.
- **Corrección:** whitelist `{01,02,03,04}` validada antes de reservar el consecutivo. Para `01`, exigir datos del receptor en el body.
- **Garantía:** tests del controller: tipo inválido ⇒ 400 y consecutivo sin cambio; 01 sin receptor ⇒ 400.

### M6 [MEDIO] No se guarda el XML ni la respuesta de Hacienda, y el RECHAZADO no tiene motivo
- **Archivo:** `…/service/facturacion/FacturacionEnvioProcessor.java:51-59, 86-90`. `HaciendaApiClient.consultarEstado` (l.129-130) solo lee `ind-estado` y descarta `respuesta-xml`.
- **Riesgo:** sin el XML firmado ni el MensajeHacienda no hay evidencia legal (hay obligación de conservarlos), no se le puede enviar el XML al receptor y no se puede diagnosticar un rechazo. El XML se regenera en cada reintento con datos actuales del producto (nombre, CAByS), así que puede no coincidir con el original.
- **Corrección:** guardar el XML firmado (Storage) al primer envío y reutilizarlo en los reintentos. Guardar el `respuesta-xml` decodificado y el detalle del rechazo en `mensajeHacienda`.
- **Garantía:** test: un reintento envía exactamente los mismos bytes que el primer envío; un RECHAZADO deja `mensajeHacienda` con el detalle.

### M7 [MEDIO] `fecha` del payload sin zona horaria
- **Archivo:** `…/service/HaciendaApiClient.java:71-72` (`ISO_LOCAL_DATE_TIME`, sin offset). Además es la hora del envío y no la `FechaEmision` del comprobante.
- **Riesgo:** la API de recepción espera la fecha con offset (`-06:00`) y coherente con el comprobante. Puede rechazar el envío o generar inconsistencias en los reintentos de contingencia (fecha distinta en cada intento).
- **Corrección:** usar `cf.getFechaEmision()` con offset `-06:00` (mismo formato que `XmlFacturaBuilder.DT_FMT`).
- **Garantía:** test del payload serializado con regex `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-06:00`.

### B1 [BAJO] `ProveedorSistemas` usa la cédula del emisor
- **Archivo:** `…/service/XmlFacturaBuilder.java:77`. Debe ser la identificación del proveedor del sistema (HotClick), no la del comercio.
- **Corrección:** propiedad `hacienda.proveedor-sistemas` (placeholder `<CEDULA_PROVEEDOR>`). **Garantía:** test que lo verifique.

### B2 [BAJO] La fecha de la clave y la `FechaEmision` se toman por separado
- **Archivo:** `FacturacionEmisionSupport.java:79` (`LocalDateTime.now()` para la clave) frente a `model/ComprobanteFiscal.java:79` (inicializador de campo con otro `now()`). Cerca de medianoche pueden caer en días distintos.
- **Corrección:** calcular un solo `now`, usarlo en la clave y asignarlo con `setFechaEmision`. **Garantía:** test con `Clock` fijo a 23:59:59.999.

### B3 [BAJO] Cédula ausente reemplazada por ceros
- **Archivo:** `FacturacionEmisionSupport.java:77-78, 124`. Si no hay cédula se usa `000000000000` y se reserva consecutivo, aunque el XML va a fallar después (`XmlFacturaBuilder.java:65-67`).
- **Corrección:** validar la configuración fiscal antes de reservar el consecutivo. **Garantía:** test que verifique que el consecutivo no cambia.

### B4 [BAJO] Sucursal y terminal fijas (`001`/`00001`) en el consecutivo
- **Archivo:** `…/service/ClaveNumericaService.java:31-34`. Un negocio con varias sucursales o cajas POS comparte una sola secuencia y no puede declarar terminales.
- **Corrección:** parametrizar sucursal y terminal por bodega o caja y agregarlas a la clave única de `hot_click_consecutivo_fiscal_tb`. **Garantía:** test de 2 terminales con secuencias independientes.

---

## MEJORAS

| # | Mejora | Impacto | Esfuerzo | Archivos | Cambio propuesto |
|---|---|---|---|---|---|
| X1 | XSD oficiales v4.4 + test de drift | Alto | Bajo | `resources/hacienda/`, `XmlFacturaSchemaValidator.java`, `scripts/eng-gates/hacienda-xml-drift.mjs` | Versionar los XSD oficiales, validar contra ellos en CI y quitar el "subset". |
| X2 | Máquina de estados explícita | Alto | Medio | `ComprobanteFiscal.java`, `FacturacionEnvioProcessor.java` | Enum con transiciones permitidas (PENDIENTE_CONFIG, PENDIENTE, ENVIADO, ACEPTADO, RECHAZADO, ERROR_TRANSITORIO, AGOTADO), validadas en un solo lugar. |
| X3 | Alertas de comprobantes atascados | Alto | Bajo | `FacturacionPollingService.java`, métricas | Métrica o alerta para ENVIADO > 24 h, cola AGOTADO > 0 y RECHAZADO por día. Hoy solo quedan en el log. |
| X4 | Polling con backoff y límite de edad | Medio | Bajo | `ComprobanteFiscalRepository.java:35-38` | La query incluye ERROR, pero el polling lo ignora (`FacturacionPollingService.java:49-53`). Filtrar solo ENVIADO, ordenar por fecha y espaciar las consultas. |
| X5 | Notas de crédito y débito (02/03) | Alto | Alto | nuevo `NotaCreditoService`, `XmlFacturaBuilder` | Anulaciones o devoluciones con `InformacionReferencia` a la clave original. Hoy no existe el flujo. |
| X6 | Envío del XML y el PDF al receptor | Medio | Medio | servicio de email | Al pasar a ACEPTADO, enviar el XML firmado, el MensajeHacienda y un PDF. |
| X7 | Errores claros en la UI | Medio | Bajo | `FacturaController.java`, `frontend/src/services/haciendaService.ts` | Exponer `mensajeHacienda` saneado y una acción sugerida ("Falta certificado", "Producto sin CAByS"). |
| X8 | Suite de tests de facturación | Alto | Medio | `src/test/.../facturacion/` | Tests de: concurrencia de consecutivos (Testcontainers Postgres), idempotencia de emisión, resiliencia HTTP (MockRestServiceServer), redondeo HALF_UP por línea con varias tasas (1, 2, 4, 13%). |

### Notas verificadas (sin hallazgo)
- El consecutivo usa UPDATE … RETURNING atómico con REQUIRES_NEW (`ConsecutivoFiscalService.java:48-63`). Es correcto contra duplicados; lo esperable son huecos.
- La clave numérica tiene 50 dígitos validados y la seguridad usa `SecureRandom` (`ClaveNumericaService.java:36-50, 65-69`).
- El XML escapa caracteres especiales (`XmlFacturaBuilder.java:198-202`) y el validador bloquea DTD y esquemas externos (XXE).
- El token ATV se cachea por empresa con lock y renovación 5 min antes de vencer, y no se registra en el log.
