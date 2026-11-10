# Auditor 3 — Verificación SOLO LECTURA master 8ee8ada8 (PR #447, MED-5)

**Veredicto: MED-5 se CIERRA. No queda ningún ALTO en área 3.** Tests dirigidos: 48/48 en verde (EXIT=0, log `/workspace/auditor3/tests-8ee8.log`). No corrí la suite completa porque el lock existe y no me tocaba.

## Evidencia
1. **Cantón validado contra la provincia (lista CR):** `service/envio/DestinoEnvio.java` tiene las 7 provincias y los 84 cantones, con Río Cuarto, Monteverde y Puerto Jiménez. `resolver()` devuelve 400 con un mensaje genérico en estos casos: viene solo uno de los dos, la provincia no existe o el cantón es de otra provincia. Dónde se aplica:
   - Checkout: `CheckoutPaquetesPlanner.planificar` (valida antes de cobrar), `CheckoutGrupoFactory` y `CheckoutOrderFactory.crearPedido`.
   - Tienda invitado: `StorefrontGuestOrderService.construirPedido` (+121). Ahí la validación corre después de reservar stock, pero `crearPedido` es `@Transactional` (l.56), así que se hace rollback. El test EnvioConfigAdminTest "MED-5 …400 genérico y no crea pedido" lo cubre.
   - Tests: DestinoPedidoTest l.48 y EnvioConfigAdminTest l.142.
2. **Dirección armada por el servidor:** `DestinoEnvio.direccionFinal` quita del final del texto libre cualquier nombre de cantón o provincia y agrega siempre el cantón y la provincia canónicos. Tests: DestinoPedidoTest l.60 ("…, Siquirres, Limón" con Heredia/Belén cobra GAM y la dirección termina en "Belén, Heredia") y EnvioConfigAdminTest l.122.
3. **V213 y persistencia:** `V213__pedido_destino_envio.sql` es aditiva: 4 columnas nullables con `ADD COLUMN IF NOT EXISTS`, y el número de versión es único. `Pedido.java` +139 mapea las 4 columnas. Las llenan `CheckoutOrderFactory.aplicarDestino` (en retiro no guarda zona) y la tienda (zona GAM/FUERA_GAM, monto = costoEnvio).
4. **Lo ve el negocio, no los otros negocios:** `PedidoDetailMapper` +86 agrega los 4 campos al mismo mapa que `direccionEntrega`. Se usa solo desde `PedidoService` l.261–276: listados admin y `…PorEmpresa(empresaId)`, con el guard de tenant de siempre. No se abre ningún endpoint nuevo. El front lo muestra en `OrderCardExpanded.tsx` +213.
5. **Warn de config:** `ConfiguracionEnvioService` +42 hace `log.warn` solo con `e.getClass().getSimpleName()`, sin SQL ni PII. Test: DestinoPedidoTest l.93.

## Residuales (BAJO, no bloquean)
- **B-1:** si no vienen ni provincia ni cantón, `resolver` devuelve null en vez de 400. El envío normal cobra fuera del GAM, que es la tarifa más cara y protege a HotClick. Si el producto quiere obligar el destino en domicilio, hay que exigirlo en el DTO.
- **B-2:** `direccionFinal` solo limpia los nombres de zona que quedan al final. Un texto como "Limón centro, frente al parque" se mantiene en las señas. Igual el cantón y la provincia canónicos quedan al final y en campos aparte, así que no se puede engañar a quien lee la zona cobrada.
- **B-3:** en un grupo multi-paquete, `envioMontoZona` guarda la tarifa de la zona y no el monto cobrado a ese subpedido (que es ₡0 si es un paquete extra del mismo negocio). El comentario de `Pedido.java` dice lo contrario. Es solo informativo.
- Sigue aceptado el BAJO anterior: invitado con varios negocios que caen a la bodega HotClick paga un solo envío.

## Tests (reportes surefire 2026-10-30 14:47 hora CR)
DestinoPedidoTest 4, EnvioPorNegocioTest 8, EnvioConfigAdminTest 7, StorefrontCostoEnvioTest 2, PaymentServiceTest 19, PaqueteSinBodegaEnvioTest 8. Todos con 0 fallos.
