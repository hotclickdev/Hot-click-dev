# Informe de Cierre de Arquitectura, Auditoría de Concurrencia y Manual de Despliegue

**Plataforma:** HOTCLICK SaaS Multi-tenant
**Alcance del informe:** Unificación de inventario Tienda-por-Slug / POS de Ferias, control de cuotas SaaS, blindaje de concurrencia en stock y SSE, y procedimiento de pruebas de carga.
**Tipo de documento:** Cierre de arquitectura + auditoría técnica + manual operativo.

---

## 1. Resumen ejecutivo de la arquitectura

HOTCLICK opera dos canales de venta sobre un **único modelo de inventario**: la tienda pública por slug (`/api/tienda/{slug}/**`, sin JWT, pensada para clientes finales) y la caja POS física usada en ferias y locales (`/api/pos/venta`, autenticada con JWT). Ambos canales escriben y leen las mismas tablas `Producto` y `Bodega` — no existen catálogos ni contadores de stock paralelos. Esto es deliberado: un vendedor en una feria y un cliente comprando desde el celular compiten por el mismo stock físico en tiempo real, y el sistema debe resolver esa contención sin sobreventa.

El aislamiento entre empresas (tenants) no se resuelve con `SET` de sesión ni con row-level security dependiente de variables de sesión, porque la infraestructura de base de datos (Supabase/PostgreSQL detrás de PgBouncer en **transaction mode**) devuelve la conexión física al pool al cierre de cada transacción, lo que destruye cualquier estado de sesión. En su lugar, el tenant activo se transporta en un `ThreadLocal` (`TenantContext`, `Hot_click_outlet/src/main/java/com/hotclick/security/TenantContext.java`) que vive únicamente durante el ciclo de vida del hilo que atiende el request:

- **Canal POS / panel admin:** `TenantFilter` puebla `TenantContext` a partir del claim `empresaId` del JWT antes de llegar al controller, y `CompanyScope` (`security/CompanyScope.java`) expone `getCurrentEmpresaId()` y `assertCanAccess(resourceEmpresaId)` para que cada servicio valide explícitamente que el recurso solicitado pertenece al tenant autenticado.
- **Canal tienda pública:** `SlugTenantInterceptor` resuelve la empresa a partir del slug en la URL (`/api/tienda/{slug}`) y carga el mismo `TenantContext` **antes** de que el método del `StorefrontController` se ejecute — sin requerir autenticación, ya que el visitante es anónimo.
- **Trabajos asíncronos:** como el `ThreadLocal` no cruza el límite de un hilo `@Async`, `TenantAwareTaskDecorator` se encarga de propagar el `empresaId` al hilo de ejecución asíncrona, evitando fugas de contexto o pérdida de aislamiento en tareas en segundo plano.

El resultado es una arquitectura donde el aislamiento de datos es responsabilidad explícita del código de aplicación (defensa en profundidad vía `CompanyScope.assertCanAccess`), no de una característica de la base de datos que la topología de PgBouncer no soporta de forma confiable.

---

## 2. Matriz de seguridad y control de cuotas SaaS

### 2.1 Límites de plan (productos, bodegas, usuarios, cajas)

Cada `Empresa` referencia un `Plan` (`model/Plan.java`) que define límites por entidad: `maxProductos`, `maxBodegas`, `maxUsuarios`, `maxCajas` y `maxCreditosAi`. La convención es uniforme en todo el sistema: **`-1` significa ilimitado**, cualquier otro entero es un tope duro.

La verificación está centralizada en `TenantService.ejecutarVerificacion(empresaId, entidad, usoActual, cantidad)` (`service/TenantService.java`). El método:

1. Resuelve el límite según la entidad (`"productos" | "usuarios" | "bodegas" | "cajas"`).
2. Si el límite es `-1`, permite sin más validación.
3. Si `usoActual + cantidad > limite`, lanza `PlanLimitException` con un mensaje ya formateado para el usuario final (incluye cuántos recursos tiene y cuántos puede agregar) y una sugerencia de upgrade (`"Plan actual: «X». Ve a Configuración → Suscripción..."`).

