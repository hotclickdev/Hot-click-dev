---
name: gh-d5-backup
description: Verifica que el dump diario exista y no esté vacío. Usar cuando el job D5 o Daily DB Backup falle.
disable-model-invocation: true
---

# D5 — Dump presente y no vacío

Workflow: `.github/workflows/backup.yml`
Check: `D5 — Dump presente y no vacío`

## Cuándo corre

Mismo schedule que el backup. Después del pg_dump, falla si el artifact no está o pesa menos de 1 KB. Abre un issue.

## Qué hacer para que no salga en rojo

1. No inventes SUPABASE_BACKUP_URL ni SUPABASE_DB_PASSWORD. Si faltan, el dump falla en claro.
2. No restaures ese dump sobre la base de producción ni lo copies a dev (datos personales, Ley 8968).
3. S8 es el ensayo de restore en un Postgres desechable. D5 solo mira que el archivo exista.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
