# Backup de Postgres (Lightsail → Google Drive)

> **Cuenta de Google: `andreszf124p@gmail.com`.** El proyecto de Google Cloud, la carpeta de Drive y la autorización de rclone son de esa cuenta. Entrá siempre con ella (en una ventana privada, si tenés otra sesión abierta).

El backup diario lo hace el server con el timer `hotclick-db-backup`. GitHub Actions solo lo verifica desde afuera.

```
05:30 UTC  server: pg_dump -Fc (docker exec) → tamaño mínimo → pg_restore --list + lectura completa
           → age (clave PÚBLICA) → rclone → carpeta de Drive: hotclick-AAAAMMDDTHHMMSSZ.dump.age
           → confirma el tamaño subido → borra solo hotclick-*.dump.age de más de 35 días
07:30 UTC  Actions «Daily DB Backup» (D5): baja el más nuevo, exige < 26 h, descifra con BACKUP_AGE_IDENTITY,
           pg_restore --list + lectura completa + datos de usuario/pedido/producto/pago
Dom 08:00  Actions «S8 restore drill»: lo restaura en un Postgres 18 + pgvector descartable y cuenta filas
```

Un fallo en el server deja la unidad `failed` y avisa por Telegram si está configurado. Un fallo en Actions pone el job en rojo, avisa por Telegram y el S8 abre un issue P0.

## ¿Service account u OAuth?
- **Service account: no sirve con un Gmail gratis.** Un service account no tiene cuota de Drive.
  - Subir a una carpeta de «Mi unidad», aunque esté compartida con él, falla con `403 storageQuotaExceeded: Service Accounts do not have storage quota`.
  - Solo funciona dentro de una **unidad compartida** (Google Workspace, pago) o con delegación de dominio (también Workspace).
  - Además, desde abril de 2025 los service accounts nuevos ya no pueden ser dueños de archivos en Drive.
  - **Compartir la carpeta con el service account como Editor NO funciona en el Drive gratis de `andreszf124p@gmail.com`:** el service account puede ver la carpeta, pero al subir da error de cuota. Por eso se usa OAuth.
  - El código lo soporta: `GDRIVE_SA_JSON` + `GDRIVE_SHARED_DRIVE_ID`, para el día que haya Workspace.
- **Recomendado: OAuth con tu propia cuenta**, gratis y dentro de los 15 GB de Drive:
  - Un cliente OAuth propio, con scope `drive.file`: rclone solo ve y toca los archivos que él mismo creó, nada más de tu Drive.
  - Lo tenés que crear vos: el client_id compartido de rclone se retira durante 2026.
- El modo se elige solo según qué credencial esté cargada. Si hay de los dos tipos, falla.

## Setup, sin costo, una vez

### 1. Clave age, en tu PC, nunca en el server
1. Corré `age-keygen -o hotclick-backup.key` y guardá el archivo en tu gestor de contraseñas.
2. La línea `age1...` que imprime es la **pública**: va al server como `AGE_RECIPIENT`.
3. El contenido completo del archivo es el secreto de GitHub **`BACKUP_AGE_IDENTITY`**.

### 2. Proyecto de Google Cloud y cliente OAuth (gratis)
1. Entrá a https://console.cloud.google.com/ como **`andreszf124p@gmail.com`** y creá el proyecto `hotclick-backups`.
2. En «APIs y servicios» → «Biblioteca», habilitá la **Google Drive API**.
3. Configurá la pantalla de consentimiento («Google Auth Platform»):
   - Tipo **External**, nombre `hotclick-backup`.
   - En «Data access», agregá el scope `https://www.googleapis.com/auth/drive.file`.
   - En «Audience», agregá **`andreszf124p@gmail.com`** como test user.
   - Correo de soporte y de contacto: `andreszf124p@gmail.com`.
4. En «Clients», hacé «Create client» de tipo **Desktop app**. Anotá el client ID y el client secret.
5. **En «Audience», hacé «PUBLISH APP» (pasar a *In production*).**
   - Si queda en *Testing*, el refresh token **vence a los 7 días** y el backup deja de subir.
   - No hace falta verificar la app: para uso propio (menos de 100 usuarios), Google acepta una app sin verificar. Solo vas a ver la pantalla «Google no verificó esta app» al autorizar: «Avanzado» → «Ir a hotclick-backup».
   - Si el botón está deshabilitado, Google pide una URL de inicio y una de privacidad en «Branding». Una página de GitHub Pages sirve.

