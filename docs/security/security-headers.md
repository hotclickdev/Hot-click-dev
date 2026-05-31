# HTTP Security Headers

## Implementación

**Archivo:** `config/SecurityConfig.java`  
Todos los headers se aplican a **cada respuesta HTTP** del servidor, implementados en el `SecurityFilterChain`.

---

## Headers implementados

### Strict-Transport-Security (HSTS)

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

| Parámetro | Valor | Propósito |
|---|---|---|
| `max-age` | 31536000 (1 año) | Duración del cache en navegadores |
| `includeSubDomains` | Presente | Aplica también a subdominios |
| `preload` | Ausente | No enviado a la lista de preload HSTS |

**Qué previene:** Downgrade attacks, SSL stripping. Si un atacante intercepta la primera conexión HTTP (before HTTPS), el browser recuerda que debe usar HTTPS siempre para este dominio.

**Consideración:** Render ya fuerza HTTPS. HSTS es una capa adicional a nivel de browser.

---

### X-Frame-Options

```http
X-Frame-Options: DENY
```

**Qué previene:** Clickjacking. Impide que la aplicación sea embebida en un `<iframe>` por otro sitio.

**Por qué DENY y no SAMEORIGIN:** La aplicación no requiere ser embebida en iframes, ni siquiera desde el mismo dominio.

---

### X-Content-Type-Options

```http
X-Content-Type-Options: nosniff
```

**Qué previene:** MIME sniffing. Impide que el navegador interprete un recurso con un MIME type diferente al declarado (ej: JavaScript servido como `text/plain` no se ejecutará).

**Nota:** Complementa la validación de uploads — aunque ya validamos tipos en servidor, este header previene que el browser trate un archivo subido como ejecutable.

---

### Referrer-Policy

```http
Referrer-Policy: strict-origin-when-cross-origin
```

**Comportamiento:**
- Misma origen: envía URL completa en `Referer`
- Cross-origin HTTPS → HTTPS: envía solo el origen (`https://hotclick.cr`)
- Cross-origin HTTPS → HTTP: no envía `Referer`

**Qué previene:** Fuga de URLs privadas o tokens en parámetros de query a terceros (analytics, CDN, etc.).

---

### Permissions-Policy

```http
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Qué hace:** Deshabilita el acceso a APIs de hardware del browser. La aplicación no necesita cámara, micrófono ni geolocalización.

**Qué previene:** Que scripts maliciosos inyectados (XSS) soliciten permisos de hardware al usuario.

---

### Cross-Origin-Opener-Policy (COOP)

```http
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

**Qué hace:** La ventana actual no comparte `window.opener` con ventanas de otros orígenes, pero permite popups (necesario para el flujo de pago de PayPal).

**Qué previene:** XS-Leaks — técnicas donde una página maliciosa extrae información midiendo el comportamiento de ventanas de otras páginas.

**Por qué `same-origin-allow-popups` y no `same-origin`:** PayPal abre popups desde su dominio para el proceso de checkout. `same-origin` rompería ese flujo.

---

### Content-Security-Policy (CSP)

```http
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  font-src 'self' https://fonts.gstatic.com; 
  img-src 'self' data: blob: https://nkevwfcjhjaawtdqquns.supabase.co https://www.paypalobjects.com; 
  connect-src 'self' https://nkevwfcjhjaawtdqquns.supabase.co https://api-m.paypal.com https://api-m.sandbox.paypal.com; 
  frame-src https://www.paypal.com https://www.sandbox.paypal.com; 
  object-src 'none'; 
  base-uri 'self';
```

**Directivas explicadas:**

| Directiva | Valor | Propósito |
|---|---|---|
| `default-src 'self'` | Solo recursos del mismo origen | Default seguro |
| `script-src` | 'self' + PayPal + 'unsafe-inline' + 'unsafe-eval' | React compilado requiere inline/eval |
| `style-src` | 'self' + inline + Google Fonts | CSS de la aplicación + tipografías |
| `font-src` | 'self' + Google Fonts CDN | Fuentes tipográficas |
| `img-src` | 'self' + data: + blob: + Supabase + PayPal | Imágenes de productos + logos PayPal |
| `connect-src` | 'self' + Supabase + PayPal APIs | Llamadas AJAX del frontend |
| `frame-src` | Solo PayPal | Iframes del checkout PayPal |
| `object-src 'none'` | Sin plugins (Flash, PDF embebido) | Deshabilita plugins obsoletos |
| `base-uri 'self'` | Sin `<base>` de otros orígenes | Previene base tag injection |

**Limitaciones conocidas:**

- `'unsafe-inline'` y `'unsafe-eval'` en `script-src` son necesarios para la SPA React construida sin `nonce`. Esto debilita la protección CSP contra XSS.  
  **Mejora futura:** Build configurado con nonces o hash-based CSP para scripts inline.

- `img-src` incluye `data:` y `blob:` para imágenes base64 y URLs de objeto (preview de uploads). Esto es un riesgo residual menor.

---

### Headers adicionales de Spring Security

Spring Security agrega automáticamente:

```http
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Pragma: no-cache
Expires: 0
```

Estos previenen que respuestas con datos sensibles queden en caché del browser o proxies.

---

## Verificación de headers

Para verificar que los headers están activos en producción:

```bash
curl -I https://hotclick.cr/api/health
```

Resultado esperado (líneas relevantes):
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; ...
X-Request-Id: a1b2c3d4e5f6
```

También cubiertos por tests de integración:
```
AuthSecurityHardeningTest:
  ✓ response_hasXContentTypeOptions()
  ✓ response_hasXFrameOptions()
  ✓ response_hasReferrerPolicy()
  ✓ response_hasCSP()
```

---

## Referencia OWASP

Estos headers cubren principalmente **OWASP A05:2021 Security Misconfiguration** y múltiples elementos de la guía de Secure Headers Project:
- [https://securityheaders.com](https://securityheaders.com) — herramienta de análisis
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
