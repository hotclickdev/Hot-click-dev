# Endurecimiento del Security Group EC2

## Problema detectado

El puerto **8080** (Spring Boot) estaba accesible públicamente en `18.227.68.15:8080`, bypassando Nginx y TLS. Cualquier cliente podía llamar directamente a la app sin pasar por el proxy HTTPS.

## Objetivo

Solo **443** (HTTPS vía Nginx) debe ser accesible desde Internet. El puerto **8080** queda en localhost.

## Cambios requeridos

### 1. Security Group `hotclick-ec2-sg` (AWS Console)

| Puerto | Protocolo | Origen | Acción |
|--------|-----------|--------|--------|
| 443 | TCP | `0.0.0.0/0` | Mantener (HTTPS público) |
| 80 | TCP | `0.0.0.0/0` | Mantener (redirect HTTP→HTTPS + Certbot) |
| 22 | TCP | Tu IP fija `/32` | Mantener (SSH restringido) |
| **8080** | TCP | `0.0.0.0/0` | **Eliminar regla inbound** |

AWS CLI (reemplazar `sg-XXXXXXXX` y el rule ID del puerto 8080):

```bash
# Listar reglas actuales
aws ec2 describe-security-groups --group-ids sg-XXXXXXXX \
  --query 'SecurityGroups[0].IpPermissions'

# Eliminar inbound 8080 (ajustar CIDR según la regla existente)
aws ec2 revoke-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --protocol tcp --port 8080 --cidr 0.0.0.0/0
```

### 2. Docker Compose — bind localhost

En [`docker-compose.prod.yml`](../docker-compose.prod.yml) el puerto ya está restringido:

```yaml
ports:
  - "127.0.0.1:8080:8080"
```

Tras `git pull`, redeploy:

```bash
cd /home/ec2-user/app/Hot_click_outlet
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Verificación

Desde fuera del EC2:

```bash
# Debe fallar o timeout (puerto cerrado)
curl --max-time 5 http://18.227.68.15:8080/api/health

# Debe responder 200 vía HTTPS
curl -I https://hotclick.lat/api/health
```

## Checklist

- [ ] Regla inbound 8080 eliminada del security group
- [ ] `docker-compose.prod.yml` con bind `127.0.0.1:8080:8080`
- [ ] Contenedor redeployado
- [ ] `curl http://IP:8080` falla desde Internet
- [ ] `curl https://hotclick.lat/api/health` responde 200
