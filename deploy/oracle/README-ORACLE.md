# HOTCLICK en Oracle Cloud Always Free — guía de despliegue

Preparación para correr HOTCLICK en una VM **Always Free** de Oracle. **La VM todavía no existe**: el reintento de creación (`/workspace/oci-retry/reintentar.sh`) sigue corriendo y no se debe tocar.

Todo lo de esta carpeta es **plantilla/preparación**. Nada de esto se ha ejecutado contra Oracle, Lightsail ni hotclick.lat.

> **Leyenda:** 🔒 = **REQUIERE AUTORIZACIÓN EXPLÍCITA DE ANDRÉS** antes de ejecutarlo.

## Archivos

| Archivo | Para qué |
| --- | --- |
| `install-host.sh` | Prepara el host Ubuntu 24.04 aarch64: Docker + compose, usuario `hotclick`, swap 4 G, ufw (22/80/443), Nginx y Certbot instalados (sin sitio) |
| `docker-compose.oracle.yml` | App + Postgres 18 (ARM64), 12 GB de RAM, 8080 solo en loopback, Postgres sin puerto publicado, volumen nuevo `hotclick_oracle_pgdata` |
| `build-arm64.sh` | `docker buildx --platform linux/arm64`, sin push (`--load` o `--tar`) |
| `.env.oracle.example` | Plantilla del `.env` del servidor (sin secretos) |
| `nginx-hotclick.conf.example` | Nginx: HTTP→HTTPS y proxy a `127.0.0.1:8080` |
| `BUILD-ARM64-NOTAS.md` | Verificación de compatibilidad ARM64 y qué se intentó construir |

## Destino (solo documentado, no creado por estos archivos)

- Región `us-ashburn-1`; forma `VM.Standard.A1.Flex` (ARM64), **2 OCPU / 12 GB**, Ubuntu 24.04 aarch64, boot 100 GB.
- VCN `hotclick-vcn`: `ocid1.vcn.oc1.iad.amaaaaaaunoosjqayt2k6e6f3yqxjbqe3rufnifpj67assd2c6ubxgqde5iq`
- Subnet pública `10.0.0.0/24`: `ocid1.subnet.oc1.iad.aaaaaaaaavx46ifnswodjlvgeqq7p6fieft3w3kopk626du2suew6l33kynq`
- Security List (*Default Security List for hotclick-vcn*): `ocid1.securitylist.oc1.iad.aaaaaaaa5rzjojgbqqa7vlyqqvuoroom6f3utbgl6da3k3q4mupqig5gpcvq`
  - Ingress hoy: TCP 22 `0.0.0.0/0`; ICMP `0.0.0.0/0`; ICMP `10.0.0.0/16`. **No hay 80 ni 443.**
  - Egress: todo `0.0.0.0/0`.

## Límites y riesgos de Always Free

- A1.Flex Always Free: la documentación oficial de Oracle (docs.oracle.com, «Always Free Resources») asigna el equivalente a **2 OCPU y 12 GB** por cuenta, **no** 4 y 24.
- **4 OCPU / 24 GB solo están disponibles mientras la cuenta está en el periodo de prueba con crédito.** Al terminar la prueba, si la VM supera 2 OCPU / 12 GB, Oracle puede detenerla.
- Esta preparación pide exactamente **2 OCPU / 12 GB** para quedar dentro de lo gratis cuando acabe la prueba. **No hay margen Always Free para una segunda VM A1 de 2/12**: no crearla (evita cargos).
- El boot volume de 100 GB cabe en los 200 GB de boot volumes Always Free.
- **No borrar la VM** ni dejarla detenida sin necesidad: recrearla vuelve a depender de la disponibilidad de capacidad A1 (por eso hay un reintento corriendo).
- Oracle **puede reclamar instancias Always Free inactivas** (referencia: ~7 días con uso de CPU, red y memoria muy bajos en el percentil 95). Mantener la app corriendo con tráfico/health checks periódicos y revisar los avisos por correo de Oracle.
- Mantener la cuenta con actividad; si la cuenta cae a Always Free-only, los recursos de pago se detienen.
- Sin SLA de producción: esta VM es para pruebas/staging hasta que Andrés decida otra cosa.

