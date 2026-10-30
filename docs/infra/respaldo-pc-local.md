# Respaldo diario cifrado a la PC local (INF-01)

Decisión de Andrés (textual): «Área 10 respaldo diario seria mi pc local». El respaldo diario queda **cifrado en tu PC**. No va a la nube, ni a AWS, ni a un servidor nuevo.

> **Estado:** preparado en código y probado en CI con dobles de prueba. **No está programado ni se corrió contra producción.**

## Cómo funciona

- **Pull desde la PC (recomendado):** `scripts/backup/respaldo-pc-pull.sh` corre en tu PC. Se conecta al servidor por SSH, corre `pg_dump -Fc` allá y recibe el dump por la tubería. Antes de cifrar lo valida con `pg_restore --list` y lo cifra **en tu PC** con la llave **pública**. El dump en claro nunca queda en disco. El servidor no tiene ningún acceso a tu PC.
- **Alternativa del lado del servidor:** `scripts/backup/backup-local-gpg.sh` (ya existía) deja un dump cifrado en `/var/backups/hotclick`. La PC lo trae con `RESPALDO_MODO=archivo`. Su cron es solo un ejemplo y **no está instalado** (ver `scripts/backup/README.md`).
- Junto a cada respaldo queda un `.sha256`.
- **Retención:** 14 diarios más el más reciente de cada una de las últimas 8 semanas (`RESPALDO_DIARIOS`, `RESPALDO_SEMANALES`).
- **Log sin datos personales:** solo nombre de archivo, bytes, cantidad de entradas y conteos.
- Cifrado con GPG, el mismo esquema que `backup-local-gpg.sh`, así una sola llave sirve para las dos rutas.

## 1. Preparar la PC

El repo trae `dev.ps1`, así que tu PC es Windows. Usá **WSL2 (Ubuntu)**; los scripts son bash.

```powershell
wsl --install -d Ubuntu
```

Dentro de WSL:

```bash
sudo apt-get update && sudo apt-get install -y gnupg postgresql-client openssh-client coreutils gzip
mkdir -p ~/hotclick-respaldos && chmod 700 ~/hotclick-respaldos
```

`postgresql-client` tiene que ser de la misma versión mayor que el Postgres del servidor, o más nueva, para que `pg_restore --list` lea el dump.

## 2. Llaves

### Llave GPG (cifrado)

En tu PC, no en el servidor:

```bash
gpg --full-generate-key                 # nombre: HotClick Backups, con passphrase fuerte
gpg --armor --export "HotClick Backups" > ~/hotclick-backups.pub.asc
gpg --list-keys "HotClick Backups"      # anotá el fingerprint
gpg --armor --export-secret-keys "HotClick Backups" > hotclick-backups.PRIVADA.asc
```

- Guardá la **privada** offline: una USB cifrada y una copia en papel o en otra USB, en dos lugares distintos. Después borrala del disco con `shred -u hotclick-backups.PRIVADA.asc`.
- El respaldo diario solo necesita la **pública**. Si querés que la PC no pueda descifrar nada, dejá en WSL solo la pública (`RESPALDO_GPG_PUBKEY=~/hotclick-backups.pub.asc`) y traé la privada solamente el día del simulacro.

### Llave SSH restringida (lectura del dump)

1. En tu PC: `ssh-keygen -t ed25519 -f ~/.ssh/hotclick_respaldo -N ""`.
2. En el servidor (**requiere tu OK**, ver abajo), crear un usuario sin privilegios (por ejemplo `respaldo`) y en su `authorized_keys` amarrar la llave a **un solo comando**:

```
command="docker exec hotclick-postgres sh -c 'pg_dump -U \"$POSTGRES_USER\" -d hotclick -Fc'",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA... respaldo-pc
```

Así esa llave solo puede producir el dump. Para correr `docker exec` el usuario necesita estar en el grupo `docker`. Si eso te parece demasiado permiso, usá el modo `archivo`: amarrás la llave a `cat` del último `.gpg` en `/var/backups/hotclick` y el usuario no toca Docker.

## 3. Correr a mano

```bash
export RESPALDO_SSH_DESTINO="respaldo@<SERVIDOR>"      # placeholder; no lo pongás en el repo
export RESPALDO_SSH_LLAVE=~/.ssh/hotclick_respaldo
export RESPALDO_GPG_RECIPIENT="<FINGERPRINT>"   # 40 hex sin espacios; si no, el script se niega
export RESPALDO_GPG_PUBKEY=~/hotclick-backups.pub.asc
export RESPALDO_DIR=~/hotclick-respaldos
./scripts/backup/respaldo-pc-pull.sh
# Modo alternativo: RESPALDO_MODO=archivo (trae el .gpg que dejó el servidor)
```

Conviene guardar esas variables en `~/.config/hotclick-respaldo.env` (permisos `600`) y cargarlas desde el programador.

## 4. Programar en la PC

**Programador de tareas de Windows** (diaria, 12:30 a. m. hora CR):

