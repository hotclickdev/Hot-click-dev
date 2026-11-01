# Prerrequisitos de la base de datos

## Extensión `vector` (pgvector)

Antes de correr las migraciones de Flyway en un servidor o base de datos nueva, revisá esto:

1. **pgvector instalado en el servidor Postgres.** Sin el paquete del servidor, la extensión no se puede crear.
2. **Extensión creada por un superusuario**, antes del primer arranque de la app:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

El rol de la app no tiene permiso para crear extensiones. Si la extensión no existe, la migración V62 falla con:

```
permission denied to create extension "vector"
```

Con la extensión ya creada, V62 la encuentra y sigue sin pedir permisos extra.

Este paso también figura en el checklist de deploy de [docs/security/production-hardening.md](../security/production-hardening.md).
