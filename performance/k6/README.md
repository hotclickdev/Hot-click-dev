# HOTCLICK — k6 Load Test Scripts

## Prerequisitos

```bash
# Instalar k6
winget install k6 --source winget

# Configurar variables
export BASE_URL=https://hotclick-app.onrender.com
export JWT_EMPRENDEDOR=<token_de_emprendedor>
export JWT_ADMIN=<token_de_admin>
```

## Scripts disponibles

| Script | Escenario | VUs | Duración |
|--------|-----------|-----|----------|
| `checkout-concurrente.js` | Checkout simultáneo con stock real | 10–50 | 2 min |
| `pos-concurrente.js` | POS con múltiples cajas abiertas | 5–20 | 3 min |
| `sse-concurrente.js` | Conexiones SSE paralelas (AI chat) | 5–15 | 2 min |
| `billing-concurrente.js` | Suscripciones Stripe concurrentes | 5 | 1 min |

## Umbrales de aceptación (SLO)

- p(95) latencia HTTP < 500ms
- p(99) latencia HTTP < 2000ms
- Tasa de errores < 1%
- Sin 500s en checkout o POS

## IMPORTANTE

⚠️ Ejecutar SOLO contra entorno de staging, NUNCA contra producción.
⚠️ Usar credenciales de prueba (Stripe test mode, Hacienda STAG).
⚠️ Verificar que el DB de staging aguante la carga antes de escalar VUs.
