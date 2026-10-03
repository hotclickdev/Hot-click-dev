# Mudanza a Lightsail 4 GB (Ohio)

Objetivo: app + Postgres en Docker, fotos en S3 (`hotclick-media`, us-east-2).
Costo del plan: ~USD 20/mes. Compose de la app: `docker-compose.lightsail.yml`.

## Estado al 24 sep 2026

Producción es Lightsail. No desplegar en la EC2 ni apuntar la app viva a RDS.

| Pieza | Estado |
| --- | --- |
| DNS `hotclick.lat` y `www` | `18.119.201.126` (Lightsail, us-east-2). Nginx 1.30.4. |
| App | Contenedor `hotclick`. `https://hotclick.lat/api/health` respondió 200 después de apagar la EC2. |
| Base viva | Contenedor `hotclick-postgres` (sano). `DB_URL` del `.env` en Lightsail usa el host `postgres`, no RDS. |
| Guardrails | El contenedor `hotclick-guardrails` estaba corriendo en Lightsail. No forma parte de `docker-compose.lightsail.yml`. |
| EC2 `hotclick-app` | **Stopped** el 24 sep 2026 (~20:31, hora de Costa Rica), con `sudo shutdown -h now` en `18.227.68.15` (hostname `ip-172-31-37-118`). No es Terminate: el disco queda. Tras el apagado, 22/80/443/8080 de esa IP no respondían. |
| Elastic IP `18.227.68.15` | Sigue asignada. Con la instancia apagada, AWS la cobra. Dejarla mientras exista chance de rollback. |
| RDS `hotclick-db` | **Pendiente.** Sigue existiendo. La EC2 apuntaba a ese host; el sitio no. No se pudo parar: el rol de Lightsail no tiene `rds:*` y en la PC no había credenciales de AWS. |

### Pendiente, en este orden

1. Consola RDS, región us-east-2, cuenta `343781770975`, instancia `hotclick-db`.
2. Snapshot manual `hotclick-db-prestop-2026-09-24`. Esperar a que quede available.
3. **Stop**. No borrar la instancia el mismo día.
4. Un Stop de RDS dura como máximo 7 días: AWS la enciende sola. El disco y el snapshot se siguen cobrando; las horas de la instancia, no.

### Rollback

La EC2 solo vuelve a servir el sitio si está encendida **y** RDS está available (su `.env` sigue en RDS). Después, DNS de `hotclick.lat` y `www` otra vez a `18.227.68.15`. Lightsail se queda prendida hasta confirmar ese corte.

## 0. Antes

- [ ] Terminá la instancia de prueba `borrar_credito` si sigue viva.
- [ ] Borrá la Lambda `borrar_credito_hotclick` si existe.
- [ ] Tené el `.env` de producción (copia local, no al git).
- [ ] IAM user (o keys) con acceso al bucket `hotclick-media` — Lightsail no usa el Instance Profile del EC2.

## 1. Crear la máquina (consola AWS)

