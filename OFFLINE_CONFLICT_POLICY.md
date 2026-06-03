# Política de Resolución de Conflictos Offline — HOTCLICK SaaS

**Versión:** 1.0 | **Fase:** F15a | **Fecha:** 2026-06-02

## 1. Contexto y alcance

HOTCLICK opera en Costa Rica en entornos con conectividad intermitente: ferias, mercados,
zonas rurales o negocios con ISP inestable. El sistema debe permitir operar sin conexión
y sincronizar cuando la conexión se restablezca.

**Entidades que pueden modificarse offline:**
- Ventas POS (Caja registradora)
- Ajustes de stock manual
- Pedidos creados manualmente
- Datos de catálogo leídos desde caché (solo lectura)

**Entidades que requieren conexión obligatoria:**
- Pagos con tarjeta / PayPal / SINPE
- Facturación electrónica Hacienda (XML 4.3)
- Generación de consecutivos fiscales
- Login / refresh de tokens JWT

---

## 2. Arquitectura offline

```
┌─────────────────────┐        ┌──────────────────────┐
│   PWA (Service SW)  │◄──────►│  IndexedDB           │
│   - Cache estática  │        │  - syncQueue         │
│   - Cache API GET   │        │  - productCache      │
└────────┬────────────┘        └──────────────────────┘
         │  online event
         ▼
┌─────────────────────┐        ┌──────────────────────┐
│   SyncService       │───────►│  Spring Boot API     │
│   - procesar cola   │        │  - /api/pedidos       │
│   - reintentos      │        │  - /api/stock/*      │
└─────────────────────┘        └──────────────────────┘
```

**Estrategia de caché por tipo de recurso:**

| Recurso | Estrategia | TTL |
|---------|-----------|-----|
| Assets estáticos (JS/CSS/img) | Cache First | indefinido (revisioned) |
| `GET /api/productos` | Network First → Cache Fallback | 30 min |
| `GET /api/marcas/publicas` | Network First → Cache Fallback | 60 min |
| `GET /api/categorias` | Network First → Cache Fallback | 60 min |
| Mutaciones (POST/PUT/DELETE) | Queue in IndexedDB | hasta sincronizar |

---

## 3. Tipos de conflicto y resolución

### 3.1 Conflicto de stock (caso más crítico)

**Escenario:** El tablet del vendedor A está offline y registra la venta de 3 unidades del
producto X (stock en caché: 5). Mientras tanto, otro canal vende 4 unidades del mismo
producto (stock real en servidor: 1).

**Regla:** **El servidor gana en stock.**

```
Stock offline (optimista) → 5 - 3 = 2
Stock real servidor       → 1

Al sincronizar: API retorna 409 (OptimisticLockException / StockInsuficienteException)
```

**Resolución:**
1. La venta offline se marca como `CONFLICTO_STOCK` en la cola.
2. Se notifica al operador con el detalle (producto, cantidad vendida, stock real).
3. El operador decide: cancelar la venta o proceder con stock negativo (backorder).
4. Si cancela → se elimina de la cola. Si confirma → se envía con `forceStock=true` (solo EMPRENDEDOR/ADMIN_IT).

**Código de error backend:** `409 CONFLICT` con body:
```json
{ "tipo": "STOCK_INSUFICIENTE", "productoId": 42, "stockReal": 1, "cantidadVendida": 3 }
```

---

### 3.2 Conflicto de pedido duplicado

**Escenario:** El vendedor crea un pedido offline dos veces (doble tap en pantalla lenta).

**Regla:** **Idempotencia por `clientRequestId`.**

Cada pedido offline incluye un UUID generado en el cliente (`clientRequestId`). Si el servidor
ya tiene un pedido con ese ID, retorna el pedido existente en lugar de crear uno nuevo.
No se lanza error — respuesta HTTP 200 con el pedido ya creado.

---

### 3.3 Conflicto de precio

**Escenario:** El admin cambia el precio de un producto en el servidor mientras el vendedor
tiene el producto en el carrito offline con el precio anterior.

**Regla:** **El precio del servidor prevalece al sincronizar.**

Al procesar la venta desde la cola, el backend recalcula el total con el precio actual.
Si la diferencia es > 5%, la venta se marca `PRECIO_DESACTUALIZADO` y el operador debe
confirmarla manualmente.

---

### 3.4 Conflicto de ajuste de stock manual

**Escenario:** Dos tablets hacen ajuste de stock offline del mismo producto simultáneamente.

**Regla:** **Last-write-wins con alerta.**

El ajuste más reciente (timestamp) prevalece. Ambos ajustes se registran en la auditoría.
El sistema emite una alerta en AdminSecurityCenter cuando detecta dos ajustes en el mismo
producto dentro de la misma sesión offline.

---

### 3.5 Datos de catálogo (solo lectura offline)

No hay conflicto — el catálogo es solo lectura en modo offline. Al reconectarse,
los datos se actualizan automáticamente desde el servidor (Network First).

---

## 4. Cola de sincronización

### Estructura en IndexedDB (store: `syncQueue`)

```js
{
  id:           UUID,          // clientRequestId
  tipo:         'VENTA_POS' | 'PEDIDO_MANUAL' | 'AJUSTE_STOCK',
  payload:      Object,        // body del request original
  endpoint:     String,        // '/api/pedidos/manual'
  method:       'POST' | 'PUT',
  creadoAt:     ISO8601,
  intentos:     Number,        // máx 3
  estado:       'PENDIENTE' | 'SINCRONIZANDO' | 'ERROR' | 'CONFLICTO' | 'OK',
  errorDetalle: String | null
}
```

### Orden de procesamiento

1. FIFO estricto por `creadoAt` — no se altera el orden histórico de ventas.
2. Si un item falla, se pausa la cola y se notifica al operador.
3. Los items en `CONFLICTO` requieren acción manual; los demás continúan.

### Reintentos

| Intento | Delay antes del reintento |
|---------|--------------------------|
| 1       | inmediato                |
| 2       | 30 segundos              |
| 3       | 5 minutos                |
| 4+      | No más reintentos → `ERROR` permanente, requiere acción manual |

---

## 5. Regla general de prioridad

```
Servidor > Caché local, excepto en:
  - clientRequestId (idempotencia): caché local define unicidad
  - Timestamp de creación de venta: el local es el canónico
  - Confirmación manual del operador: override explícito
```

---

## 6. UX de conflictos

- **Badge rojo** en la barra de admin con `N items pendientes de sync`.
- **Pantalla de revisión de cola** (`/admin/offline/cola`) lista todos los pendientes.
- Items en `CONFLICTO` muestran el detalle y botones de acción (confirmar / descartar).
- Items en `OK` desaparecen automáticamente después de 24h.
- Sonido opcional (beep) cuando hay conflictos que requieren atención.

---

## 7. Exclusiones de esta política

Las siguientes operaciones **nunca se encolan offline** y deben esperar conexión:

- Pagos con tarjeta / PayPal / SINPE (requieren procesador externo)
- Facturación electrónica Hacienda (requiere firma digital + API Hacienda)
- Login / logout (require servidor de autenticación)
- Operaciones de administración de usuarios y permisos
- Webhooks de Stripe

---

*Documento vivo — actualizar cuando se agreguen nuevas entidades offline en fases F16+.*