## Pasos (en orden)

### 1. Esperar a que exista la VM
El reintento ya corre. No lo toques ni lo reinicies. Cuando exista, anotá su IP pública y confirmá que entrás por SSH (`ssh ubuntu@<IP>`).

### 2. 🔒 Bucket de Object Storage + Customer Secret Key
Reemplaza `<COMPARTMENT_OCID>`, `<namespace>`, `<USER_OCID>`.

```bash
oci os ns get                                    # solo lectura → <namespace>
oci os bucket create --compartment-id <COMPARTMENT_OCID> --namespace-name <namespace> \
  --name hotclick-media-oci --public-access-type ObjectRead
oci iam customer-secret-key create --user-id <USER_OCID> --display-name hotclick-s3
# ↑ el secreto se muestra UNA sola vez: guardarlo directo en el .env del servidor, nunca en el repo.
```

⚠️ **Decisión de seguridad pendiente:** la app usa un solo bucket y con `AWS_S3_PUBLIC_OBJECT_ACL=false` la lectura pública es del bucket completo. Los prefijos `comprobantes-sinpe/` y `certificados/` (comprobantes, XML de Hacienda, fotos privadas) **no deben** quedar públicos. Para la **primera prueba con datos de sandbox** es aceptable; antes de datos reales hay que resolverlo (revisión sec-infra: política por prefijo o bucket privado + URLs firmadas).

### 3. 🔒 Abrir 80 y 443 en la Security List de OCI
`oci network security-list update` **reemplaza TODAS las reglas de ingress que se le pasen**. Por eso: primero se exporta lo actual, se agregan 80/443 sin quitar SSH ni ICMP, se revisa, y recién entonces se aplica. **No ejecutar sin autorización.** No se abre 8080 ni 5432.

```bash
SL=ocid1.securitylist.oc1.iad.aaaaaaaa5rzjojgbqqa7vlyqqvuoroom6f3utbgl6da3k3q4mupqig5gpcvq

# (1) Exportar reglas actuales (solo lectura) y guardar respaldo
oci network security-list get --security-list-id "$SL" \
  --query 'data."ingress-security-rules"' > ingress-actual.json
cp ingress-actual.json ingress-respaldo-$(date +%F).json

# (2) Agregar TCP 80 y 443 desde 0.0.0.0/0, conservando todo lo existente
jq '. + [
  {"protocol":"6","source":"0.0.0.0/0","sourceType":"CIDR_BLOCK","isStateless":false,
   "description":"HTTP (certbot + redirect)","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
  {"protocol":"6","source":"0.0.0.0/0","sourceType":"CIDR_BLOCK","isStateless":false,
   "description":"HTTPS","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}}
]' ingress-actual.json > ingress-nuevo.json

# (3) Verificar ANTES de aplicar: deben seguir SSH 22 e ICMP, y estar 80 y 443 (y nada de 8080/5432)
jq -r '.[] | "\(.protocol)\t\(.source)\t\(.tcpOptions.destinationPortRange // .icmpOptions // "-" | tostring)"' ingress-nuevo.json
jq -e 'any(.[]; .tcpOptions.destinationPortRange.min==22) and any(.[]; .protocol=="1")
       and any(.[]; .tcpOptions.destinationPortRange.min==80)
       and any(.[]; .tcpOptions.destinationPortRange.min==443)' ingress-nuevo.json

# (4) 🔒 Aplicar SOLO con la autorización de Andrés (--force evita la confirmación interactiva)
oci network security-list update --security-list-id "$SL" \
  --ingress-security-rules file://ingress-nuevo.json --force
```
El egress no se pasa, así que queda igual. Para revertir: aplicar `ingress-respaldo-<fecha>.json` de la misma forma.

### 4. 🔒 DNS de hotclick.lat / www hacia la IP nueva (cutover)
Esto **mueve el tráfico real**: no hacerlo hasta que Andrés lo autorice y la prueba en la VM esté aprobada. Mientras tanto, probar con un subdominio de prueba o `curl --resolve`. Antes del cutover bajar el TTL del DNS actual (Spaceship). Lightsail (`18.119.201.126`) se queda prendida hasta confirmar el corte, para poder revertir el DNS.