1. [Lightsail — instancias, región Ohio (us-east-2)](https://lightsail.aws.amazon.com/ls/webapp/home/instances?region=us-east-2)
2. Crear instancia: **Linux/Unix**, blueprint **OS only** (Amazon Linux 2023 o Ubuntu 24).
3. Plan **4 GB RAM** (USD 20).
4. Zona **us-east-2** (la misma de S3).
5. Nombre: `hotclick-lightsail`.
6. IP estática Lightsail y pegala a la instancia (como la Elastic IP).
7. Firewall Lightsail: **22** (tu IP), **80**, **443**. **No** abras 5432 ni 8080 a internet.

## 2. Server: Docker + Nginx + Certbot

SSH a la IP nueva. Instalá Docker Engine, el plugin `docker compose`, Nginx y Certbot (igual que en el EC2).

Cloná el repo (o copiá `Hot_click_outlet`). **No** uses `docker-compose.prod.yml` (trae guardrails y asume RDS).

## 3. `.env` en Lightsail

Copiá el `.env` de producción y cambiá **solo** la base:

```env
POSTGRES_DB=hotclick
DB_URL=jdbc:postgresql://postgres:5432/hotclick?sslmode=disable
DB_USERNAME=<el mismo user que vas a usar en Postgres>
DB_PASSWORD=<password fuerte, no la de RDS si no querés reutilizarla>
```

Descomentá `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` (S3). El resto (ONVO, JWT, etc.) igual que producción.

## 4. Dump desde RDS (con EC2/RDS aún vivos)

Desde una máquina que alcance RDS (el EC2 actual):

```bash
pg_dump -h <RDS_HOST> -U <DB_USERNAME> -d postgres -Fc -f hotclick.dump
```

Copiá `hotclick.dump` al Lightsail (`scp`). No bajes el dump al chat ni al git.

## 5. Levantar Postgres, restore, luego la app

En `Hot_click_outlet` del Lightsail:

```bash
docker compose -f docker-compose.lightsail.yml up -d postgres
# Esperá healthy: docker compose -f docker-compose.lightsail.yml ps

docker exec -i hotclick-postgres pg_restore \
  -U "$DB_USERNAME" -d hotclick --no-owner --role="$DB_USERNAME" \
  < hotclick.dump
```

Si el dump es de la base `postgres` (RDS) y el destino es `hotclick`, `pg_restore` a `-d hotclick` suele bastar. Si falla por nombre de base, restore a `postgres` y alineá `POSTGRES_DB`/`DB_URL`.

```bash
docker build -t hot_click_outlet-app .
docker compose -f docker-compose.lightsail.yml up -d
docker logs -f hotclick
curl -s http://127.0.0.1:8080/api/health
```

Build de Java en 4 GB: si se queda sin RAM, buildeá la imagen en tu PC (`docker build -t hot_click_outlet-app .`), `docker save` + `scp` + `docker load` en Lightsail.

## 6. Nginx → 8080 y HTTPS

Igual que el EC2: proxy a `127.0.0.1:8080`, `certbot` para `hotclick.lat`.

**No cambies el DNS todavía.** Probá por IP o un hosts local.

## 7. Probar (antes del DNS)

- [ ] `/api/health`
- [ ] Login admin
- [ ] Un producto con foto S3
- [ ] Checkout / ONVO en modo test si aplica
- [ ] `docker stats` — app por debajo de 2 GB, postgres por debajo de 768 MB

## 8. Cortar a Lightsail

1. Spaceship: `hotclick.lat` (y `www`) → **IP estática de Lightsail**. Hecho: `18.119.201.126`.
2. `https://hotclick.lat/api/health` en 200. Hecho el 24 sep 2026, también después de apagar la EC2.
3. ONVO / webhooks: la URL pública sigue siendo `https://hotclick.lat`.
4. EC2 apagada el 24 sep 2026 (Stop, no Terminate).
5. RDS: snapshot y Stop **pendientes**. No borrar el mismo día. Ver el estado al inicio de este archivo.

## Rollback

Encender la EC2, confirmar que RDS `hotclick-db` está available, y pasar el DNS otra vez a `18.227.68.15`. Lightsail no se apaga hasta que ese corte responda.

## Backups

El workflow `Daily DB Backup` entra por SSH y corre `pg_dump -Fc` dentro de
`hotclick-postgres`. El archivo va a un bucket S3 privado (SSE), no a GitHub.
Restore: `scripts/backup/RESTORE.md`. El puerto 5432 sigue cerrado.

## Qué no hacer

- Abrir Postgres a `0.0.0.0`.
- Correr este compose **en el EC2** apuntando a un Postgres local y el RDS a la vez “por las dudas” sin saber qué `DB_URL` usa la app.
- Apagar RDS el mismo minuto del cambio de DNS.
- Subir de plan Lightsail a 8 GB “por si acaso” antes de medir.
