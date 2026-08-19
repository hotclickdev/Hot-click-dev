# HTTP Security Headers

## Implementación

| Capa | Archivo | Rol |
|------|---------|-----|
| Spring Security | `Hot_click_outlet/src/main/java/com/hotclick/security/config/SecurityConfig.java` | HSTS, X-Frame-Options, X-Content-Type-Options |
| HeaderWriter | `Hot_click_outlet/src/main/java/com/hotclick/security/config/SecurityHeadersWriter.java` | CSP, Referrer-Policy, Permissions-Policy, COOP |
| Nginx (edge) | `Hot_click_outlet/deploy/nginx/hotclick.conf` | HSTS + X-Content-Type-Options en el proxy |

Todos los headers de Spring se aplican a **cada respuesta HTTP**. Nginx refuerza HSTS en el edge antes del proxy a Spring Boot.

---

## Headers implementados

### Strict-Transport-Security (HSTS)

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

| Parámetro | Valor | Propósito |
|---|---|---|
| `max-age` | 31536000 (1 año) | Duración del cache en navegadores |
| `includeSubDomains` | Presente | Aplica también a subdominios |
| `preload` | Presente | Elegible para lista preload de navegadores |

**Qué previene:** Downgrade attacks, SSL stripping.

**Consideración:** HSTS solo protege después de la primera visita HTTPS válida. Nginx y Spring envían el mismo header.

---

### X-Frame-Options

```http
X-Frame-Options: SAMEORIGIN
```

**Qué previene:** Clickjacking. Impide que la aplicación sea embebida en un `<iframe>` de otro origen.

**Por qué SAMEORIGIN y no DENY:** Algunos flujos internos (admin, previews) pueden requerir iframes del mismo dominio. `frame-ancestors 'self'` en CSP refuerza la misma política.

---

### X-Content-Type-Options

```http
X-Content-Type-Options: nosniff
```

**Qué previene:** MIME sniffing.

**Nota:** También enviado por Nginx en el edge (`deploy/nginx/hotclick.conf`).

---

### Referrer-Policy

```http
Referrer-Policy: strict-origin-when-cross-origin
```

**Comportamiento:**
- Misma origen: envía URL completa en `Referer`
- Cross-origin HTTPS → HTTPS: envía solo el origen (`https://hotclick.lat`)
- Cross-origin HTTPS → HTTP: no envía `Referer`

---

### Permissions-Policy

```http
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Deshabilita APIs de hardware no usadas por la aplicación.

---

### Cross-Origin-Opener-Policy (COOP)

```http
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

Permite popups de pasarelas de pago (Stripe, Clerk) sin compartir `window.opener` con orígenes maliciosos.

---

### Content-Security-Policy (CSP)

Definida en `SecurityHeadersWriter.java`. Allowlist actual (resumen):

| Directiva | Orígenes permitidos |
|---|---|
| `default-src` | `'self'` |
| `script-src` / `script-src-elem` | `'self'`, Stripe, Clerk, GTM, GA, PostHog |
| `style-src` | `'self'`, `'unsafe-inline'`, Google Fonts |
| `font-src` | `'self'`, fonts.gstatic.com |
| `img-src` | `'self'`, data:, blob:, S3, Clerk, Unsplash, etc. |
| `connect-src` | `'self'`, S3, Clerk, Stripe, GA, PostHog, Sentry |
| `frame-src` | Stripe, YouTube, TikTok, Instagram, Clerk |
| `frame-ancestors` | `'self'` |
| `object-src` | `'none'` |
| `base-uri` | `'self'` |

**Limitaciones conocidas:**

- `'unsafe-inline'` en estilos es necesario para la SPA React.
- `img-src` incluye `data:` y `blob:` para previews de uploads.

---

### Headers adicionales de Spring Security

```http
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Pragma: no-cache
Expires: 0
```

---

## Verificación de headers

Script automatizado:

```bash
bash scripts/check-security-headers.sh
bash scripts/check-security-headers.sh https://hotclick.lat/api/health
```

Manual:

```bash
curl -I https://hotclick.lat/api/health
curl -I http://hotclick.lat/api/health   # debe redirigir 301 → HTTPS
```

Resultado esperado (líneas relevantes):

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; ...
```

Scanners externos:
- [securityheaders.com](https://securityheaders.com/?q=https://hotclick.lat)
- [SSL Labs](https://www.ssllabs.com/ssltest/analyze.html?d=hotclick.lat)

Tests de integración:

```
AuthSecurityHardeningTest:
  ✓ response_hasXContentTypeOptions()
  ✓ response_hasXFrameOptions()
  ✓ response_hasReferrerPolicy()
  ✓ response_hasCSP()
```

---

## Referencia OWASP

Estos headers cubren **OWASP A05:2021 Security Misconfiguration**:

- [Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [securityheaders.com](https://securityheaders.com)

## Documentación relacionada

- [university-network-block.md](./university-network-block.md) — bloqueo en redes institucionales
- [Hot_click_outlet/deploy/README.md](../../Hot_click_outlet/deploy/README.md) — Nginx y hardening EC2