### 5. `.env` en el servidor (nunca en el repo)
```bash
# en la VM, como hotclick
git clone <repo> /home/hotclick/app && cd /home/hotclick/app/deploy/oracle   # o scp de la carpeta
cp .env.oracle.example .env && chmod 600 .env
nano .env     # llenar dominio, secretos (openssl rand ...), Customer Secret Key, llaves ONVO SANDBOX
```
Todo lo marcado `<...>` o vacío en la plantilla lo llena Andrés. El `.env` está en `.gitignore`.

### 6. Base de datos vacía
Postgres arranca con el volumen nuevo `hotclick_oracle_pgdata`; Flyway crea el esquema y la app siembra el admin con `HOTCLICK_ADMIN_INITIAL_PASSWORD`. **No se restaura ningún dump ni se copian datos de Lightsail/AWS** (Ley 8968). Si Andrés más adelante pide migrar datos, es otro trabajo con su propia autorización.

### 7. Preparar host, construir, levantar, HTTPS, health check

```bash
# 7.1 Host (una vez, como root en la VM)
sudo bash deploy/oracle/install-host.sh      # reentrar a la sesión después (grupo docker)

# 7.2 Imagen ARM64. En la VM (aarch64) el build es NATIVO, sin emulación:
cd /home/hotclick/app && deploy/oracle/build-arm64.sh
#   (desde un x86 hace falta qemu-user-static: lento; ver BUILD-ARM64-NOTAS.md)
#   El frontend viene precompilado en src/main/resources/static/ (commit); la imagen no compila React.

# 7.3 Levantar app + Postgres
cd deploy/oracle
docker compose -f docker-compose.oracle.yml up -d
docker compose -f docker-compose.oracle.yml logs -f app
curl -s http://127.0.0.1:8080/api/health      # primero local, sin HTTPS
```

**Nginx + Certbot** (🔒 solo cuando el DNS del dominio ya apunte a la IP de Oracle y Andrés lo autorice; 80/443 abiertos en OCI, paso 3):
```bash
sudo cp nginx-hotclick.conf.example /etc/nginx/sites-available/hotclick
sudo sed -i 's/<DOMINIO>/el-dominio-real/g' /etc/nginx/sites-available/hotclick
sudo ln -sf /etc/nginx/sites-available/hotclick /etc/nginx/sites-enabled/hotclick
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Opción A (recomendada): plugin nginx — emite el certificado y agrega el bloque 443
sudo certbot --nginx -d el-dominio-real -d www.el-dominio-real
# Opción B: certonly, luego descomentar el bloque 443 de la plantilla
#   sudo certbot certonly --webroot -w /var/www/html -d el-dominio-real -d www.el-dominio-real
sudo certbot renew --dry-run                   # la renovación automática la trae el paquete (certbot.timer)
```
**No correr certbot contra `hotclick.lat` antes del cutover**: fallaría la validación (el DNS aún apunta a Lightsail) y gasta intentos del límite de Let's Encrypt.

**Health check final:**
```bash
curl -s https://el-dominio-real/api/health
sudo ss -ltnp | grep -E ':(8080|5432)'          # 8080 solo en 127.0.0.1; 5432 NO debe aparecer
# desde fuera de la VM, 8080 y 5432 deben estar cerrados:  nc -zv <IP> 8080 5432
```

### 8. Prohibiciones
- 🔒 **Prohibido deploy a producción** y **ONVO en modo live** sin OK explícito de Andrés.
- La **primera prueba en esta VM usa ONVO sandbox** (llaves y price IDs de prueba), `PAYMENTS_ONVO_PERMITIR_LLAVE_TEST` según lo que indique la guía de pagos del repo.
- No abrir 8080 ni 5432 a internet; no poner secretos en el repo; no tocar Lightsail (`18.119.201.126`) ni la EC2 apagada.

## Operación básica

```bash
docker compose -f docker-compose.oracle.yml ps
docker compose -f docker-compose.oracle.yml logs --tail=200 app
docker compose -f docker-compose.oracle.yml restart app      # tras editar .env
docker compose -f docker-compose.oracle.yml down             # NO usar -v: borra la base
```
Rollback: apuntar el DNS de nuevo a `18.119.201.126` (Lightsail).