```
@PostMapping("/productos")  →  TenantService.verificar("productos", ...)  →  ejecutarVerificacion()
                                                                                   │
                                                       usoActual + cantidad > limite ?
                                                                                   │ sí
                                                                          throw PlanLimitException
```

`PlanLimitException` (`exception/PlanLimitException.java`) está anotada con `@ResponseStatus(HttpStatus.FORBIDDEN)` y transporta dos campos adicionales — `entidad` y `upgrade` — que `GlobalExceptionHandler.handlePlanLimit()` (`config/GlobalExceptionHandler.java`) serializa en un cuerpo JSON consistente:

```json
{
  "error": "LIMIT_REACHED",
  "message": "Has alcanzado el límite de productos de tu plan (50/50).",
  "upgrade": "Plan actual: «Emprendedor Pro». Ve a Configuración → Suscripción para ampliar tu capacidad."
}
```

El frontend usa este contrato fijo (`error: "LIMIT_REACHED"`) para distinguir un bloqueo de cuota de cualquier otro 403 de autorización y mostrar un modal de upgrade en lugar de un error genérico.

### 2.2 Diseño atómico check-and-reserve de créditos de IA

El consumo de IA (generación de fichas de producto, copiloto, etc.) está limitado mensualmente por empresa según `Plan.maxCreditosAi` (`-1` ilimitado, `0` sin acceso, valor positivo = créditos/mes). El componente responsable es `AiQuotaService` (`service/AiQuotaService.java`).

El riesgo de diseño que este servicio resuelve explícitamente es un **TOCTOU (time-of-check to time-of-use)**: si el flujo fuera "leer contador → comparar contra límite → llamar a Claude → incrementar contador", dos requests concurrentes de la misma empresa podrían leer el mismo valor de `llamadas` antes de que ninguno incremente, y ambos pasarían la validación aunque solo quede 1 crédito disponible — sobreconsumo de cuota (y de costo real de API).

La solución es un **UPDATE condicional atómico** ejecutado directamente en PostgreSQL, sin lectura previa en aplicación:

- `AiQuotaService.verificarYReservar(empresaId)` invoca `AiUsoRepository.reservarSlot(empresaId, anio, mes, limite)`, que ejecuta un `UPDATE ... WHERE llamadas < :limite` (UPSERT condicional) sobre `hot_click_ai_uso_tb`. El incremento y la comparación contra el límite ocurren en la misma sentencia SQL, dentro de la misma transacción de fila — no hay ventana entre "verificar" y "reservar" en la que otra transacción pueda colarse.
- Si la fila se actualiza (`result` no vacío), el slot fue reservado con éxito y la llamada a Claude puede proceder.
- Si el `WHERE` no matchea (porque `llamadas` ya alcanzó `limite`), no se actualiza ninguna fila y el método retorna `false` — la empresa queda bloqueada sin haber gastado un crédito que no tenía.

El contrato documentado en el propio servicio es estricto sobre el orden de las llamadas:

```
1. verificarYReservar()   — decrementa el slot ANTES del call HTTP a Claude
2. actualizarTokens()     — actualiza tokens IN/OUT DESPUÉS del call
   (no usar registrarUso() si ya se usó verificarYReservar() — duplicaría el conteo)
```

`ADMIN_IT` tiene bypass total (`resolverLimite` retorna `-1` sin consultar `Plan`), y existe un fallback legacy por `planSaas` (`ENTERPRISE`/`PRO`/default) para empresas que aún no tienen la FK a `Plan` asignada.

---

## 3. Reporte de auditoría de concurrencia y blindaje de stock

### 3.1 Bloqueo pesimista `SELECT FOR UPDATE` bajo contención extrema

`VentaService.crearVenta()` (`service/VentaService.java`) es el punto de entrada compartido para ventas POS y, vía `StockService`, para checkout web. Por cada item de venta:

