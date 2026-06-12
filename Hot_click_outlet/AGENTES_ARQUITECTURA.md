# Arquitectura de Agentes IA — HOTCLICK

## Flujo completo

```
Usuario navega → Homepage
                    ↓
            HomeChatBar (Agente 1)
            [guarda historial en chatStore]
                    ↓
            ProductsPage (panel lateral)
                    ↓
            ProductDetailPage
            [ProductDetailAssistant — Agente 2]
                    ↓
            CartPage
            [CartAssistant — Agente 3]  ←── lee chatStore del Agente 1
                    ↓
            CheckoutPage → Pago
                    ↓
            PaymentStatusPage
            [CheckoutAssistant — Agente 4]
```

---

## Agente 1 — HomeChatBar (Homepage)

**Archivo:** `frontend/src/components/ui/HomeChatBar.jsx`

**Qué hace:** Punto de entrada del usuario. Vive en el hero de la homepage. Cuando el usuario escribe, el fondo se vuelve gris y aparece un chat inline sin navegar a otra página.

**Conexión hacia afuera:** Escribe en `chatStore` (Zustand) cada mensaje del usuario. Ese store persiste en memoria mientras el usuario navega.

```
HomeChatBar
  └── escribe en useChatStore.mensajes[]
        └── { rol: 'user', texto: 'quiero luces para exterior' }
        └── { rol: 'assistant', texto: 'Tenemos estas opciones...' }
```

**Contexto al backend:** `GENERAL`

**Sesión localStorage:** `hotclick_chat_hotclick`

---

## Agente 2 — ProductDetailAssistant (Detalle de producto)

**Archivo:** `frontend/src/components/ai/ProductDetailAssistant.jsx`

**Qué hace:** Experto específico en el producto que se está viendo. Sección colapsable debajo de los tabs de especificaciones.

**Conexión con Agente 1:** Comparte la misma sesión de backend (`hotclick_chat_hotclick`). Si el usuario conversó en el homepage, el LLM tiene ese historial y puede referenciar lo que preguntó antes.

**Lo que sabe:** Recibe el producto como prop desde `ProductDetailPage`:

```jsx
<ProductDetailAssistant product={product} />
```

Construye el contexto así:

```
PRODUCTO:Luces Govee Exterior:45000:Tiras LED WiFi para exteriores, re...
```

**Backend — PromptBuilder:** Detecta `ctxType === 'PRODUCTO'`, extrae nombre/precio/descripción y construye un system prompt de experto en ese producto. El LLM responde si se adapta o no a la necesidad del cliente.

**Sesión localStorage:** `hotclick_chat_hotclick` (comparte con Agente 1)

---

## Agente 3 — CartAssistant (Carrito)

**Archivo:** `frontend/src/components/ai/CartAssistant.jsx`

**Qué hace:** Sugiere complementos basándose en el carrito actual **y** en lo que el usuario preguntó antes. Sección colapsable sobre el cross-sell estático.

**Conexión con Agente 1 — el puente más importante:**

```javascript
const mensajesChat   = useChatStore(s => s.mensajes)  // lee del Agente 1

const busquedasPrevias = mensajesChat
  .filter(m => m.rol === 'user')
  .slice(-3)
  .map(m => m.texto)
  .join(', ')
```

Si el usuario preguntó "¿tenés luces Govee para jardín?" pero no las agregó al carrito, el Agente 3 detecta eso y auto-envía:

```
"Tengo en el carrito: Cable HDMI, Parlante Bluetooth.
 También pregunté por: luces Govee para jardín.
 ¿Qué más me recomendás?"
```

**Contexto al backend:** `CARRITO:Cable HDMI, Parlante Bluetooth:78000`

**PromptBuilder:** Detecta `ctxType === 'CARRITO'`, construye un system prompt de advisor de compra complementaria. El LLM sabe exactamente qué hay en el carrito y las búsquedas previas vienen embebidas en el mensaje del usuario.

**Badge "Contexto disponible":** Si `busquedasPrevias` tiene contenido, el header muestra un punto verde. El usuario ve que el agente tiene información de su búsqueda anterior.

**Sesión localStorage:** `hotclick_chat_hotclick-cart` (independiente del homepage)

---