### 3. Token y carpeta, en tu PC con navegador
```bash
# rclone: https://rclone.org/downloads/
# El blob fija el scope drive.file (con solo "client_id client_secret" rclone pediría acceso total)
rclone authorize drive "$(printf '{"scope":"drive.file","client_id":"%s","client_secret":"%s"}' '<CLIENT_ID>' '<CLIENT_SECRET>' | base64 -w0)"
# Abre el navegador: iniciá sesión como andreszf124p@gmail.com (no otra cuenta), aceptá, e imprime un JSON {"access_token":...,"refresh_token":...}.
# Ese JSON en una sola línea es GDRIVE_RCLONE_TOKEN.

# Con drive.file, rclone no ve carpetas creadas a mano en la web: la carpeta la crea rclone.
export RCLONE_CONFIG_GDTMP_TYPE=drive RCLONE_CONFIG_GDTMP_SCOPE=drive.file \
  RCLONE_CONFIG_GDTMP_CLIENT_ID=<CLIENT_ID> RCLONE_CONFIG_GDTMP_CLIENT_SECRET=<CLIENT_SECRET> \
  RCLONE_CONFIG_GDTMP_TOKEN='<JSON del paso anterior>'
rclone mkdir gdtmp:hotclick-db-backups
rclone lsjson gdtmp: --dirs-only | grep -A3 hotclick-db-backups   # el "ID" es GDRIVE_FOLDER_ID
```
- La carpeta `hotclick-db-backups` aparece en «Mi unidad» de `andreszf124p@gmail.com`, en la web.
- No le pongas otros archivos. Igual, la retención solo borra `hotclick-*.dump.age`, y con `drive.file` rclone ni siquiera ve lo demás.

### 4. Server (Lightsail)
```bash
# age y rclone (binarios oficiales; verificá checksums)
curl -fsSLO https://github.com/FiloSottile/age/releases/download/v1.2.1/age-v1.2.1-linux-amd64.tar.gz
tar xzf age-v1.2.1-linux-amd64.tar.gz && sudo install -m 755 age/age /usr/local/bin/age
curl -fsSL https://rclone.org/install.sh | sudo bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin --groups docker hotclick-backup
sudo install -d -m 755 /usr/local/lib/hotclick
sudo install -m 755 deploy/backup/hotclick-db-backup.sh deploy/backup/gdrive-rclone-env.sh /usr/local/lib/hotclick/
sudo install -d -m 750 -o root -g hotclick-backup /etc/hotclick
sudo install -m 640 -o root -g hotclick-backup deploy/backup/backup.env.example /etc/hotclick/backup.env
sudoedit /etc/hotclick/backup.env   # PG_USER, AGE_RECIPIENT, GDRIVE_*, Telegram
# Antes de pisar el timer que ya existe, guardá una copia:
systemctl cat hotclick-db-backup.service hotclick-db-backup.timer > ~/hotclick-db-backup.unit.bak || true
sudo install -m 644 deploy/backup/hotclick-db-backup.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now hotclick-db-backup.timer
sudo systemctl start hotclick-db-backup.service && journalctl -u hotclick-db-backup -n 20 --no-pager
systemctl list-timers hotclick-db-backup.timer
```
Va al server, solo en `/etc/hotclick/backup.env` (640):
- `AGE_RECIPIENT` (pública)
- `GDRIVE_FOLDER_ID`, `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_RCLONE_TOKEN`
- `PG_USER`
- Telegram, opcional

**Nunca** la clave privada age.

> `hotclick-backup` está en el grupo `docker`, y eso equivale a root en el host. Es el mínimo necesario para `docker exec`.

### 5. GitHub (Settings → Secrets and variables → Actions)
- **Variables:** `GDRIVE_FOLDER_ID`. Con service account, además `GDRIVE_SHARED_DRIVE_ID`.
- **Secrets:**
  - `BACKUP_AGE_IDENTITY`
  - `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_RCLONE_TOKEN`. Con service account, en su lugar `GDRIVE_SA_JSON`.
  - `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` ya existen.
- Después corré a mano «Daily DB Backup» y «S8 — Weekly restore drill».

### Límites y riesgos
- **El token de OAuth puede leer y borrar los backups que creó rclone.** No hay una clave «solo escribir» como en S3. Si el server queda comprometido, alguien podría borrarlos.
  - Mitigación: Drive los manda a la papelera (30 días) y D5 avisa si falta el backup del día.
- **Si revocás el acceso de la app o cambiás la contraseña de Google,** el token deja de servir. Rehacé el paso 3 y actualizá server y GitHub.
- **Cuota:** 15 GB compartidos con Gmail y Fotos. Con 35 días de retención, más la papelera, calculá unas 65 copias.

## Restaurar a mano
En una máquina con la clave privada, nunca en el server:
```bash
rclone copyto gdtmp:hotclick-db-backups/hotclick-<ts>.dump.age ./hotclick-<ts>.dump.age   # o bajalo desde la web de Drive
scripts/restore.sh hotclick-<ts>.dump.age hotclick-backup.key postgresql://usuario:pass@host:5432/base_destino
```