```java
Producto producto = productoRepository.findByIdForUpdate(itemDto.getProductoId())
    .orElseThrow(...);
```

`ProductoRepository.findByIdForUpdate` aplica `@Lock(LockModeType.PESSIMISTIC_WRITE)`, traducido por Hibernate a `SELECT ... FOR UPDATE`. Esto bloquea la fila del producto a nivel de PostgreSQL hasta el `COMMIT` de la transacción actual: si una segunda transacción (otro cajero del POS, u otro cliente cerrando checkout en la web) intenta tomar el mismo lock sobre el mismo producto, su sesión queda esperando en el motor de base de datos hasta que la primera libere la fila. El repositorio expone también `findAllByIdsForUpdate` para bloquear en lote varios productos en un solo `SELECT FOR UPDATE` cuando una venta tiene múltiples ítems, evitando locks secuenciales innecesarios.

La validación de stock distingue dos rutas dentro de la misma transacción bloqueada (`VentaService.validarProductoParaVenta`):
- Si la venta proviene de un carrito web con reserva previa, se compara contra `stockActual` (la reserva ya descontó la disponibilidad).
- Si es una venta directa (POS o admin), se compara contra `stockDisponible = stockActual - stockReservado`, respetando reservas activas de otros clientes que aún no completaron checkout.

Si la cantidad solicitada excede lo disponible, se lanza `StockInsuficienteException` — el cliente recibe un único motivo de fallo de negocio claro, no un error genérico de base de datos.

**Comportamiento auditado bajo contención extrema:** el script `loadtest/k6-pos-checkout.js` incluye un escenario dedicado (`contencion_extrema`) que dispara hasta 30 VUs simultáneos — mezclando ventas POS y pedidos web — contra un único producto con stock crítico (por defecto, 3 unidades), durante una ráfaga continua de 15 segundos sin `sleep` relevante entre iteraciones, para forzar el peor caso real: un cajero de feria y decenas de compradores web compitiendo por el mismo segundo. El script valida tres invariantes:

| Invariante | Mecanismo de verificación | Umbral |
|---|---|---|
| No hay sobreventa | `criticoSuccessTotal` (conteo de 200/201 sobre el producto crítico) | `count <= STOCK_CRITICO_ESPERADO` |
| No hay deadlock / lock timeout | `contencionDeadlock5xxTotal` (conteo de respuestas 500/504) | `count == 0` |
| El stock final nunca es negativo | `verificarSobreventa()` — lee el stock real en BD tras cada venta exitosa, no un contador en memoria (k6 ejecuta cada VU en una VM aislada, por lo que un contador compartido entre VUs no sería una fuente de verdad confiable) | `stock >= 0` |

Los códigos 403 (límite de plan) y 409 (conflicto de negocio / stock agotado) se tratan como resultados esperados bajo contención, no como fallas de infraestructura — el test configura `http.expectedStatuses(200, 201, 400, 403, 409)` explícitamente para que `http_req_failed` solo refleje errores 5xx o de red reales.

### 3.2 Limpieza de memoria en SSE bajo desconexión abrupta de red celular

El stock en tiempo real se propaga a los clientes conectados (web, POS) vía Server-Sent Events. `StockSseRegistry` (`sse/StockSseRegistry.java`) mantiene un `ConcurrentHashMap<String, CopyOnWriteArraySet<SseEmitter>>` indexado por la clave compuesta `"empresaId:productoId"` — la composición garantiza que un broadcast de stock de un tenant nunca alcance una conexión registrada bajo otro tenant, aunque ambos tengan un producto con el mismo ID numérico (aislamiento multi-tenant también a nivel de canal de notificación, no solo de base de datos).

Cada `SseEmitter` se crea sin timeout (`new SseEmitter(0L)`) porque la conexión se mantiene viva mediante un heartbeat propio (`@Scheduled(fixedDelay = 25_000)`) que envía un comentario SSE cada 25 segundos — necesario para que proxies intermedios (y el balanceador de Render) no cierren la conexión por inactividad.

