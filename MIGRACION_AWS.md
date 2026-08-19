# Guía de Migración Completa: → AWS (sin Supabase, sin Railway)

**Proyecto:** HotClick Outlet — Spring Boot 3.4.4 / Java 21 / React  
**Fecha:** 2026-06-17  

## Arquitectura destino (100% AWS)

```
Internet
   │
   ▼
EC2 t2.micro  (Amazon Linux 2023 + Docker)
   │   puerto 8080 → Spring Boot JAR
   ├──────────────────────────────────────┐
   ▼                                      ▼
RDS db.t3.micro                     S3 Bucket "hotclick-media"
(PostgreSQL 15 + pgvector)          (imágenes, logos, certificados)
```

**Créditos AWS:** $200 USD + free tier 12 meses (~20 meses sin costo significativo)

---

## CAMBIOS DE CÓDIGO YA APLICADOS

Los siguientes archivos fueron modificados en el repositorio:

| Archivo | Cambio |
|---------|--------|
| `pom.xml` | Agregado `software.amazon.awssdk:s3:2.25.60` |
| `config/S3Config.java` | Nuevo bean `S3Client` con `DefaultCredentialsProvider` |
| `service/SupabaseStorageService.java` | Reescrito: usa S3 SDK en lugar de HTTP a Supabase |
| `controller/ImageProxyController.java` | Actualizado: fetch desde S3 público, compat. legacy URLs |
| `config/SecurityConfig.java` | CSP actualizado: `*.supabase.co` → `*.amazonaws.com` |
| `application.properties` | `supabase.*` → `aws.s3.*`; circuit breaker `supabase` → `s3` |

---

## ÍNDICE DE PASOS

