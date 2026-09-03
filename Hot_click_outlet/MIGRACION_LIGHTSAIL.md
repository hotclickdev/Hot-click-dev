# Mudanza a Lightsail 4 GB (Ohio) — sin apagar producción todavía

Objetivo: app + Postgres en Docker, fotos en S3 (`hotclick-media`, us-east-2).
El EC2 `hotclick-app` y RDS **siguen prendidos** hasta que Lightsail responda 24 h.

Costo: ~USD 20/mes. Compose: `docker-compose.lightsail.yml`.

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

1. Spaceship: `hotclick.lat` (y `www`) → **IP estática de Lightsail**.
2. Esperá el TTL; `curl -sI https://hotclick.lat/api/health`.
3. ONVO / webhooks: la URL pública sigue siendo `https://hotclick.lat` (no cambia si el dominio es el mismo).
4. Dejá EC2+RDS **24 h** por si hay rollback (DNS atrás a la Elastic IP).
5. Recién entonces: stop EC2 y **stop** RDS (snapshot RDS antes). No borres RDS el primer día.

## Rollback

DNS otra vez a `18.227.68.15`. EC2 + RDS como estaban. Lightsail se puede apagar para no cobrar el mes completo.

## Qué no hacer

- Abrir Postgres a `0.0.0.0`.
- Correr este compose **en el EC2** apuntando a un Postgres local y el RDS a la vez “por las dudas” sin saber qué `DB_URL` usa la app.
- Apagar RDS el mismo minuto del cambio de DNS.
- Subir de plan Lightsail a 8 GB “por si acaso” antes de medir.