La limpieza de memoria ante desconexión está centralizada en un único `Runnable cleanup` registrado en los tres callbacks de ciclo de vida del emitter:

```java
emitter.onCompletion(cleanup);
emitter.onTimeout(cleanup);
emitter.onError(ex -> cleanup.run());
```

`cleanup` remueve el emitter del `CopyOnWriteArraySet` correspondiente y, si el set queda vacío, remueve la entrada completa del `ConcurrentHashMap` (evitando que claves de productos sin suscriptores activos queden acumulando memoria indefinidamente) y decrementa un `AtomicInteger activeConnections` usado para observabilidad.

**Simulación de falla de red real:** el script `loadtest/sse-stress.mjs` abre hasta 150 conexiones SSE concurrentes contra `/api/marketplace/productos/{id}/stock-stream` y, para una fracción configurable de ellas (`SSE_ABRUPT_KILL_RATIO`, 15% por defecto), fuerza un corte de socket sin handshake de cierre mediante `req.destroy()` — simulando con precisión el caso real de un comprador con wifi inestable o que cierra la app de golpe en un celular, en contraposición a un `res.destroy()` de cierre limpio (cliente que navega a otra página). El script reporta cada 10 segundos `activas`, `cierres_normales`, `cortes_abruptos`, `errores` y memoria RSS del proceso cliente — permitiendo correlacionar visualmente que el conteo de conexiones activas del lado del registry decrece de forma consistente con los cierres (graceful o abruptos) y que no queda memoria residual acumulada tras una corrida sostenida, bajo el mismo tráfico generado por `k6-pos-checkout.js`.

---

## 4. Bitácora de componentes modificados/nuevos

