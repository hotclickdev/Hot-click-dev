# DevOps y Seguridad: pausa (copia)

Fuente: `/workspace/infra/PAUSA-2026-10-17.md`. Los planes de infra (`PAG-9-bucket-privado.md`, `S1-62-puerto-8080.md`, `S1-63-backup-cifrado-drive.md`, `S1-65-rotacion-logs.md`, `STG-baseline-esquema.md`, `WH-1-nginx-webhook-onvo.md`, `BK-cifrado-gpg-publica.md`) siguen en `/workspace/infra/` de la máquina compartida.

## DevOps y Seguridad: en pausa desde el 17-oct 2:14 am CR (aviso del dueño vía Grok Bot)

Pendiente al retomar:
- Revisar el diff final de ci/staging (7255b56ae, 958facbf1, 77d9c9ff2) en GitHub antes del merge. Ya aprobé el baseline v181 en local.
- No borrar /workspace/infra/gpg-backup/ hasta que Grok Bot confirme que el dueño guardó la llave privada.
- Decisión del dueño: pgvector en prod. Si se aprueba: imagen alpine con pgvector compilado (misma libc), backup cifrado, CREATE EXTENSION, REINDEX de índices de texto, rollback a la imagen anterior.
- Mejoras sin bloqueo en #207: que el token venza y una clave derivada propia en vez de jwt.secret.
- Historias S1-64, S1-66 y S1-68 sin empezar; sprints 2 a 6 en pausa.
- Pendientes del dueño (ya en la lista de Grok Bot): PIPE-1, permiso workflow, AWS (PAG-9 bucket, SG del puerto 8080), DMARC/SendGrid, chmod 600 de hotclick.conf.bak.
- Para la lista del dueño: el número SINPE sigue en el historial del repo público, sin reescribir; decidir si se cambia.
