# F29.6 — Cost Governance Report
**Fecha:** 2026-06-02 | **Proyecto:** HOTCLICK SaaS

---

## Inventario de costos variables

### 1. Anthropic Claude API

**Modelo actual:** `claude-haiku-4-5-20251001` (default; configurable por env var)

| Métrica | Valor estimado | Fuente |
|--------|---------------|--------|
| Costo por 1M tokens entrada | ~$0.80 USD | Anthropic pricing (Haiku) |
| Costo por 1M tokens salida | ~$4.00 USD | Anthropic pricing (Haiku) |
| Tokens promedio por chat | ~500 entrada + 150 salida | Estimado por max_tokens=120-300 |

**Controles existentes:**
- ✅ `AiQuotaService` — cuota mensual por empresa (configurable)
- ✅ `hot_click_ai_uso_tb` — tracking tokens_entrada + tokens_salida por empresa/mes
- ✅ `isOffTopic()` en PublicChatService — evita llamadas a Claude por preguntas no relacionadas
- ✅ `AiControlFlag` — kill switch por feature flag para apagar AI por empresa

**Controles faltantes:**
- ❌ Sin alerta cuando empresa consume >80% de su cuota mensual
- ❌ Sin límite global de tokens/día para toda la plataforma
- ❌ Sin dashboard que muestre costo estimado en USD por empresa

**Recomendación:**
```sql
-- Query para costo estimado del mes actual (agregar a ObservabilityController)
SELECT
  e.nombre_empresa,
  SUM(u.tokens_entrada) as tokens_in,
  SUM(u.tokens_salida)  as tokens_out,
  ROUND(SUM(u.tokens_entrada) * 0.0000008 + SUM(u.tokens_salida) * 0.000004, 4) as costo_usd
FROM hot_click_ai_uso_tb u
JOIN hot_click_empresa_tb e ON e.id_empresa = u.fk_id_empresa
WHERE u.anio = EXTRACT(YEAR FROM NOW())
  AND u.mes  = EXTRACT(MONTH FROM NOW())
GROUP BY e.nombre_empresa
ORDER BY costo_usd DESC;
```

---

### 2. Stripe

**Modelo de precios:** Por transacción procesada

| Evento | Costo |
|--------|-------|
| Pago exitoso | 2.9% + $0.30 USD |
| Factura suscripción | 0.5% del importe |
| Webhook delivery | Gratuito |
| Radar (fraud) | $0.05/transacción |

**Controles existentes:**
- ✅ Idempotencia en webhooks — sin cargos duplicados
- ✅ `StripeEvento` — tracking de eventos procesados
- ✅ Modo test vs producción por variable de entorno

**Controles faltantes:**
- ❌ Sin alerta en Stripe Dashboard para picos anómalos de transacciones
- ❌ Sin reporte interno de comisiones pagadas por empresa

**Recomendación:** Configurar `Revenue Recognition` en Stripe Dashboard + webhook `charge.dispute.created` para alertas de chargebacks.

---

### 3. SendGrid / Resend

**Modelo:** Por email enviado

| Trigger | Estimado emails/mes |
|--------|---------------------|
| Confirmación pedido | 1/pedido |
| Guía de envío | 1/pedido enviado |
| Recuperación carrito | 1/carrito abandonado |
| Bienvenida | 1/registro |
| 2FA OTP | Variable |

**Controles existentes:**
- ✅ `NotificacionEmailService` — todos los envíos pasan por un punto central
- ✅ Emails de carrito abandonado condicionados a `app.abandoned-cart.enabled`

**Controles faltantes:**
- ❌ Sin contador de emails enviados por empresa/mes
- ❌ Sin alerta al acercarse al límite del plan

---

### 4. Supabase Storage

**Modelo:** Por GB almacenado + transferencia

| Bucket | Contenido | Estimado |
|--------|---------|---------|
| HOT_CLICK | Imágenes de productos, logos, comprobantes SINPE, certificados P12 | Variable |

**Controles existentes:**
- ✅ Tamaño máximo por archivo (10 MB imágenes, 5 MB certificados)
- ✅ `pg_database_size` en ObservabilityController

**Controles faltantes:**
- ❌ Sin monitoreo de uso total del bucket en el dashboard
- ❌ Sin limpieza automática de imágenes huérfanas (productos eliminados)

**Recomendación:**
```sql
-- Script periódico para detectar imágenes huérfanas (agregar a DataRetentionScheduler)
SELECT DISTINCT imagen_principal_url
FROM hot_click_producto_tb
WHERE imagen_principal_url IS NOT NULL
  AND fk_id_estado = 0; -- productos inactivos con imagen
```

---

### 5. Render (Hosting)

**Modelo:** Por instancia/mes + RAM + CPU

| Recurso | Tier recomendado |
|--------|-----------------|
| Web Service | Starter ($7/mes) o Standard ($25/mes) para multi-pod |
| PostgreSQL | Gestionado por Supabase — no aplica |
| Crons | Incluido en el plan del Web Service |

**Controles existentes:**
- ✅ ShedLock — sin jobs duplicados en multi-pod
- ✅ HikariCP pool a 3 conexiones — respeta límite de Supabase free tier

**Nota:** El plan free de Supabase tiene límite de 500 MB BD y 1 GB Storage. En producción real usar el plan Pro ($25/mes).

---

## Propuesta de métricas para dashboard financiero interno

Agregar a `GET /api/admin/observabilidad`:

```json
{
  "costos": {
    "ai": {
      "tokensMes": 1250000,
      "estimadoUsd": 1.50,
      "empresaConMasConsumo": "Empresa Alpha",
      "alertaUmbral80pct": false
    },
    "storage": {
      "tamanoMb": 245,
      "estimadoUsd": 0.03
    },
    "emailsEnviadosMes": 847,
    "estimadoEmailsUsd": 0.08
  }
}
```

---

## Alertas recomendadas (no implementadas aún)

| Alerta | Condición | Canal |
|--------|----------|-------|
| AI quota 80% | empresa.tokensUsados > plan.quotaTokens * 0.8 | Email EMPRENDEDOR |
| AI costo plataforma | suma USD mes > $50 | Email ADMIN_IT |
| Storage > 400 MB | `pg_database_size` > 400*1024*1024 | Email ADMIN_IT |
| Chargeback Stripe | webhook `charge.dispute.created` | Email ADMIN_IT + Slack |
| 10+ emails fallidos | status 4xx SendGrid en 1h | Email ADMIN_IT |