| Componente | Ruta | Rol en el sistema |
|---|---|---|
| `TenantContext.java` | `src/main/java/com/hotclick/security/` | `ThreadLocal<Long>` que transporta el `empresaId` del tenant activo durante el ciclo de vida del request; única vía segura de aislamiento bajo PgBouncer transaction mode |
| `TenantFilter.java` | `src/main/java/com/hotclick/security/` | Filtro Servlet que puebla `TenantContext` desde el claim `empresaId` del JWT en cada request autenticado, y lo limpia en `afterCompletion` |
| `SlugTenantInterceptor.java` | `src/main/java/com/hotclick/security/` | Resuelve la empresa desde el slug de URL (`/api/tienda/{slug}`) y carga `TenantContext` para tráfico público sin JWT |
| `TenantAwareTaskDecorator.java` | `src/main/java/com/hotclick/security/` | Propaga `empresaId` a hilos `@Async`, donde el `ThreadLocal` de origen no es visible |
| `CompanyScope.java` | `src/main/java/com/hotclick/security/` | Punto central de control de acceso por tenant: `getCurrentEmpresaId()`, `assertCanAccess()`, `assertCanAccessNullable()`; bypass total para `ADMIN_IT` |
| `PlanLimitException.java` | `src/main/java/com/hotclick/exception/` | Excepción de dominio (`@ResponseStatus 403`) para cuotas de plan agotadas; transporta `entidad` y `upgrade` para el frontend |
| `TenantService.java` | `src/main/java/com/hotclick/service/` | Lógica de verificación de límites de plan (`productos`, `usuarios`, `bodegas`, `cajas`) y de features habilitadas (`tienePos`, `tieneAi`, etc.) |
| `AiQuotaService.java` | `src/main/java/com/hotclick/service/` | Control de cuota mensual de créditos de IA; implementa el patrón check-and-reserve atómico (`verificarYReservar`) |
| `AiUsoRepository.java` | `src/main/java/com/hotclick/repository/` | Query nativa `reservarSlot` con `UPDATE ... WHERE llamadas < :limite` — el UPSERT condicional que elimina el TOCTOU |
| `StockService.java` | `src/main/java/com/hotclick/service/` | Descuento de stock real, gestión de `stockReservado`, disparo de broadcast SSE tras cada movimiento |
| `VentaService.java` | `src/main/java/com/hotclick/service/` | Orquesta la venta POS/carrito: `SELECT FOR UPDATE` por producto, validación de stock disponible, conversión de carrito a pedido |
| `ProductoRepository.java` | `src/main/java/com/hotclick/repository/` | Expone `findByIdForUpdate` y `findAllByIdsForUpdate` con `@Lock(PESSIMISTIC_WRITE)` |
| `StorefrontController.java` | `src/main/java/com/hotclick/controller/` | Catálogo y pedidos públicos por slug (`/api/tienda/{slug}/**`); usa la misma `Bodega`/`Producto` que el POS |
| `StockSseRegistry.java` | `src/main/java/com/hotclick/sse/` | Registro thread-safe (`ConcurrentHashMap` + `CopyOnWriteArraySet`) de conexiones SSE por `empresaId:productoId`, con heartbeat y limpieza automática en desconexión |
| `InputSanitizer.java` | `src/main/java/com/hotclick/utils/` | Sanitización de texto libre contra XSS/inyección (`Jsoup.clean`), normalización de slugs, emails y nombres geográficos (`normalizeGeo`) |
| `V73__geo_normalizer_index.sql` | `src/main/resources/db/migration/` | Extensión `unaccent` + índice funcional normalizado (`UPPER(immutable_unaccent(...))`) sobre provincia/cantón de bodega, para matching geográfico de Buy Box sin acentos ni mayúsculas |
| `BodegaSelectorModal.jsx` | `frontend/src/components/pos/` | Pantalla bloqueante de selección de bodega operativa al abrir el POS; auto-selección si el plan solo tiene una bodega habilitada |
| `finanzasReporteService.js` | `frontend/src/services/` | Cliente del reporte de IVA/finanzas para contador (`/admin/finanzas/reporte-iva`), incluye descarga CSV |
| `PaymentService.java` | `src/main/java/com/hotclick/service/` | Orquestación de pagos (Stripe/PayXpert) y su intersección con el bloqueo de stock durante el checkout |
| `loadtest/k6-pos-checkout.js` | `loadtest/` | Suite k6 de 3 escenarios (POS, checkout web, contención extrema) para auditar concurrencia real de stock entre canales |
| `loadtest/sse-stress.mjs` | `loadtest/` | Script Node sin dependencias para estresar `StockSseRegistry` con conexiones SSE y desconexiones abruptas simuladas (`req.destroy()`) |

---

## 5. Manual de operación para pruebas de carga (Load Testing)

> Las pruebas están diseñadas para ejecutarse contra un entorno de staging o un set de productos "LOADTEST" aislado. Todos los pedidos generados por el script de checkout usan `notas: 'LOADTEST'` y correos con el patrón `loadtest+...@hotclick.test` para poder identificarlos y purgarlos; **no correr estos escenarios contra productos o catálogos de producción reales sin un set de datos descartable**.

### 5.1 Requisitos previos

1. Instalar k6: https://k6.io/docs/get-started/installation/
2. Tener Node.js disponible (`sse-stress.mjs` no requiere dependencias externas, solo `node:http`/`node:https`).
3. Obtener un `JWT_TOKEN` válido de un usuario con permisos de POS en la empresa de pruebas (login normal vía `/api/auth/login`), requerido para los escenarios `pos_feria` y `contencion_extrema`.
4. Confirmar el `TIENDA_SLUG` de la empresa de pruebas y el `BODEGA_ID` que se usará para descontar stock en el POS.

### 5.2 Escenario base — contención realista (POS + checkout web)

```bash
k6 run loadtest/k6-pos-checkout.js \
  -e BASE_URL=https://staging.hotclick.example \
  -e JWT_TOKEN=<token_del_usuario_pos> \
  -e TIENDA_SLUG=hotclick \
  -e BODEGA_ID=1 \
  -e POS_VUS=50 \
  -e CHECKOUT_VUS=100 \
  -e STEADY_DURATION=4m \
  -e PRODUCTO_ID_1=1 \
  -e PRODUCTO_ID_2=5
```

