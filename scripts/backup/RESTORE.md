# Restaurar un dump de `hotclick-postgres`

Los dumps diarios son `pg_dump -Fc` (custom) del contenedor `hotclick-postgres`.
Viven en un bucket S3 privado, cifrados (SSE-S3 o SSE-KMS), prefijo `db/`.
No están en GitHub Actions: el repo es público y el dump tiene datos personales
(Ley 8968).

Postgres no tiene puerto publicado. Todo el restore se hace en el host de
Lightsail, con `docker exec`, sin copiar el archivo a una laptop.

## 1. Elegir el objeto

En el host, con el mismo env del backup (`$HOME/.config/hotclick/backup.env`):

```bash
set -a
source "$HOME/.config/hotclick/backup.env"
set +a
aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX:-db}/"
```

Anotá la clave, por ejemplo `db/hotclick-YYYYMMDD-HHMMSS.dump`.

## 2. Bajarlo solo al disco del host

```bash
umask 077
mkdir -p "$HOME/restore-work"
aws s3 cp "s3://${BACKUP_S3_BUCKET}/db/hotclick-YYYYMMDD-HHMMSS.dump" \
  "$HOME/restore-work/hotclick.dump"
test "$(stat -c%s "$HOME/restore-work/hotclick.dump")" -ge 1024
head -c 5 "$HOME/restore-work/hotclick.dump" | grep -q PGDMP
```

`scripts/restore.sh verify` hace el mismo chequeo de tamaño y magic `PGDMP`.

## 3. Ensayo en una base vacía (no pisa producción)

Esto crea `hotclick_restore` dentro del mismo contenedor. No toca la base viva.

```bash
docker exec hotclick-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE hotclick_restore;"'
docker exec -i hotclick-postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d hotclick_restore --no-owner --no-acl --exit-on-error' \
  < "$HOME/restore-work/hotclick.dump"
docker exec hotclick-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d hotclick_restore -c "SELECT count(*) FROM hot_click_usuario_tb;"'
```

Repetí el conteo para `hot_click_pedido_tb` y `hot_click_producto_tb`.
Cuando termines el ensayo:

```bash
docker exec hotclick-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE hotclick_restore;"'
rm -rf "$HOME/restore-work"
```

En un host de 4 GB un restore completo compite con la app. Hacelo en una
ventana corta y mirá `docker stats`.

## 4. Reemplazar la base viva

Solo después de un ensayo correcto. El nombre real es `POSTGRES_DB` del
contenedor (en el compose de Lightsail, `hotclick`).

```bash
docker exec hotclick-postgres sh -c 'printf "%s\n" "$POSTGRES_DB"'
```

En el directorio del compose (`docker-compose.lightsail.yml`):

```bash
docker compose -f docker-compose.lightsail.yml stop app
```

Renombrá la base actual, creá una vacía con el mismo nombre y restaurá.
Sustituí `hotclick` si `POSTGRES_DB` es otro.

```bash
docker exec hotclick-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "ALTER DATABASE hotclick RENAME TO hotclick_pre_restore;"'
docker exec hotclick-postgres sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE hotclick;"'
docker exec -i hotclick-postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d hotclick --no-owner --no-acl --exit-on-error' \
  < "$HOME/restore-work/hotclick.dump"
docker compose -f docker-compose.lightsail.yml start app
```

Si `ALTER DATABASE` dice que hay otras sesiones, no hay app que deba seguir
conectada: el `stop` de arriba tiene que haber terminado antes.

Comprobá `curl -s http://127.0.0.1:8080/api/health` y un login. Si algo falla,
pará `app`, borrá la base nueva y renombrá `hotclick_pre_restore` de vuelta a
`hotclick`.

Borrá el archivo local al terminar (`rm -rf "$HOME/restore-work"`).

## Qué no hacer

- No abras el puerto 5432 en el firewall de Lightsail.
- No subas el dump como artifact de GitHub ni a un bucket público.
- No uses las keys del bucket de imágenes (`hotclick-media`) para estos dumps.
- No restores un `.sql.gz` viejo de Supabase con `psql`: el formato actual es `-Fc`.
