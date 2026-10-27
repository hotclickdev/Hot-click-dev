# Respaldo local cifrado (pg_dump + GPG)

`backup-local-gpg.sh` hace `pg_dump` de la base de Docker (`hotclick-postgres`), lo comprime y lo cifra con la **llave pública** de "HotClick Backups". Guarda el resultado en un directorio local del servidor. No usa AWS ni ningún servicio externo.

- El dump nunca toca disco en claro: `pg_dump | gzip | gpg` en tubería.
- Si falla `pg_dump` o el cifrado, sale con error y borra el archivo parcial.
- Directorio `700`, archivos `600`.
- Rotación: conserva los últimos `BACKUP_KEEP` (7 por defecto) y borra los más viejos.

> **Estado:** preparado en código. **No está programado ni se corrió en producción.**

## 1. Llave pública de HotClick Backups

La llave **no está en el repo** y no se inventa acá. La privada **nunca** va al servidor ni al repo; queda offline con Andrés.

1. Andrés genera (en su PC, no en el servidor) la llave, si todavía no existe:
   `gpg --full-generate-key` → nombre `HotClick Backups`.
2. Exporta solo la pública: `gpg --armor --export "HotClick Backups" > hotclick-backups.pub.asc`.
3. La copia al servidor e importa:
   ```bash
   gpg --import hotclick-backups.pub.asc
   gpg --list-keys "HotClick Backups"   # anotá el fingerprint
   ```
   Alternativa sin importar: `BACKUP_GPG_PUBKEY=/ruta/hotclick-backups.pub.asc`.

## 2. Correr a mano

```bash
sudo install -d -m 700 /var/backups/hotclick
BACKUP_GPG_RECIPIENT="<FINGERPRINT>" \
DB_USERNAME="<usuario de la base>" \
BACKUP_DIR=/var/backups/hotclick BACKUP_KEEP=7 \
  ./scripts/backup/backup-local-gpg.sh
```

Variables: `BACKUP_GPG_RECIPIENT` (obligatoria), `BACKUP_GPG_PUBKEY`, `BACKUP_DIR`, `BACKUP_KEEP`, `DB_USERNAME`, `POSTGRES_DB`, `PG_DUMP_CMD` (comando que escribe el dump a stdout).

## 3. Restaurar (en una máquina con la llave privada)

```bash
gpg --decrypt hotclick-AAAAMMDDTHHMMSSZ.dump.gz.gpg | gunzip > hotclick.dump
pg_restore -d <base_destino> hotclick.dump
```

## 4. Ejemplo de cron (NO instalado)

Solo como referencia, cuando Andrés decida activarlo:

```cron
# /etc/cron.d/hotclick-backup — 03:15 hora del servidor
15 3 * * * hotclick BACKUP_GPG_RECIPIENT=<FINGERPRINT> DB_USERNAME=<usuario> /opt/hotclick/scripts/backup/backup-local-gpg.sh >> /var/log/hotclick-backup.log 2>&1
```

Un respaldo local en el mismo servidor no protege contra la pérdida del servidor. Copiarlo afuera es una decisión pendiente.

## Prueba

`node --test scripts/eng-gates/backup-local.test.mjs` (corre en el workflow *Eng gates — selftest*). Usa un `pg_dump` simulado y una llave GPG de prueba generada en el momento. Verifica el cifrado, que no quede texto plano, los permisos, la rotación y que falle si falla el cifrado o el dump.
