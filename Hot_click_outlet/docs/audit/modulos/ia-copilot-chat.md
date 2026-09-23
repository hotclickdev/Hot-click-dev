# Auditoría estática READ-ONLY — módulo IA / Copilot / Chat

**Scope:** `C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet` (+ `security-tools/guardrails` referenciado). Sin cambios.

---

## 1. Canales IA

| Canal | Entrada | Modelo | Auth | Cuota llamadas |
|--------|---------|--------|------|----------------|
| **Copilot admin/PYME** | `POST /api/admin/ai/chat` (SSE) | Claude (`anthropic.*`) | JWT `EMPRENDEDOR`/`ADMIN` + tenant | Sí (`verificarYReservar`) |
| **Copilot Telegram** | texto libre → `chatSyncConAcciones` | Claude + tools | chat vinculado | Sí |
| **Chat público tienda** | `POST /api/public/chat` (SSE) | Claude | `permitAll` | No (solo rate limit) |
| **Shopping assistant RAG** | `POST /api/public/shopping-assistant/chat` | Claude + Voyage embeddings | `permitAll` | No de llamadas; solo `actualizarTokens` |
| **Otros Claude** | descripciones, incidentes, memoria cliente, catálogo | Claude | según endpoint | varía |

Proveedor productivo: **Anthropic**. NVIDIA no aparece inyectado en Java (`@Value("${nvidia...}")` = 0 usos).

```25:31:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\AiCopilotService.java
/**
 * AI Copilot — Claude (Anthropic) en todos los canales:
 *   - chatStream (panel admin / resumen ejecutivo, SSE)
 *   - chatSync / crossSellCliente (bot de Telegram)
 *
 * NVIDIA NIM queda fuera de este flujo (el tier gratis falló en uso real).
 * TextModerationService sigue filtrando el mensaje en el controller.
 */
```

---

## 2. Tool calling (Copilot)

- Definición: `AiCopilotToolDefinitions` / ejecución: `AiCopilotToolExecutor` + `AiCopilotMutationTools`.
- Loop: máx. **4 rondas**, budget **40 s**, `max_tokens` 1024.

**Consulta (panel + Telegram):**  
`consultar_inventario`, `consultar_ventas`, `recomendaciones`, `reporte_negocio`, `comparar_catalogo_publico`, `proyeccion_negocio`, `perfil_marca`, `consultar_clientes`, y `consultar_finanzas` si feature `reportes`.

**Mutación (solo Telegram + `puedeGestionar`):**  
`proponer_cambiar_estado_pedido`, `proponer_asignar_guia`, `proponer_ajustar_stock`, `proponer_aplicar_oferta` — **proponen**, no ejecutan; confirmación por botón.

```108:110:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\AiCopilotService.java
            // Panel web: sin tools de mutación (no hay botones de confirmar como en Telegram).
            AiCopilotClaudeClient.ResultadoLoopClaude loop =
                syncChatService.completarConClaude(empresaId, empresa, userMessage, null, false);
```

Queries de tools filtran por `fk_id_empresa`. Chat público / shopping assistant **no** usan este tool loop (prompts + búsqueda / RAG).

---

## 3. Seguridad

| Control | Dónde | Notas |
|---------|-------|--------|
| **TextModerationService** | `AiCopilotController`, `PublicChatController`; alta producto Telegram | Blocklist + leet/normalización; **no** jailbreak/injection |
| **Telegram free-text → IA** | `TelegramMessageHandler` → IA | Rate limit + vínculo; **sin** `TextModeration` en el path de chat |
| **Shopping assistant** | `QueryClassifier` + sanitizer | Bloqueo off-topic/injection; **sin** TextModeration |
| **Tenant** | `TenantContext` / slug → empresa ACTIVA | Shopping: 404 antes de embed |
| **Mutaciones** | propose → confirm | Buen patrón |
| **NeMo Guardrails** | Sidecar Compose | Diseñado para NVIDIA; **app Java ya no llama NIM** → sidecar fuera del path real |

```57:60:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\controller\AiCopilotController.java
        var textMod = textModerationService.moderar(message);
        if (!textMod.safe()) {
            return errorEmitter(emitter, "Mensaje rechazado: contenido no permitido en la plataforma");
        }
```

`SecurityAuthorizationRules`: public chat / shopping-assistant `permitAll`; `/api/admin/ai/**` autenticado.

---

## 4. Rate limits

| Capa | Límite |
|------|--------|
| IP (`RateLimitingFilter`) | public chat 10/60s; shopping chat 10/60s; image 5/60s; admin AI chat 20/60s |
| Empresa burst (copilot) | 10 / 5 min |
| Public chat día/empresa | 300 / 24 h |
| Telegram chat | 20/min + 300/día |
| Fail-open | Si falla BD del limiter, el request pasa |

```46:50:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\security\RateLimitingFilter.java
 *   AI (IP-level; per-empresa burst in AiCopilotController)
 *   ────────────────────────────────────────────
 *   /api/public/chat                      → 10 / 60s
 *   /api/public/shopping-assistant/chat   → 10 / 60s
 *   /api/admin/ai/chat                    → 20 / 60s
```

---

## 5. Créditos AI emprendedor + AdminAiControl

