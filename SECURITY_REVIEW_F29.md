# F29.4 — Security Hardening Review
**Fecha:** 2026-06-02 | **Proyecto:** HOTCLICK SaaS

---

## JWT

| Control | Estado | Detalles |
|--------|--------|---------|
| Algoritmo | ✅ HS256 | Secreto mínimo 32 chars validado en `@PostConstruct` |
| Expiración | ✅ 15 min | `EXPIRATION_TIME = 900_000L` |
| Temp tokens distintos | ✅ | Claims `2fa_pending` y `empresa_selection` previenen uso como auth completa |
| JTI (JWT ID único) | ❌ | Sin `jti` — no permite invalidación individual de un token |
| Audience (`aud`) | ❌ | Sin `aud` — el token no está ligado al dominio de la app |
| **Riesgo residual** | LOW | Sin JTI no es posible invalidar tokens individuales antes de que expiren. Con TTL de 15 min el riesgo es aceptable. |

## Refresh Tokens

| Control | Estado | Detalles |
|--------|--------|---------|
| TTL | ✅ 30 días | UUID aleatorio, `revokedAt` nullable |
| Rotación | ✅ | Al crear uno nuevo, todos los anteriores son revocados |
| Limpieza | ✅ | Scheduler a las 3:15 AM (`@SchedulerLock`) |
| Replay detection | ✅ parcial | Revocación total previene replay de tokens robados de sesiones anteriores |
| IP binding | ❌ | No ligado a IP de origen — token robado funciona desde otra IP |
| User-Agent binding | ❌ | No ligado al navegador/dispositivo |
| **Riesgo residual** | MEDIUM | Sin IP/UA binding, un token robado funciona hasta expirar (30 días). Mitigación: TTL corto de access token (15 min) limita la ventana de ataque. |

## Stripe Webhooks

| Control | Estado | Detalles |
|--------|--------|---------|
| Firma validada | ✅ | `Webhook.constructEvent()` del SDK oficial |
| STRIPE_WEBHOOK_SECRET requerido | ✅ | Falla en startup si no está configurado |
| Idempotencia | ✅ | Tabla `hot_click_stripe_evento_tb` por `eventId` |
| Rate limiting | ❌ | `/api/webhooks/stripe` es `permitAll` sin límite de llamadas |
| **Riesgo residual** | LOW | La firma valida que viene de Stripe. Rate limiting adicional sería defensa en profundidad. |

## Actuator

| Control | Estado |
|--------|--------|
| `spring-boot-starter-actuator` | ❌ no instalado (intencional) |
| Si se instala: restricción ADMIN_IT | ✅ ya en SecurityConfig |
| **Evaluación** | ✅ Correcto — sin actuator, sin superficie de ataque |

## CORS

| Control | Estado | Detalles |
|--------|--------|---------|
| Orígenes por variable de entorno | ✅ | `cors.allowed.origins` — no hardcoded |
| Credenciales | ✅ false | No envía cookies cross-origin |
| MaxAge | ⚠️ default | Spring default = 30 min (preflight cached). Reducir a 300s para más control. |
| Headers: `Authorization: *` | ⚠️ | `setAllowedHeaders(List.of("*"))` — permite cualquier header custom. Restringir a los headers necesarios. |

## Headers de seguridad

| Header | Valor | Estado |
|--------|-------|--------|
| HSTS | max-age=31536000; includeSubDomains | ✅ |
| X-Content-Type-Options | nosniff | ✅ |
| X-Frame-Options | SAMEORIGIN | ✅ |
| Referrer-Policy | strict-origin-when-cross-origin | ✅ |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | ✅ |
| Cross-Origin-Opener-Policy | same-origin-allow-popups | ✅ |
| CSP | Configurado (ver detalle) | ⚠️ |
| `frame-ancestors` en CSP | ❌ no explícito | Usar `frame-ancestors 'self'` en CSP para reforzar `X-Frame-Options` |

## CSP detallado

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com
```

⚠️ **`unsafe-inline` + `unsafe-eval`** neutralizan la protección XSS del CSP.
- `unsafe-inline`: requerido por React (inline event handlers, inline styles)
- `unsafe-eval`: requerido por PayPal SDK y algunas librerías de mapas/charts

**Mitigación a largo plazo:**
1. Migrar React a modo CSP strict (`nonce`-based o `hash`-based) con Vite plugin
2. Cargar PayPal SDK con `defer` y eliminar `unsafe-eval`
3. Agregar `frame-ancestors 'self'` para clickjacking defense en profundidad

## Storage (Supabase)

| Control | Estado | Detalles |
|--------|--------|---------|
| Validación de extensión | ✅ | Allowlist estricta: jpg/png/webp/gif/avif/.p12 |
| Magic bytes validation | ✅ | FF D8 FF (JPEG), 89 50 4E 47 (PNG), etc. |
| Tamaño máximo | ✅ | 10 MB imágenes, 5 MB certificados P12 |
| MIME type check | ✅ | Rechaza tipos no-imagen excepto `application/octet-stream` (iOS Safari) |
| Path traversal | ✅ | UUID en el path — no usa el nombre original del archivo |
| Certificados P12 privados | ✅ | Path sin URL pública — solo guardado en BD |
| SSL validation | ✅ | Nunca deshabilitado |

## Tenant Context

| Control | Estado | Detalles |
|--------|--------|---------|
| JWT claim `empresaId` | ✅ | Propagado en token y TenantFilter |
| CompanyScope | ✅ | `assertCanAccess()` en endpoints con {id} |
| CrmController | ✅ F29 | Corregido en F29 — filtra por empresa en listar/buscar/detalle/actualizar/ajustarPuntos |
| GastoController | ✅ F29 | actualizar/eliminar con tenant check |
| PedidoRepository | ✅ F29 | `existsByUsuarioFinalIdAndEmpresaId` para validación CRM |

## Recomendaciones restantes (deuda técnica)

1. **JWT `jti`**: Agregar UUID único por token para permitir invalidación granular (logout de un solo dispositivo)
2. **Refresh token IP binding**: Guardar IP en `RefreshToken.createdFromIp`, alertar si se usa desde otra IP
3. **CORS maxAge**: Reducir a `config.setMaxAge(300L)` — solo impacta rendimiento de preflights
4. **CSP strict**: Sprint dedicado para eliminar `unsafe-inline` con nonce-based CSP
5. **Stripe rate limiting**: Agregar `IP rate limiting` a `/api/webhooks/stripe` (actualmente `permitAll`)