```powershell
$a = New-ScheduledTaskAction -Execute "wsl.exe" -Argument '-d Ubuntu -- bash -lc "set -a; . ~/.config/hotclick-respaldo.env; ~/Hot-click-dev/scripts/backup/respaldo-pc-pull.sh >> ~/hotclick-respaldos/respaldo.log 2>&1"'
$t = New-ScheduledTaskTrigger -Daily -At 00:30
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun
Register-ScheduledTask -TaskName "HotClick respaldo diario" -Action $a -Trigger $t -Settings $s
```

- `-StartWhenAvailable` corre el respaldo apenas prendás la PC si estaba apagada a esa hora.
- `-WakeToRun` la despierta si está suspendida. Para eso tiene que estar activado «Permitir temporizadores de reactivación» en el plan de energía.

**Linux/cron** (si algún día usás Linux):

```cron
30 0 * * * set -a; . $HOME/.config/hotclick-respaldo.env; $HOME/Hot-click-dev/scripts/backup/respaldo-pc-pull.sh >> $HOME/hotclick-respaldos/respaldo.log 2>&1
```

## 5. Restaurar

`scripts/backup/restaurar-respaldo.sh` necesita la llave **privada** importada en esa máquina.

```bash
# Simulacro (por defecto): verifica sha256, descifra y corre pg_restore --list. No toca ninguna base.
./scripts/backup/restaurar-respaldo.sh --archivo ~/hotclick-respaldos/hotclick-AAAAMMDDTHHMMSSZ.dump.gz.gpg --destino hotclick_drill

# Aplicar en una base de prueba
createdb hotclick_drill
./scripts/backup/restaurar-respaldo.sh --archivo <archivo> --destino hotclick_drill --ejecutar
```

Contraseña: nunca en la URL (queda en el historial y en `ps`). Usá `PGPASSFILE` (por defecto `~/.pgpass`, `chmod 600`, línea `localhost:55432:hotclick_drill:postgres:<temporal>`).

- **Allowlist de destino**: solo acepta host `localhost`, `127.0.0.1`, `::1` o socket unix local (sin host o ruta `/…`; también se mira `PGHOST`/`PGHOSTADDR`), y una base cuyo nombre contenga `restore`, `drill` o `test`. Entiende nombre simple, `postgresql://…` y DSN `key=value`. Todo lo demás (IP o host interno, `hotclick` a secas, varios hosts, `service=`) **se rechaza**.
- `--permitir-prod` es la única excepción y es **PELIGROSA**: saltea la allowlist y `pg_restore --clean` borra y reemplaza los objetos del destino. Solo ante un desastre real y con OK explícito de Andrés.
- El dump descifrado no se escribe a disco: se descifra en streaming (una pasada para `--list`, otra para restaurar). Solo el TOC (sin filas) va a un tmp `700` que borra el trap (también con Ctrl-C/TERM). Si el proceso muere con `kill -9` (SIGKILL) ese tmp puede quedar: borrá tus `/tmp/tmp.*`.
- Si el checksum no coincide o el archivo no se puede descifrar, para con error.

## 6. Simulacro de restauración (mensual)

1. Traé la privada offline e importala: `gpg --import`.
2. Levantá un Postgres desechable en tu PC: `docker run --rm -d --name drill -e POSTGRES_PASSWORD=<temporal> -p 55432:5432 postgres:<misma versión>`.
3. Corré ``createdb -h localhost -p 55432 -U postgres hotclick_drill` y `restaurar-respaldo.sh --destino "postgresql://postgres@localhost:55432/hotclick_drill" --ejecutar` (contraseña por `PGPASSFILE`)` con el respaldo más reciente.
4. Revisá conteos básicos (usuarios, pedidos, productos) **sin copiar datos a otro lado** (Ley 8968).
5. Bajá el contenedor, borrá la privada del llavero (`gpg --delete-secret-keys`) y anotá fecha y resultado en el checklist de lanzamiento.

## Pruebas

`node --test scripts/eng-gates/respaldo-pc-local.test.mjs` corre en CI dentro de *Eng gates — selftest* (que ya corre `scripts/eng-gates/*.test.mjs`). Usa `pg_dump` y `pg_restore` simulados y una llave GPG de prueba efímera. Cubre:
- ida y vuelta de cifrado y descifrado;
- rechazo de un dump inválido;
- retención de 14 diarios más 8 semanales;
- allowlist de destino (URLs y DSN remotos o sin base de restore se rechazan);
- `pg_restore --list` que cierra temprano (simulado leyendo 5 bytes) sin SIGPIPE, y fingerprint inválido;
- archivo corrupto, tanto por checksum como por descifrado.

## Requiere OK de Andrés (no ejecutado)

- **Instalar el cron del servidor** (`backup-local-gpg.sh`, ejemplo en `scripts/backup/README.md`). También crear el usuario `respaldo` y su `authorized_keys` restringido.
- **Aplicar el parche de `backup.yml`** (`docs/infra/backup-yml-pc-local.patch`). Hoy ese workflow sube a GitHub un dump **sin cifrar** como artifact. Aplicarlo requiere un token con scope `workflow`.
- **Probar `rollback.sh` en staging** (`Hot_click_outlet/scripts/lightsail/rollback.sh`).
