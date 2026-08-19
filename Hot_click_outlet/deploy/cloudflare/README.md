# Cloudflare delante de EC2

**Guía principal (empezar acá):** [SETUP.md](./SETUP.md) — paso a paso para activar Cloudflare sin permisos de IT universitario.

Cloudflare mejora reputación del dominio (útil para filtros universitarios), WAF, DDoS protection y TLS en el edge.

## Scripts

| Script | Uso |
|--------|-----|
| [SETUP.md](./SETUP.md) | Guía paso a paso completa |
| [install-origin-cert.sh](./install-origin-cert.sh) | Instalar Origin Certificate en EC2 |
| [verify-cloudflare.sh](./verify-cloudflare.sh) | Verificar header `cf-ray` y DNS proxied |
| [generate-real-ip-conf.sh](./generate-real-ip-conf.sh) | Actualizar IPs de Cloudflare en Nginx |

## Arquitectura

```
Usuario → Cloudflare (443, proxy) → EC2 Nginx (443, Let's Encrypt) → Spring Boot (127.0.0.1:8080)
```

Modo SSL: **Full (strict)** — Cloudflare verifica el certificado origin en el EC2.

## Pasos

### 1. Crear cuenta y agregar zona

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Add site → `hotclick.lat`
2. Plan Free es suficiente para empezar

### 2. Cambiar nameservers

En Spaceship (registrador actual), reemplazar NS por los que Cloudflare asigne, por ejemplo:

```
ada.ns.cloudflare.com
bob.ns.cloudflare.com
```

Propagación DNS: 1–24 horas.

### 3. Registros DNS

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| A | `@` | `18.227.68.15` | Proxied (nube naranja) |
| A | `www` | `18.227.68.15` | Proxied |
| CNAME | `clerk` | (mantener según Clerk dashboard) | DNS only si Clerk lo requiere |

**Importante:** subdominios de Clerk (`clerk.hotclick.lat`) pueden necesitar **DNS only** (gris) según la documentación de Clerk.

### 4. SSL/TLS en Cloudflare

**SSL/TLS → Overview:** Full (strict)

**Opciones:**
- Mantener Let's Encrypt en Nginx (recomendado, ya configurado)
- O instalar Cloudflare Origin Certificate en Nginx (válido 15 años, solo aceptado por Cloudflare)

Origin Certificate (alternativa):

```bash
# En Cloudflare: SSL/TLS → Origin Server → Create Certificate
# Guardar en EC2:
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.pem      # certificado
sudo nano /etc/ssl/cloudflare/origin-key.pem  # clave privada
```

Actualizar `hotclick.conf`:

```nginx
ssl_certificate     /etc/ssl/cloudflare/origin.pem;
ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;
```

### 5. Reglas de edge

**SSL/TLS → Edge Certificates:**
- [x] Always Use HTTPS
- [x] Automatic HTTPS Rewrites
- [x] HSTS (Enable, max-age 31536000, includeSubDomains, preload)

**Rules → Redirect Rules** (si no usa Always Use HTTPS):
- `http://*` → `https://*` (301)

### 6. WAF básico (plan Free)

**Security → WAF → Managed rules:** activar OWASP Core Ruleset si está disponible en el plan.

**Security → Bots:** Bot Fight Mode (Free) o Super Bot Fight Mode (Pro).

### 7. Real IP en Nginx/Spring

Cloudflare envía la IP real en `CF-Connecting-IP`. Opcionalmente en Nginx:

```nginx
# Agregar a location / en hotclick.conf si se necesita IP real detrás de CF
set_real_ip_from 173.245.48.0/20;
# ... (lista completa: https://www.cloudflare.com/ips-v4)
real_ip_header CF-Connecting-IP;
```

Spring ya usa `X-Forwarded-For` vía `server.forward-headers-strategy=FRAMEWORK`.

### 8. Verificación post-migración

```bash
curl -I https://hotclick.lat/api/health
# Debe mostrar cf-ray header (Cloudflare activo)

dig hotclick.lat +short
# Debe resolver a IP de Cloudflare (no 18.227.68.15) cuando proxy está ON
```

### 9. Recategorización

Tras activar Cloudflare, re-enviar solicitudes de recategorización (ver [`docs/security/university-network-block.md`](../../../docs/security/university-network-block.md)).

## Rollback

Si algo falla, en Spaceship revertir NS al registrador original. DNS only (gris) en Cloudflare mientras se depura.
