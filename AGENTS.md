# AGENTS.md

General project architecture, commands, and conventions live in `CLAUDE.md` (read it first).
This file only adds guidance specific to running the project inside a Cursor Cloud agent VM.

## Cursor Cloud specific instructions

### Services (local dev)

| Service | Port | Start command | Notes |
|---------|------|---------------|-------|
| PostgreSQL 16 | 5432 | `sudo pg_ctlcluster 16 main start` | Local DB, installed in the VM image. Not running on a fresh pod — start it first. |
| Spring Boot API | 8080 | `cd Hot_click_outlet && set -a && source .env && set +a && mvn spring-boot:run` | Serves `/api/**`. Health: `GET /api/health`. |
| React (Vite) | 3000 | `cd Hot_click_outlet/frontend && corepack pnpm dev` | Proxies `/api` → `http://localhost:8080`. Main URL for browsing. |

Standard build/test/lint commands are in `CLAUDE.md` and `package.json`. Backend tests: `cd Hot_click_outlet && mvn test` (H2 in-memory, no DB needed). Frontend lint: `cd Hot_click_outlet/frontend && corepack pnpm lint` (note: the repo currently has many pre-existing lint errors — lint is runnable but not clean).

### Maven

The vendored `maven/` directory only contains license stubs (no JARs), so `./maven/bin/mvn` does NOT work in the VM. Use the system `mvn` (installed in the image, Maven 3.8.7 on Java 21) instead of the `.\maven\bin\mvn` shown in `CLAUDE.md`.

### Local database & schema (IMPORTANT, non-obvious)

- DB `hotclick`, user `hotclick` / password `hotclick`, on `localhost:5432`. Both the Postgres data directory and the backend `.env` persist in the VM snapshot.
- Backend secrets live in `Hot_click_outlet/.env` (gitignored, not committed). It is **not** auto-loaded by Spring on Linux — always `set -a && source .env && set +a` before running Maven. If `.env` is missing on a fresh pod, recreate it with at least: `DB_URL=jdbc:postgresql://localhost:5432/hotclick`, `DB_USERNAME=hotclick`, `DB_PASSWORD=hotclick`, a `JWT_SECRET` (`openssl rand -base64 64`), plus the two dev overrides below.
- **The committed Flyway migrations do NOT bootstrap a fresh empty DB.** `V1__initial_schema.sql` creates quoted-UPPERCASE tables (`"HOT_CLICK_..."`) while `V2+` and all JPA entities use lowercase, so a from-scratch `flyway migrate` fails (`relation "hot_click_producto_tb" does not exist`). In production the schema pre-existed and Flyway is baselined, so this never runs there.
- For local dev the schema is generated straight from the JPA entities (the authoritative, all-lowercase source), exactly like the test profile. `Hot_click_outlet/.env` sets:
  - `SPRING_FLYWAY_ENABLED=false`
  - `SPRING_JPA_HIBERNATE_DDL_AUTO=update`
  Do NOT try to run Flyway against the local Postgres.
- Three tables have no `@Entity` mapping and must exist for the app to work fully. They are created once (they persist in the snapshot); the DDL is in `src/test/resources/test-extra-schema.sql`: `hot_click_rol_permiso_tb`, `hot_click_rate_limit_tb`, `shedlock`.
- On boot, `DataSeeder` seeds the `estado`/`rol` reference rows and the admin user, so the DB is immediately usable after schema generation.

### Seed admin & external integrations

- Seeded admin: `admin@hotclick.com` / `Admin1234!` (from `ADMIN_DEFAULT_PASSWORD`).
- With no API keys set, external integrations run in mock/simulated/disabled mode (Stripe & ONVO → MOCK, Anthropic/Claude → mock replies, WhatsApp → simulated, S3/SendGrid/Clerk/Turnstile → no-op). This is expected locally and does not block core flows.
