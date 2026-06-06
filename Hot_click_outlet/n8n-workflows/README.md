# n8n Workflows — HOTCLICK

4 workflows listos para importar en n8n Cloud (plan Free).

---

## Paso 1 — Crear cuenta n8n Cloud

1. Ir a [https://app.n8n.cloud](https://app.n8n.cloud) → Sign up gratis
2. Creás tu instancia (nombre cualquiera, ej: `hotclick`)

---

## Paso 2 — Configurar credenciales (hacerlo UNA vez)

### Telegram Bot (para alertas admin)

1. En Telegram, buscá `@BotFather` → `/newbot` → copiá el **token**
2. Enviá cualquier mensaje a tu bot nuevo
3. Abrí: `https://api.telegram.org/bot<TOKEN>/getUpdates` → copiá el `"id"` dentro de `"chat"` — ese es tu **Chat ID**
4. En n8n → **Credentials** → New → **Telegram** → pegá el token → nombre: `Telegram Bot HOTCLICK`
5. En n8n → **Variables de entorno** (Settings → Variables):
   - `TELEGRAM_ADMIN_CHAT_ID` = el Chat ID del paso 3

### Gmail (para emails a clientes)

1. En n8n → **Credentials** → New → **Gmail OAuth2**
2. Seguís el flujo OAuth con la cuenta `hotclick.cr@gmail.com`
3. Nombrás la credencial: `Gmail HOTCLICK`

### Variable APP_URL

En n8n → Settings → Variables → `APP_URL` = `https://hotclick.cr`

---

## Paso 3 — Importar los workflows

Para cada archivo JSON en esta carpeta:

1. n8n → **Workflows** → **Import from file**
2. Seleccionás el archivo `.json`
3. Verificás que las credenciales queden asignadas correctamente
4. Activás el workflow con el toggle

Orden recomendado:
1. `01-pedido-nuevo.json`
2. `02-carrito-abandonado.json`
3. `03-usuario-registrado.json`
4. `04-pedido-entregado.json`

---

## Paso 4 — Copiar las URLs de los webhooks

Cada workflow tiene un nodo **Webhook**. Al abrirlo, n8n muestra la URL de producción:

```
https://<tu-instancia>.app.n8n.cloud/webhook/pedido-nuevo
https://<tu-instancia>.app.n8n.cloud/webhook/carrito-abandonado
https://<tu-instancia>.app.n8n.cloud/webhook/usuario-registrado
https://<tu-instancia>.app.n8n.cloud/webhook/pedido-entregado
```

---

## Paso 5 — Agregar variables de entorno en producción

Agregá estas variables donde corre tu backend Java (Railway / Render):

```
N8N_WEBHOOK_PEDIDO_NUEVO=https://<instancia>.app.n8n.cloud/webhook/pedido-nuevo
N8N_WEBHOOK_PEDIDO_ENTREGADO=https://<instancia>.app.n8n.cloud/webhook/pedido-entregado
N8N_WEBHOOK_CARRITO_ABANDONADO=https://<instancia>.app.n8n.cloud/webhook/carrito-abandonado
N8N_WEBHOOK_USUARIO_REGISTRADO=https://<instancia>.app.n8n.cloud/webhook/usuario-registrado
```

Si una variable queda vacía, ese webhook simplemente no se dispara — no rompe nada.

---

## Resumen de workflows

| Archivo | Trigger | Acción |
|---------|---------|--------|
| `01-pedido-nuevo.json` | Pago confirmado (Stripe/SINPE/GiftCard/Manual) | Telegram + Gmail al admin |
| `02-carrito-abandonado.json` | Carrito sin comprar por 1+ hora | Email al cliente (si tiene email) / Telegram admin (si no tiene email) |
| `03-usuario-registrado.json` | Nuevo usuario registrado | Telegram al admin para seguimiento personal |
| `04-pedido-entregado.json` | Pedido marcado como ENTREGADO | Espera 7 días → email de follow-up al cliente |

---

## Consumo estimado de ejecuciones (plan Free: 2500/mes)

| Workflow | Frecuencia estimada | Ejecuciones/mes |
|----------|--------------------:|----------------:|
| Pedido nuevo | ~30 ventas/mes | 30 |
| Carrito abandonado | ~50 carritos/mes | 50 |
| Usuario registrado | ~20 registros/mes | 20 |
| Pedido entregado | ~25 entregados/mes | 25 |
| **Total** | | **~125** |

Usás ~5% del plan Free. Sobra margen para crecer 20x antes de pagar.