Esto simula 50 cajeros de feria y 100 compradores web operando en simultáneo durante una rampa de 30s, una fase estable de 4 minutos y una rampa de bajada de 30s, todos compitiendo por el mismo set de productos de alta demanda (`HOT_PRODUCTS`). Los IDs y precios deben coincidir con el seed real de catálogo (`V14__seed_productos_catalogo.sql`).

### 5.3 Escenario crítico — contención extrema sobre stock agotándose

Antes de correr este escenario, **fijar manualmente el stock del producto de prueba a un valor bajo y conocido** (ej. `stock = 3`) directamente en la base de datos de staging, para poder verificar que nunca se venden más de esas unidades:

```sql
UPDATE hot_click_producto_tb SET stock_actual = 3 WHERE id_producto = <ID_PRODUCTO_DESCARTABLE>;
```

Luego ejecutar:

```bash
k6 run loadtest/k6-pos-checkout.js \
  -e BASE_URL=https://staging.hotclick.example \
  -e JWT_TOKEN=<token_del_usuario_pos> \
  -e TIENDA_SLUG=hotclick \
  -e BODEGA_ID=1 \
  -e PRODUCTO_ID_CRITICO=<ID_PRODUCTO_DESCARTABLE> \
  -e PRECIO_PRODUCTO_CRITICO=10000 \
  -e STOCK_CRITICO_ESPERADO=3 \
  -e CONTENCION_VUS=30 \
  -e CONTENCION_DURATION=15s
```

El escenario `contencion_extrema` solo se activa si se pasa `PRODUCTO_ID_CRITICO` — si se omite, la corrida se limita a los escenarios 1 y 2 sin riesgo de agotar stock real. k6 reportará al final si los thresholds `critico_success_total` (≤ stock esperado) y `contencion_deadlock_5xx_total` (== 0) se cumplieron; cualquier falla en estos thresholds indica sobreventa real o un deadlock/lock-timeout en PostgreSQL que debe investigarse antes de pasar a producción.

### 5.4 Estrés de conexiones SSE

```bash
BASE_URL=https://staging.hotclick.example \
PRODUCT_IDS=1,5 \
SSE_CONNECTIONS=150 \
SSE_DURATION_SECONDS=300 \
SSE_ABRUPT_KILL_RATIO=0.15 \
SSE_RAMP_UP_MS=8000 \
node loadtest/sse-stress.mjs
```

Correr este script en paralelo al escenario de k6 (apuntando al mismo `BASE_URL` y a los mismos `PRODUCT_IDS`) reproduce el patrón de tráfico real: ventas que disparan broadcasts de stock mientras cientos de clientes abren y cortan conexiones SSE de forma errática. El reporte cada 10 segundos (`activas`, `abiertas_total`, `cierres_normales`, `cortes_abruptos`, `errores`, `eventos_stock`, `rss_cliente_mb`) permite confirmar visualmente que no hay fuga de memoria ni del lado del cliente de prueba ni — revisando logs/métricas del backend en simultáneo — del `ConcurrentHashMap` de `StockSseRegistry`.

### 5.5 Limpieza posterior a la corrida

Todos los registros generados por estas pruebas son identificables y deben purgarse antes de considerar el entorno limpio para otra ronda de pruebas o para producción:

```sql
DELETE FROM hot_click_pedido_tb WHERE notas LIKE 'LOADTEST%';
DELETE FROM hot_click_usuario_tb WHERE correo LIKE 'loadtest%@hotclick.test';
-- Restaurar el stock del producto crítico si se va a reutilizar el mismo ID:
UPDATE hot_click_producto_tb SET stock_actual = <valor_original> WHERE id_producto = <ID_PRODUCTO_DESCARTABLE>;
```

No ejecutar ninguno de estos escenarios contra `BASE_URL` de producción sin un set de productos y usuarios exclusivamente descartables, y nunca sin haber confirmado primero el plan de limpieza posterior.