**Cuota (`AiQuotaService`):**
1. Reserva atómica **antes** de Claude (`verificarYReservar`).
2. Tokens después (`actualizarTokens`).
3. Límite: `Plan.maxCreditosAi` (`ADMIN` → ilimitado).
4. Plan **EMPRENDEDOR**: V91 → **10**/mes; cortable con flag `copilot_emprendedor` → límite 0.
5. PYME **80**; NEGOCIO_PLUS **-1**.

```135:141:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\AiQuotaService.java
            // EMPRENDEDOR es plan gratuito — su acceso al Copilot es temporal y vive
            // detrás del flag 'copilot_emprendedor' (activo por defecto, V47) para poder
            // cortarlo sin deploy cuando se decida reservar la IA solo para planes pagos.
            if (limite != 0 && "EMPRENDEDOR".equals(plan.getNombre())
                    && !featureFlagService.isEnabled("copilot_emprendedor", empresa.getId())) {
                return 0;
            }
```

**Inconsistencia seed:** `DataSeeder` sigue sembrando EMPRENDEDOR con `maxCreditosAi = 0` (puede pisar V91 en entornos que re-seedan).

**AdminAiControl:** UI → `GET /api/security/ai/dashboard` (`AiControlController`, solo `ADMIN`): uso/tokens, costo estimado Haiku ($0.80/$4 por M), flags `chat_publico` / `copilot_emprendedor` / `ai_copilot`, alertas ≥80% / agotado.

---

## 6. Shopping assistant + RAG / embeddings

- Pipeline: embed query → pgvector top-K → prompt XML → Claude no-streaming (`RagPipeline`).
- Embeddings activos: **Voyage** `voyage-3-lite` 512-d (`VoyageEmbeddingService`).
- **GeminiEmbeddingService**: `@Service` comentado — código muerto/referencia post-V64.
- Fallback keyword si Voyage falla.
- **Hueco de billing:** explícito — no `verificarYReservar`; tokens solo analytics; el costo Anthropic/Voyage no se topea por plan.

```36:38:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\shoppingassistant\ShoppingAssistantService.java
 * No se verifica cuota antes de llamar a Claude (endpoint público, la degradación
 * graceful del Circuit Breaker es suficiente protección). Sí se registran los tokens
 * consumidos vía {@link AiQuotaService#actualizarTokens} para billing y analytics.
```

`PublicChatService` tampoco toca `AiQuotaService`.

---

## 7. Anthropic vs NVIDIA / guardrails / código muerto

| Pieza | Estado |
|-------|--------|
| `anthropic.api-key` / `anthropic.model` | Path real de copilot, chat, RAG, etc. |
| `nvidia.api-key` / `base-url` / `model` en `application.properties` | Props sin consumidores Java |
| Sidecar `hotclick-guardrails` en `docker-compose.prod.yml` | Sigue en Compose; app no lo usa |
| README guardrails (“AiCopilotService arma URL nvidia…”) | **Desactualizado** vs código actual |
| `security-tools/deepteam` | Red-team offline vs NVIDIA |
| `GeminiEmbeddingService` | Bean desactivado |
| Lightsail compose | Sin guardrails (comentario: copilot ya no lo usa) |

```256:264:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\resources\application.properties
# AI COPILOT — Claude (Anthropic). Misma key que el chat de tienda.
# NVIDIA NIM queda para guardrails/deepteam (testing), no para el panel.
nvidia.api-key=${NVIDIA_API_KEY:}
nvidia.model=${NVIDIA_MODEL:meta/llama-3.3-70b-instruct}
# Sidecar NeMo Guardrails (opcional, red-team). El copilot de admin ya no
# llama a NVIDIA. Ver security-tools/guardrails/README.md.
nvidia.base-url=${NVIDIA_BASE_URL:https://integrate.api.nvidia.com/v1/}
```

---

## 8. Riesgos de costo (prioridad)

1. **Alto — endpoints públicos sin cuota de llamadas** (`/api/public/chat`, shopping-assistant): Anthropic (+ Voyage) acotados solo por IP / día-empresa; abuso multi-IP = factura abierta.  
2. **Medio — `actualizarTokens` sin fila previa:** shopping puede no persistir tokens si nunca hubo `reservarSlot`/`upsert` de llamadas.  
3. **Medio — reserva de cuota sin refund:** fallo Claude tras `verificarYReservar` igual consume crédito.  
4. **Medio — sidecar guardrails en prod:** RAM en t3.small sin beneficio de seguridad en el path Claude.  
5. **Bajo — Telegram sin TextModeration** en free-text IA (sí en alta de producto).  
6. **Bajo — DataSeeder EMPRENDEDOR=0** vs V91=10.  
7. **Observabilidad:** AdminAiControl estima costo solo de tokens registrados; uso público mal contabilizado → dashboard subestima.

---

## 9. Mapa rápido de archivos clave

- Controllers: `AiCopilotController`, `PublicChatController`, `ShoppingAssistantController`, `AiControlController`  
- Orquestación: `AiCopilotService`, `AiCopilotSyncChatService`, `PublicChatService`, `ShoppingAssistantService`, `RagPipeline`  
- Tools: `AiCopilotToolDefinitions`, `AiCopilotToolExecutor`, `AiCopilotMutationTools`  
- Cuota: `AiQuotaService`, migración `V91__emprendedor_ai_credits.sql`  
- Moderación: `TextModerationService`  
- Telegram IA: `TelegramBotUpdateService.responderConIa`, `TelegramRateLimitService`  
- UI admin: `frontend/src/pages/admin/AdminAiControl.tsx`