# Auditor 3 Marketplace — Informe sobre master 9e576bfd (merge PR #444, envío por negocio configurable)

Solo lectura. Checkout detached en /workspace/auditor3/src (9e576bfd2), sin commits, push, PRs ni mensajes.
Diff revisado: 9e576bfd^1..9e576bfd (PR #444). Fecha: 2026-10-30 (hora Costa Rica).

## Veredicto
- **A-2: CERRADO.** La zona GAM o fuera del GAM la decide el servidor, los montos son configurables solo por ADMIN y V212 está bien formada.
- **MED-3: CERRADO en sus tres puntos (a, b, c).** Queda un residual BAJO: la excepción ya aceptada de invitado + bodega HotClick.
- **No queda ningún ALTO en el área 3 en 9e576bfd.**
- Nuevo **MED-5**: el destino (provincia + cantón) lo declara el cliente y no se guarda ni se cruza con la dirección.

Tests dirigidos (`mvn -o`, H2): **42 tests, 0 fallas, exit 0** (log: /workspace/auditor3/tests-9e57.log).
- EnvioPorNegocioTest: 8
- StorefrontCostoEnvioTest: 2
- EnvioConfigAdminTest: 5
- PaqueteSinBodegaEnvioTest: 8
- PaymentServiceTest: 19

No corrí la suite completa. El lock /workspace/hotclick/.suite-completa.lock existe y lo respeté (no lo tomé).

## MED-3
| Punto | Estado | Evidencia |
|---|---|---|
| (a) bodega efectiva = bodega o bodegaVentaOnline | CERRADO | `CheckoutPaquetesPlanner.bodegaDeOrigen` (:96-101): bodega del producto → `empresa.bodegaVentaOnline` → bodegaDefault. En :63-65, el producto sin bodega propia que despacha desde la bodega online de su tienda entra en `sinBodegaPropia` y toma el envío "sin-bodega" que manda el front. Antes caía a RETIRO. |
| (b) envío una vez por negocio | CERRADO | `CheckoutGrupoFactory.enviosPorNegocio` (~:119-133): la clave es la empresa de la bodega. Cada negocio paga un solo envío, el más caro de sus paquetes, cargado al primer paquete; los demás van en ₡0 (nuevo overload `OrderPricingService.calcularPaquete(..., int costoEnvio)`). Cuadran el total, el cobro ONVO y la billetera. |
| (c) tienda invitado con el mismo clasificador | CERRADO | `StorefrontGuestOrderService.costoEnvioTienda` (:191-196) usa `OrderPricingService.metodoNormalPorDestino` con provincia y cantón del DTO, igual que el planner. El pedido de tienda es de un solo negocio, así que lleva un solo envío. |
| Residual | BAJO (ya aceptado, "decisión 1") | Invitado + productos de varios negocios sin bodega ni bodegaVentaOnline: todos caen a la bodega HotClick y forman un solo paquete con clave E<plataforma>. Pagan un solo envío entre varios negocios, o sea se cobra de menos, nunca de más. Ver `CheckoutValidator.assertBodegaTenant` :124-140. |

## A-2
| Criterio | Estado | Evidencia |
|---|---|---|
| Zona decidida en el servidor por provincia y cantón | CERRADO | `ZonaEnvio.esGam` es una lista fija de cantones GAM (SJ, Alajuela, Cartago, Heredia), con normalización de tildes y mayúsculas. `metodoNormalPorDestino` reescribe tanto `ENVIO_NORMAL_GAM` como `ENVIO_NORMAL_FUERA_GAM` según el destino: lo que el cliente elige como método normal se ignora. Se aplica en el planner (:85-87) y en la tienda. |
| Destino desconocido = fuera del GAM | CERRADO | `esGam` devuelve false si falta la provincia o el cantón, o si no coinciden con la lista. |
| ¿El cliente puede forzar la tarifa GAM? | **Parcial (MED-5)** | No puede hacerlo eligiendo el método, pero sí declarando `provincia`/`canton` de un cantón GAM por API, aunque la dirección en texto libre diga Limón. Esos dos campos no se guardan en el Pedido (grep: solo se leen en el planner y en la tienda), así que el negocio no ve la zona declarada ni hay validación cruzada. El impacto es acotado: unos ₡1.500 por negocio a favor del comprador, y el despacho es manual. MEDIO, no ALTO. |
| Montos configurables solo por ADMIN | CERRADO | `AdminConfigEnvioController`: GET y PUT de `/api/admin/configuracion/envio` con `@PreAuthorize("hasRole('ADMIN')")`, además de la regla `/api/admin/**`. El único endpoint público es `GET /api/public/envio/montos`, de solo lectura y sin el tope (`SecurityAuthorizationRules` ~:105). El test `noAdmin403` cubre 403 para no-admin y 401 sin sesión. |
| Montos negativos o sin límite | CERRADO | `ConfiguracionEnvioService.validar` exige 0..50.000. Un valor no entero o ausente da `NumberFormatException`/IAE → 400 sin cambios (test `invalido400`). V212 tiene CHECK BETWEEN 0 AND 50000 en las tres columnas. |
| Defaults | OK | GAM ₡4.000, fuera ₡5.500, express ₡5.000, en el código (DEFAULTS) y en V212. Test `defaults`. |
| Migración V212 | OK | Número único (V210, V211, V212). Es aditiva: `CREATE TABLE IF NOT EXISTS` + `INSERT ... ON CONFLICT (id) DO NOTHING`, sintaxis válida para PostgreSQL. Los tests usan ddl-auto/H2, así que Flyway no la ejecutó acá (no verificado contra PostgreSQL real). |
| Fallback | BAJO | `montos()` devuelve DEFAULTS si la tabla o la fila no existen o si hay `DataAccessException`, sin log. Un fallo silencioso de BD cobraría los defaults sin aviso. Conviene un log warn. |

## Otros riesgos revisados (sin ALTO)
- Domicilio y encomienda siguen fijos en ₡2.000, fuera de la config. Está dentro de lo decidido, no es hallazgo.
- El cálculo del front (`montosEnvio.ts`, `tiendaCostoEnvio`) es solo para mostrar. El servidor recalcula siempre.
- Orden de validación: el planner normaliza el método antes de `validarRetiroPaquete` y de `enviosPorNegocio`. No hay forma de mezclar métodos para esquivar el cobro.
- El cupón y la gift card no cambian; se siguen aplicando por paquete con el envío ya resuelto.

## Estado de hallazgos previos
| ID | Estado |
|---|---|
| A-1 | Cerrado desde 72eb8add (sin cambios) |
| A-2 | **Cerrado** (salvo MED-5) |
| MED-1 personalizados en carrito/tienda | Abierto, sin cambio |
| MED-2 residuales M-08 (Stripe/Tilopay/manual) | Abierto, sin cambio en este PR |
| MED-3 | **Cerrado** (residual BAJO ya aceptado) |
| MED-4 SelfCheckout `getPrecioVenta` | No re-verificado en detalle: el rango 72eb8add..9e576bfd trae cambios de POS/IVA ajenos a #444 |
| MED-5 (nuevo) | Abierto: destino declarado por el cliente, sin guardar ni cruzar con la dirección |
| B-1..B-3, B-5, B-6 | Sin cambio |

## No verificado
- V212 corrida con Flyway sobre PostgreSQL real, y datos de producción.
- Suite completa y CI de 9e576bfd.
- El resto del rango 72eb8add..9e576bfd fuera de #444 (IVA, POS, suscripciones, auth): no es parte de este pedido.
- El front compilado.