## Agente 4 — CheckoutAssistant (Pago)

**Archivo:** `frontend/src/components/ai/CheckoutAssistant.jsx`

**Qué hace:** Dos modos según el resultado del pago. Se monta embebido en `PaymentStatusPage`.

### Modo `success`

```jsx
<CheckoutAssistant
  tipo="success"
  numeroPedido={pagoData?.numeroPedido}
  metodoPago={pagoData?.metodoPago}
/>
```

Contexto enviado: `PAGO_EXITO:Tarjeta:HC-2024-001`

Si el usuario ya tenía datos registrados (`nombre`, `telefono`, `direccion`), el auto-query los confirma:

```
"Mis datos son: nombre: Juan, teléfono: 8888-1234. ¿Están correctos y qué sigue?"
```

Si no hay datos previos, pregunta dirección y teléfono para coordinar la entrega.

### Modo `failed`

```jsx
<CheckoutAssistant
  tipo="failed"
  numeroPedido={numeroPedido}
  errorCode={error}
/>
```

Contexto: `PAGO_FALLO:card_declined`

La clasificación del error ocurre **en el frontend** — el código técnico nunca se muestra al usuario:

```javascript
function clasificarError(code) {
  const leve = ['card_declined', 'insufficient_funds', 'expired_card', 'incorrect_cvc', ...]
  return leve.some(e => code?.toLowerCase().includes(e)) ? 'leve' : 'sistema'
}
```

| Tipo de error | Comportamiento del agente |
|---|---|
| Leve (tarjeta rechazada, fondos) | Explica brevemente, sugiere reintentar |
| Sistema (error interno, timeout) | Recopila datos de contacto, dice que HOTCLICK llama |

**Sesión localStorage:** `hotclick_chat_hotclick-checkout-{numeroPedido}` (única por pedido)

---

## El backend — cómo recibe el contexto

Todos los agentes usan el mismo endpoint:

```
POST /api/public/shopping-assistant/chat
{
  "empresaSlug": "hotclick",
  "mensaje": "...",
  "sesionId": "...",
  "contexto": "CARRITO:Cable HDMI:78000"
}
```

El campo `contexto` viaja por la cadena:

```
ShoppingAssistantController
  → ShoppingAssistantService.chat(..., contexto)
  → RagPipeline.ejecutar(..., contexto)
  → PromptBuilder.construir(empresaNombre, productos, contexto)
```

Dentro de `PromptBuilder`:

```java
String ctxType = ctx.contains(":") ? ctx.substring(0, ctx.indexOf(':')) : ctx;
switch (ctxType) {
    case "PRODUCTO"   → system prompt de experto de producto específico
    case "CARRITO"    → system prompt de advisor de compras complementarias
    case "PAGO_FALLO" → system prompt de soporte (sin revelar errores técnicos)
    case "PAGO_EXITO" → system prompt de coordinación de entrega
    default           → system prompt de catálogo general
}
```

El modelo es **Claude Haiku** (`claude-haiku-4-5-20251001`) en todos los casos. El pipeline RAG (búsqueda vectorial con Voyage AI en pgvector) corre igual para todos — lo que cambia es el system prompt.

---

## Tabla de conexiones

| | Escribe en chatStore | Lee chatStore | Comparte sesión backend | Key localStorage |
|---|---|---|---|---|
| **Agente 1** (Homepage) | ✅ | — | Con Agente 2 | `hotclick_chat_hotclick` |
| **Agente 2** (Producto) | — | — | Con Agente 1 | `hotclick_chat_hotclick` |
| **Agente 3** (Carrito) | — | ✅ lee Agente 1 | No | `hotclick_chat_hotclick-cart` |
| **Agente 4** (Checkout) | — | — | No | `hotclick_chat_hotclick-checkout-{id}` |

---

## El dato que viaja entre agentes

El traspaso más importante es del **Agente 1 → Agente 3** via `chatStore`:

```
Homepage: "¿tenés luces Govee para jardín?"
               ↓  (chatStore en memoria)
Carrito:  CartAssistant lee esas búsquedas
          y las incluye en su primer mensaje al backend
```

El usuario no necesita explicar de nuevo qué estaba buscando cuando llega al carrito. El agente ya lo sabe.
