# Backup de Postgres (Lightsail)

El backup diario lo hace el server con el timer `hotclick-db-backup`. GitHub Actions solo lo verifica desde afuera.

```
05:30 UTC  server: pg_dump -Fc (docker exec) → tamaño mínimo → pg_restore --list + lectura completa
           → age (clave PÚBLICA) → S3 s3://<bucket>/postgres/AAAA/MM/hotclick-<ts>.dump.age
           (la clave IAM del server solo tiene s3:PutObject: no lista, no lee, no borra)
07:30 UTC  Actions «Daily DB Backup» (D5): baja el último, exige < 26 h, descifra con BACKUP_AGE_IDENTITY,
           pg_restore --list + lectura completa + datos de usuario/pedido/producto/pago
Dom 08:00  Actions «S8 restore drill»: lo restaura en un Postgres 18 + pgvector descartable y cuenta filas
```

Un fallo en el server deja la unidad `failed` y avisa por Telegram si está configurado. Un fallo en Actions pone el job en rojo, avisa por Telegram y el S8 abre un issue P0.

## Setup inicial en el server (una vez)

1. **Clave age**, en tu PC, nunca en el server:
   - `age-keygen -o hotclick-backup.key`. Guardá ese archivo en tu gestor de contraseñas.
   - La línea `age1...` que imprime es la pública.
   - Cargá el contenido completo del archivo como secreto `BACKUP_AGE_IDENTITY` del repo.
2. **Bucket S3** en us-east-2, por ejemplo `hotclick-db-backups`:
   - Block Public Access activado, SSE-S3 y versionado.
   - Lifecycle: `aws s3api put-bucket-lifecycle-configuration --bucket <bucket> --lifecycle-configuration file://bucket-lifecycle.json` (35 días).
3. **Usuarios IAM**, reemplazando `BUCKET` en los JSON:
   - `hotclick-db-backup-writer` con `iam-writer-policy.json` (solo PutObject). Su clave va solo al server.
   - `hotclick-db-backup-ci-reader` con `iam-ci-reader-policy.json` (List y Get del prefijo). Su clave va a los secretos `BACKUP_READ_AWS_*` del repo.
4. **En el server:**
   ```bash
   # age (binario estático; verificar el checksum de la release)
   curl -fsSLO https://github.com/FiloSottile/age/releases/download/v1.2.1/age-v1.2.1-linux-amd64.tar.gz
   tar xzf age-v1.2.1-linux-amd64.tar.gz && sudo install -m 755 age/age /usr/local/bin/age
   # AWS CLI v2 si no está (aws --version)
   sudo useradd --system --no-create-home --shell /usr/sbin/nologin --groups docker hotclick-backup
   sudo install -m 755 deploy/backup/hotclick-db-backup.sh /usr/local/bin/hotclick-db-backup.sh
   sudo install -d -m 750 -o root -g hotclick-backup /etc/hotclick
   sudo install -m 640 -o root -g hotclick-backup deploy/backup/backup.env.example /etc/hotclick/backup.env
   sudoedit /etc/hotclick/backup.env   # PG_USER, AGE_RECIPIENT, BUCKET, claves writer, Telegram
   # Antes de pisar el timer que ya existe en el server, guardá una copia:
   systemctl cat hotclick-db-backup.service hotclick-db-backup.timer > ~/hotclick-db-backup.unit.bak || true
   sudo install -m 644 deploy/backup/hotclick-db-backup.{service,timer} /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now hotclick-db-backup.timer
   sudo systemctl start hotclick-db-backup.service && journalctl -u hotclick-db-backup -n 20 --no-pager
   systemctl list-timers hotclick-db-backup.timer
   ```
5. En GitHub, corré «Daily DB Backup» (workflow_dispatch) y después «S8 — Weekly restore drill».

> `hotclick-backup` está en el grupo `docker`, y eso equivale a root en el host. Es el mínimo necesario para `docker exec`. El script solo corre `pg_dump` y `pg_restore --list` o `-f /dev/null`.

## Restaurar a mano

En una máquina con la clave privada, nunca en el server:
```bash
aws s3 cp s3://<bucket>/postgres/AAAA/MM/hotclick-<ts>.dump.age .
age -d -i hotclick-backup.key -o hotclick.dump hotclick-<ts>.dump.age
pg_restore --list hotclick.dump | head
# Restaurar en el contenedor de destino (base vacía):
docker exec -i hotclick-postgres pg_restore -U "$DB_USERNAME" -d hotclick --no-owner --no-acl --exit-on-error < hotclick.dump
```