1. [Pre-requisitos en tu máquina](#paso-1-pre-requisitos)
2. [Crear bucket S3](#paso-2-bucket-s3)
3. [Crear IAM Role para EC2](#paso-3-iam-role)
4. [Crear RDS PostgreSQL 15](#paso-4-rds-postgresql)
5. [Exportar BD desde Supabase e importar en RDS](#paso-5-migrar-base-de-datos)
6. [Migrar imágenes de Supabase Storage a S3](#paso-6-migrar-imágenes-a-s3)
7. [Actualizar URLs de imágenes en la BD](#paso-7-actualizar-urls-en-bd)
8. [Crear instancia EC2](#paso-8-crear-ec2)
9. [Configurar Docker y desplegar](#paso-9-deploy)
10. [Apuntar dominio y configurar HTTPS](#paso-10-dominio-y-https)
11. [Checklist final](#paso-11-checklist)

---

## PASO 1: Pre-requisitos

Instalá en tu máquina local:

```bash
# PostgreSQL 15 client
# Windows: https://www.postgresql.org/download/windows/ (solo client tools)
pg_dump --version   # debe ser 15.x

# AWS CLI v2
# https://aws.amazon.com/cli/
aws --version

# Python 3 + boto3 (para el script de migración de imágenes)
pip install boto3 requests
```

Configurá AWS CLI:
```bash
aws configure
# AWS Access Key ID:     [key de tu usuario IAM con permisos de admin]
# AWS Secret Access Key: [secret]
# Default region name:   us-east-1
# Default output format: json
```

---

## PASO 2: Bucket S3

### 2.1 Crear el bucket

```bash
aws s3api create-bucket \
  --bucket hotclick-media \
  --region us-east-1
```

### 2.2 Deshabilitar bloqueo de acceso público (para imágenes públicas)

```bash
aws s3api put-public-access-block \
  --bucket hotclick-media \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### 2.3 Aplicar política de bucket (lectura pública para imágenes, privado para certificados)

```bash
aws s3api put-bucket-policy \
  --bucket hotclick-media \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadImages",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": [
          "arn:aws:s3:::hotclick-media/productos/*",
          "arn:aws:s3:::hotclick-media/marcas/*",
          "arn:aws:s3:::hotclick-media/logos/*",
          "arn:aws:s3:::hotclick-media/testimonios/*",
          "arn:aws:s3:::hotclick-media/solicitudes/*",
          "arn:aws:s3:::hotclick-media/sinpe/*"
        ]
      }
    ]
  }'
```

> Los certificados en `certificados/*` quedan privados — solo EC2 puede leerlos.

### 2.4 Habilitar CORS (para uploads desde el frontend)

```bash
aws s3api put-bucket-cors \
  --bucket hotclick-media \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://hotclick.lat", "http://localhost:3000"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

---

## PASO 3: IAM Role para EC2

En lugar de poner credenciales AWS en el `.env`, el EC2 usará un **Instance Profile** (rol IAM). El SDK detecta las credenciales automáticamente — sin `AWS_ACCESS_KEY_ID` en el código.

### 3.1 Crear el rol

En la consola AWS → IAM → Roles → Create role:

| Campo | Valor |
|-------|-------|
| Trusted entity | AWS service → EC2 |
| Role name | `hotclick-ec2-role` |

### 3.2 Adjuntar política para S3

Crear política inline (IAM → Roles → `hotclick-ec2-role` → Add permissions → Create inline policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::hotclick-media/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::hotclick-media"
    }
  ]
}
```

Nombre de la política: `HotclickS3Access`

---

## PASO 4: RDS PostgreSQL

### 4.1 Security Groups

**`hotclick-ec2-sg`** (para el EC2):

| Tipo | Puerto | Origen |
|------|--------|--------|
| SSH | 22 | Tu IP |
| Custom TCP | 8080 | 0.0.0.0/0 |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

**`hotclick-rds-sg`** (para RDS):

| Tipo | Puerto | Origen |
|------|--------|--------|
| PostgreSQL | 5432 | `hotclick-ec2-sg` |
| PostgreSQL | 5432 | Tu IP (temporal para importar) |

### 4.2 Crear la instancia RDS

Consola AWS → RDS → Create database:

| Campo | Valor |
|-------|-------|
| Engine | PostgreSQL 15.x |
| Template | **Free tier** |
| DB identifier | `hotclick-db` |
| Master username | `hotclick_admin` |
| Master password | [genera seguro, anótalo] |
| Instance class | `db.t3.micro` |
| Storage | 20 GB gp2 |
| Multi-AZ | No |
| Public access | **Yes** (temporal para importar, luego lo desactivás) |
| VPC security group | `hotclick-rds-sg` |
| Database name | `hotclick` |
| Backup retention | 7 days |
| Enhanced monitoring | **Disabled** |

### 4.3 Habilitar pgvector (antes de importar)

```bash
# Conectate con psql o DBeaver:
psql -h [RDS_ENDPOINT] -U hotclick_admin -d hotclick

# Dentro de psql:
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extname FROM pg_extension WHERE extname = 'vector';
# Debe devolver: vector
\q
```

---

## PASO 5: Migrar Base de Datos

### 5.1 Obtener la URL directa de Supabase

En tu dashboard de Supabase → Settings → Database → **Connection string** (Direct, no Pooler):
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

> Usá la conexión **directa**, no la de PgBouncer/Transaction Pooler — pg_dump no funciona con PgBouncer.

### 5.2 Exportar desde Supabase

```bash
pg_dump \
  "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --no-owner \
  --no-acl \
  --no-privileges \
  --schema=public \
  --format=custom \
  --file=hotclick_backup.dump \
  --verbose

# Verificar tamaño (debe ser varios MB):
ls -lh hotclick_backup.dump
```

### 5.3 Restaurar en RDS

```bash
pg_restore \
  --host=[RDS_ENDPOINT] \
  --port=5432 \
  --username=hotclick_admin \
  --dbname=hotclick \
  --no-owner \
  --no-acl \
  --format=custom \
  --verbose \
  hotclick_backup.dump
```

> Warnings sobre roles de Supabase son normales — ignorarlos.

### 5.4 Verificar restauración

```sql
-- Conectate a RDS:
psql -h [RDS_ENDPOINT] -U hotclick_admin -d hotclick

SELECT COUNT(*) FROM hot_click_usuario_tb;
SELECT COUNT(*) FROM hot_click_producto_tb;
SELECT COUNT(*) FROM hot_click_pedido_tb;

-- Flyway debe mostrar V1–V83:
SELECT version, description FROM flyway_schema_history ORDER BY installed_rank;
\q
```

### 5.5 Desactivar acceso público a RDS

Cuando termine la importación: en la consola RDS → Modify → **Public access: No**.  
Eliminá también tu IP del security group `hotclick-rds-sg`.

---

## PASO 6: Migrar Imágenes a S3

### 6.1 Script Python de migración

Guardá este script como `migrar_imagenes.py` en tu máquina local:

```python
"""
Migra todos los archivos del bucket HOT_CLICK de Supabase Storage a S3.
Requiere: pip install boto3 requests
"""
import requests
import boto3
import psycopg2
import sys

# ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
SUPABASE_URL      = "https://[PROJECT_REF].supabase.co"
SUPABASE_KEY      = "[TU_SUPABASE_SERVICE_KEY]"
SUPABASE_BUCKET   = "HOT_CLICK"

AWS_BUCKET        = "hotclick-media"
AWS_REGION        = "us-east-1"

RDS_HOST          = "[RDS_ENDPOINT]"
RDS_DB            = "hotclick"
RDS_USER          = "hotclick_admin"
RDS_PASSWORD      = "[TU_PASSWORD_RDS]"
# ──────────────────────────────────────────────────────────────────────────────

s3 = boto3.client("s3", region_name=AWS_REGION)
headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}


def listar_archivos(prefix=""):
    url = f"{SUPABASE_URL}/storage/v1/object/list/{SUPABASE_BUCKET}"
    resp = requests.post(url, headers=headers, json={"prefix": prefix, "limit": 1000})
    resp.raise_for_status()
    return resp.json()


def descargar_archivo(path):
    url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{path}"
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.content, resp.headers.get("content-type", "application/octet-stream")


def subir_a_s3(path, contenido, content_type):
    # Imágenes públicas; certificados son privados (sin ExtraArgs)
    es_publico = not path.startswith("certificados/")
    kwargs = {"ExtraArgs": {"ContentType": content_type, "ACL": "public-read"}} if es_publico \
             else {"ExtraArgs": {"ContentType": content_type}}
    s3.put_object(Bucket=AWS_BUCKET, Key=path, Body=contenido, **kwargs["ExtraArgs"])


def migrar_carpeta(carpeta):
    archivos = listar_archivos(carpeta)
    print(f"\n[{carpeta}] {len(archivos)} archivos encontrados")
    for item in archivos:
        nombre = item.get("name", "")
        if not nombre:
            continue
        path = f"{carpeta}/{nombre}" if carpeta else nombre
        try:
            contenido, ct = descargar_archivo(path)
            subir_a_s3(path, contenido, ct)
            print(f"  ✓ {path}")
        except Exception as e:
            print(f"  ✗ {path}: {e}", file=sys.stderr)


if __name__ == "__main__":
    carpetas = ["productos", "marcas", "logos", "testimonios", "solicitudes", "sinpe", "certificados"]
    for c in carpetas:
        migrar_carpeta(c)
    print("\n✓ Migración de archivos completada")
```

### 6.2 Ejecutar el script

```bash
python migrar_imagenes.py
```

---

## PASO 7: Actualizar URLs en la BD

Las URLs almacenadas en la BD todavía apuntan a Supabase. Hay que actualizarlas a S3.

```sql
-- Conectate a RDS:
psql -h [RDS_ENDPOINT] -U hotclick_admin -d hotclick

-- Reemplazar en la tabla de productos (columna imagenes es TEXT o JSONB):
UPDATE hot_click_producto_tb
SET imagenes = REPLACE(
  imagenes,
  'https://[PROJECT_REF].supabase.co/storage/v1/object/public/HOT_CLICK/',
  'https://hotclick-media.s3.us-east-1.amazonaws.com/'
)
WHERE imagenes LIKE '%supabase.co%';

-- Marcas:
UPDATE hot_click_marca_tb
SET logo_url = REPLACE(
  logo_url,
  'https://[PROJECT_REF].supabase.co/storage/v1/object/public/HOT_CLICK/',
  'https://hotclick-media.s3.us-east-1.amazonaws.com/'
)
WHERE logo_url LIKE '%supabase.co%';

-- Empresas (foto de perfil, banner, etc.):
UPDATE hot_click_empresa_tb
SET logo_url = REPLACE(logo_url,
  'https://[PROJECT_REF].supabase.co/storage/v1/object/public/HOT_CLICK/',
  'https://hotclick-media.s3.us-east-1.amazonaws.com/')
WHERE logo_url LIKE '%supabase.co%';

-- Verificar que no queden URLs de Supabase:
SELECT COUNT(*) FROM hot_click_producto_tb WHERE imagenes LIKE '%supabase.co%';
SELECT COUNT(*) FROM hot_click_marca_tb     WHERE logo_url LIKE '%supabase.co%';
-- Ambos deben devolver 0
```

---

## PASO 8: Crear EC2

### 8.1 Lanzar instancia

Consola AWS → EC2 → Launch Instance:

| Campo | Valor |
|-------|-------|
| Name | `hotclick-app` |
| AMI | Amazon Linux 2023 (64-bit x86) |
| Instance type | `t2.micro` |
| Key pair | Crear → `hotclick-key` → guardar el .pem |
| Security group | `hotclick-ec2-sg` |
| Storage | 20 GB gp3 |
| IAM instance profile | `hotclick-ec2-role` ← **importante** |

### 8.2 Asignar Elastic IP

EC2 → Elastic IPs → Allocate → Associate a `hotclick-app`.

---

## PASO 9: Deploy

### 9.1 Conectarse al EC2

```bash
# Windows: Git Bash o PowerShell
ssh -i "hotclick-key.pem" ec2-user@[ELASTIC_IP]

# Si hay error de permisos:
icacls "hotclick-key.pem" /inheritance:r /grant:r "%USERNAME%:R"
```

### 9.2 Instalar Docker

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
exit   # cerrar y reconectar para aplicar el grupo

ssh -i "hotclick-key.pem" ec2-user@[ELASTIC_IP]
docker --version
```

### 9.3 Instalar Docker Compose

```bash
sudo curl -L \
  "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 9.4 Crear el archivo de variables de entorno

```bash
mkdir -p /home/ec2-user/hotclick
cat > /home/ec2-user/hotclick/.env << 'EOF'
# ── BASE DE DATOS ─────────────────────────────────────────────────────────────
DB_URL=jdbc:postgresql://[RDS_ENDPOINT]:5432/hotclick
DB_USERNAME=hotclick_admin
DB_PASSWORD=[TU_PASSWORD_RDS]

# ── APP ───────────────────────────────────────────────────────────────────────
PORT=8080
JWT_SECRET=[openssl rand -base64 64]
INTERNAL_SECRET=[openssl rand -hex 32]
TOTP_ENCRYPTION_KEY=[openssl rand -hex 32]
APP_URL=https://hotclick.lat
CORS_ALLOWED_ORIGINS=https://hotclick.lat,http://localhost:3000

# ── AWS S3 ────────────────────────────────────────────────────────────────────
# Credenciales NO necesarias aquí — el EC2 usa el Instance Profile (IAM Role)
AWS_S3_BUCKET=hotclick-media
AWS_S3_REGION=us-east-1
AWS_S3_PUBLIC_URL=https://hotclick-media.s3.us-east-1.amazonaws.com

# ── EMAIL ─────────────────────────────────────────────────────────────────────
SENDGRID_API_KEY=[TU_KEY]
SENDGRID_FROM_EMAIL=hotclick.cr@gmail.com
SENDGRID_FROM_NAME=HOTCLICK

# ── PAGOS ─────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=[TU_KEY]
STRIPE_WEBHOOK_SECRET=[TU_WEBHOOK_SECRET]
STRIPE_PRICE_ID_PRO=[price_...]
STRIPE_PRICE_ID_ENTERPRISE=[price_...]

# ── AUTH ──────────────────────────────────────────────────────────────────────
CLERK_JWKS_URI=https://hot-spider-31.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://hot-spider-31.clerk.accounts.dev

# ── AI ────────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=[TU_KEY]
VOYAGE_API_KEY=[TU_KEY]
GEMINI_API_KEY=[TU_KEY]

# ── WHATSAPP ──────────────────────────────────────────────────────────────────
WHATSAPP_PHONE_ID=[TU_PHONE_ID]
WHATSAPP_TOKEN=[TU_TOKEN]

# ── N8N (dejar vacío si no usás) ──────────────────────────────────────────────
N8N_WEBHOOK_PEDIDO_NUEVO=
N8N_WEBHOOK_PEDIDO_ENTREGADO=
N8N_WEBHOOK_CARRITO_ABANDONADO=
N8N_WEBHOOK_USUARIO_REGISTRADO=
EOF
```

> El SDK de AWS detecta automáticamente las credenciales del Instance Profile.  
> **Nunca pongas `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` en el .env.**

### 9.5 Clonar el repo y construir la imagen

```bash
cd /home/ec2-user
git clone [URL_DE_TU_REPO] repo
cd repo

# Build de producción del frontend (si no está commiteado):
# (Opcional — el Dockerfile asume que static/ ya está buildeado)

# Construir imagen Docker (primera vez: ~8 min):
docker build -t hotclick-app:latest .
```

### 9.6 Docker Compose y levantar

```bash
cat > /home/ec2-user/hotclick/docker-compose.yml << 'EOF'
services:
  hotclick:
    image: hotclick-app:latest
    container_name: hotclick
    env_file: .env
    ports:
      - "8080:8080"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 90s
EOF

cd /home/ec2-user/hotclick
docker-compose up -d
docker-compose logs -f
```

Esperá ver `Started HotclickApplication` en los logs. Luego verificá:

```bash
curl http://localhost:8080/api/health
```

### 9.7 Autostart en reboot

```bash
sudo tee /etc/systemd/system/hotclick.service << 'EOF'
[Unit]
Description=HotClick Outlet
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/hotclick
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable hotclick
```

### 9.8 Script de deploy para actualizaciones futuras

```bash
cat > /home/ec2-user/hotclick/deploy.sh << 'EOF'
#!/bin/bash
set -e
cd /home/ec2-user/repo
git pull origin master
docker build -t hotclick-app:latest .
cd /home/ec2-user/hotclick
docker-compose down
docker-compose up -d
echo "Deploy completado:"
docker-compose logs --tail=20
EOF
chmod +x /home/ec2-user/hotclick/deploy.sh
```

Para cada deploy futuro, desde tu máquina local:
```bash
# 1. Hacer push
git push origin master

# 2. Ejecutar en el EC2
ssh -i "hotclick-key.pem" ec2-user@[ELASTIC_IP] "/home/ec2-user/hotclick/deploy.sh"
```

---

## PASO 10: Dominio y HTTPS

### 10.1 DNS

En tu registrador (Cloudflare, Namecheap, etc.):

| Tipo | Host | Valor |
|------|------|-------|
| A | @ | [ELASTIC_IP] |
| A | www | [ELASTIC_IP] |

### 10.2 Nginx + Certbot (HTTPS)

> **Config versionada:** usar [`Hot_click_outlet/deploy/nginx/hotclick.conf`](Hot_click_outlet/deploy/nginx/hotclick.conf) y [`deploy/ec2/apply-nginx.sh`](Hot_click_outlet/deploy/ec2/apply-nginx.sh) en lugar de pegar el snippet manualmente.

```bash
sudo dnf install -y nginx certbot python3-certbot-nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Copiar config versionada desde el repo
cd /home/ec2-user/app
sudo bash Hot_click_outlet/deploy/ec2/apply-nginx.sh

# SSL gratuito con Let's Encrypt (primera vez):
sudo certbot --nginx -d hotclick.lat -d www.hotclick.lat \
  --email hotclick.cr@gmail.com --agree-tos --no-eff-email

# Verificar renovación automática
sudo bash Hot_click_outlet/deploy/ec2/verify-certbot.sh
```

Ver también: [`deploy/ec2/security-group-hardening.md`](Hot_click_outlet/deploy/ec2/security-group-hardening.md) (cerrar puerto 8080).

### 10.3 Actualizar Stripe Webhook

Dashboard Stripe → Webhooks → editar URL:
```
https://hotclick.lat/api/webhooks/stripe
```

---

## PASO 11: Checklist Final

```
INFRAESTRUCTURA AWS
[ ] Bucket S3 "hotclick-media" creado con política pública para imágenes
[ ] IAM Role "hotclick-ec2-role" creado con política S3
[ ] RDS PostgreSQL 15 creada, pgvector habilitado
[ ] EC2 t2.micro con Elastic IP y role IAM asignado
[ ] Security groups configurados correctamente

MIGRACIÓN DE DATOS
[ ] pg_dump de Supabase completado sin errores
[ ] pg_restore en RDS verificado (conteos de tablas correctos)
[ ] flyway_schema_history presente en RDS (V1–V83)
[ ] Script migrar_imagenes.py ejecutado sin errores
[ ] URLs en BD actualizadas (0 filas con supabase.co)

APLICACIÓN
[ ] .env configurado en EC2 (sin AWS_ACCESS_KEY_ID — usa Instance Profile)
[ ] docker build exitoso
[ ] docker-compose up -d arranca sin errores
[ ] curl http://localhost:8080/api/health → OK
[ ] Login funciona: POST /api/auth/login → JWT válido
[ ] Subir imagen funciona (va a S3, devuelve URL amazonaws.com)
[ ] Imágenes existen y cargan desde S3

DOMINIO Y SSL
[ ] DNS apuntando al Elastic IP
[ ] HTTPS funcionando: https://hotclick.lat → Spring Boot
[ ] Stripe webhook actualizado a nueva URL
[ ] Primera compra de prueba end-to-end completada

LIMPIEZA (después de confirmar que todo funciona)
[ ] Cancelar servicio Railway
[ ] Cancelar suscripción Supabase (o dejar expirar el free tier)
[ ] RDS acceso público desactivado
[ ] Tu IP eliminada del security group de RDS
```

---

## Variables de entorno — resumen de cambios

| Variable anterior | Variable nueva | Notas |
|------------------|----------------|-------|
| `SUPABASE_URL` | eliminada | Reemplazada por S3 |
| `SUPABASE_SERVICE_KEY` | eliminada | No se necesita con IAM Role |
| *(nueva)* | `AWS_S3_BUCKET` | `hotclick-media` |
| *(nueva)* | `AWS_S3_REGION` | `us-east-1` |
| *(nueva)* | `AWS_S3_PUBLIC_URL` | `https://hotclick-media.s3.us-east-1.amazonaws.com` |
| `DB_URL` (Supabase) | `DB_URL` (RDS) | Cambiar el valor, misma clave |
| `DB_USERNAME` | `DB_USERNAME` | Cambiar a `hotclick_admin` |

## Costos estimados

| Servicio | Free tier (12 meses) | Post free tier |
|----------|---------------------|---------------|
| EC2 t2.micro | 750 hs/mes gratis | ~$8.50/mes |
| RDS db.t3.micro | 750 hs/mes + 20 GB gratis | ~$13.00/mes |
| S3 | 5 GB + 20k GETs gratis | ~$0.50/mes |
| Elastic IP | Gratis (si está asociada) | ~$3.60/mes |
| **Total** | **$0** (con créditos) | **~$25.60/mes** |

Los $200 en créditos cubren ~7.8 meses de costo post-free-tier.  
Con free tier de 12 meses + créditos: **más de 19 meses sin pagar nada significativo**.
