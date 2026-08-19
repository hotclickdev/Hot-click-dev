# Bloqueo en red universitaria — diagnóstico y acciones

## Síntoma

```
Web Page Blocked!
You have tried to access a web page which belongs to a category that is blocked.
```

Este mensaje lo genera el **firewall/proxy de la universidad** (Fortinet, Palo Alto, Cisco Umbrella, etc.), **no** un error de certificado TLS.

## Diagnóstico remoto (2026-08-19)

Verificado desde red externa (no universitaria):

| Check | Resultado |
|-------|-----------|
| `https://hotclick.lat/api/health` | 200 OK |
| Certificado Let's Encrypt | Válido hasta 2026-09-16 |
| Redirect HTTP→HTTPS | 301 correcto |
| Headers HSTS/CSP/X-Frame | Presentes |
| Puerto 8080 público (`18.227.68.15:8080`) | **Expuesto** — corregir (ver [security-group-hardening.md](../../Hot_click_outlet/deploy/ec2/security-group-hardening.md)) |

**Conclusión:** el sitio es seguro y accesible fuera del campus. El bloqueo es filtrado por categoría institucional.

## Acción principal: Cloudflare (sin permisos de IT)

Si no podés solicitar whitelist a la universidad, **activar Cloudflare es la solución recomendada**.

Guía paso a paso: [`Hot_click_outlet/deploy/cloudflare/SETUP.md`](../../Hot_click_outlet/deploy/cloudflare/SETUP.md)

Resumen:
1. Crear cuenta en [Cloudflare](https://dash.cloudflare.com) y agregar `hotclick.lat`
2. Cambiar nameservers en Spaceship a los de Cloudflare
3. DNS: registros A con **proxy ON** (nube naranja)
4. SSL: **Full (strict)** + Origin Certificate en EC2
5. Verificar: `bash Hot_click_outlet/deploy/cloudflare/verify-cloudflare.sh`

El firewall universitario verá tráfico hacia Cloudflare (CDN), no directamente hacia el e-commerce.

---

## Acciones alternativas (si Cloudflare no alcanza)

### Confirmar categoría

- [FortiGuard Web Filter Lookup](https://www.fortiguard.com/webfilter)
- [Cisco Talos Intelligence](https://talosintelligence.com/reputation_center)
- Recategorización Fortinet: [category-submit](https://www.fortiguard.com/faq/wf/category-submit)

### Ticket a IT universitario (opcional)

Copiar y enviar al mesa de ayuda / soporte de redes:

```
Asunto: Solicitud de desbloqueo — hotclick.lat (plataforma e-commerce legítima)

Estimados,

Al intentar acceder a https://hotclick.lat desde la red universitaria recibo el mensaje:
"Web Page Blocked! You have tried to access a web page which belongs to a category that is blocked."

Solicito incluir el siguiente dominio en la whitelist o recategorizar como Business/E-commerce legítimo:

  Dominio:     https://hotclick.lat
  Alternativo: https://www.hotclick.lat
  IP origen:   18.227.68.15 (AWS EC2, us-east-2)
  Propósito:   Plataforma e-commerce propia (proyecto/empresa HOTCLICK Costa Rica)
  Contacto:    hotclick.cr@gmail.com

El sitio usa HTTPS con certificado Let's Encrypt válido y cumple headers de seguridad estándar.
Desde red externa (datos móviles) el acceso funciona correctamente.

Quedo atento a cualquier información adicional que requieran.

Atentamente,
[Tu nombre]
[Carné / departamento]
```

---

## Plantilla: recategorización en vendors de filtros

Enviar en cada portal (tiempo de respuesta típico: 3–14 días):

### Fortinet FortiGuard

- URL: https://www.fortiguard.com/faq/wf/category-submit
- Dominio: `hotclick.lat`
- Categoría solicitada: **Business** o **Shopping** (legitimate e-commerce)
- Descripción: Costa Rican e-commerce platform, HTTPS, legitimate business

### Cisco Talos

- URL: https://talosintelligence.com/reputation_center/support
- Dominio: `hotclick.lat`
- Solicitar revisión de reputación / recategorización

### Palo Alto URL Filtering

- URL: https://urlfiltering.paloaltonetworks.com/
- Submit URL for recategorization

### McAfee / Trellix

- URL: https://trustedsource.org/

### Symantec / Broadcom

- URL: https://sitereview.bluecoat.com/

**Nota:** cada universidad elige qué categorías bloquear. Recategorizar en vendors no garantiza desbloqueo automático en tu campus — el ticket a IT sigue siendo la vía más directa.

---

## Workarounds mientras se resuelve

- Desarrollo/admin desde datos móviles o red doméstica
- SSH al EC2 para operaciones de servidor (`ssh ec2-user@18.227.68.15`)
- Evitar VPN comercial si la política universitaria lo prohíbe

## Mejoras de infraestructura relacionadas

| Recurso | Descripción |
|---------|-------------|
| [deploy/nginx/hotclick.conf](../../Hot_click_outlet/deploy/nginx/hotclick.conf) | Nginx versionado con TLS 1.2+ y HSTS |
| [deploy/cloudflare/SETUP.md](../../Hot_click_outlet/deploy/cloudflare/SETUP.md) | **Cloudflare paso a paso** (solución sin IT) |
| [deploy/ec2/security-group-hardening.md](../../Hot_click_outlet/deploy/ec2/security-group-hardening.md) | Cerrar puerto 8080 |
| [scripts/check-security-headers.sh](../../scripts/check-security-headers.sh) | Verificación automatizada |

## Referencias

- [security-headers.md](./security-headers.md) — headers HTTP en Spring
- [production-hardening.md](./production-hardening.md) — checklist de deploy
