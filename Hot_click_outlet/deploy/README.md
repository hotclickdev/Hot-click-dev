# Deploy — EC2 producción (hotclick.lat)

Artefactos versionados para Nginx, hardening y Cloudflare.

## Estructura

```
deploy/
├── nginx/
│   ├── hotclick.conf      # Reverse proxy HTTPS → localhost:8080
│   └── ssl-params.conf    # TLS 1.2+, OCSP stapling
├── ec2/
│   ├── apply-nginx.sh              # Copia config y recarga nginx
│   ├── verify-certbot.sh           # Dry-run renovación + días restantes
│   └── security-group-hardening.md # Cerrar puerto 8080 en AWS SG
└── cloudflare/
    └── README.md                   # Cloudflare Full Strict delante de EC2
```

## Aplicar en EC2 (post git pull)

```bash
cd /home/ec2-user/app
git pull origin master

# 1. Nginx
sudo bash Hot_click_outlet/deploy/ec2/apply-nginx.sh

# 2. Certbot
sudo bash Hot_click_outlet/deploy/ec2/verify-certbot.sh

# 3. Docker — bind localhost (ver docker-compose.prod.yml)
cd Hot_click_outlet
docker-compose -f docker-compose.prod.yml up -d

# 4. Security group — manual en AWS Console (ver security-group-hardening.md)
```

## Verificación local/remota

```bash
bash scripts/check-security-headers.sh
bash scripts/check-security-headers.sh https://hotclick.lat/api/health
```

Scanners externos:
- https://www.ssllabs.com/ssltest/analyze.html?d=hotclick.lat
- https://securityheaders.com/?q=https://hotclick.lat

## Bloqueo en red universitaria

Ver [docs/security/university-network-block.md](../../docs/security/university-network-block.md).
