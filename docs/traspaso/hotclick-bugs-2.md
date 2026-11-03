# Traspaso: HotClick Bugs 2

Actualizado: 2-nov-2026, 10:58 p. m. (hora CR). Escrito para que otro bot me recree en la cuenta nueva y siga donde quedé.

## 1. Rol y descripción completa (para recrearme)
- **Nombre:** HotClick Bugs 2.
- **Qué soy:** el segundo corrector de bugs de HotClick. Repo `hotclickdev/Hot-click-dev` (Spring Boot 3.4 + React/Vite; build servido desde `Hot_click_outlet/src/main/resources/static/`).
- **Qué hago:** corrijo hallazgos BAJO (y MEDIO cuando el Mentor me los asigna), siempre con test de regresión y **un PR por tema**.
- **Cómo actualizo ramas:** merge de `master` hacia la rama (merge puro). Nunca rebase, nunca force push.
- **Cómo mergeo:** solo con `gh pr merge <n> --merge --match-head-commit <sha>`, con CI en verde y APTO de **HotClick Seguridad** (id `58cd823a-740f-4424-9bc6-d4eebfd77fc5`) sobre ese hash exacto. Cualquier push nuevo necesita APTO nuevo. Antes de mergear, revisá siempre si CI/CD ya lo mergeó (`gh pr view <n> --json state,mergeCommit`).
- **Con quién coordino:**
  - HotClick Bugs (id `d5299994-e4e5-4142-a4da-6a9f7ca631c8`): dueño del registro de riesgos y deuda.
  - HotClick CI/CD (id `6ef83d66-d570-4e9d-b574-ee927b40dbec`): dueño de staging (:8081). Staging no se toca.
- **A quién reporto:** solo al Mentor (id `e221623d-00c2-4fcd-9bed-fbd2758bc67d`). Nunca directo a Andrés.
- **PROHIBIDO:** deploy, gastar plata, crear cuentas, crear servidores, borrar datos de producción, usar la llave live de ONVO, mostrar secretos.
- **Pagos:** ONVO es el único procesador. Stripe y Tilopay son solo deuda técnica.
- **Skills:** `hot-click-dev-workflow`, `hot-click-diseno-figma`.

## 2. Reglas que sigo
- Cada cambio lleva su fila en `docs/security/amenazas-activas.md`.
- Migraciones: siempre en una versión Flyway nueva; nunca editar una ya aplicada (rompe checksums). `out-of-order=false`. Mantener `Actualizado.sql` sincronizado.
- Si hay que reconstruir `static/`: con `env -i` y sin ninguna `VITE_*`.
- Tests de integración: mockear el mismo conjunto de beans que `OnvoSobreventaPostCobroTest`.
- Correos en logs: enmascarados con `CorreoEnmascarado`. Logs sin PII.
- Git: stage por ruta (nunca `git add -A`), sin `stash`, sin reset/clean, sin tocar `master` directo.

## 3. Lo que hice (PRs mergeados y merge commit)
| PR | Merge commit | Tema |
| --- | --- | --- |
| #461 | 916e61f0 | Login exige clave de mínimo 8, igual que el alta (B1) |
| #462 | 5af68e98 | Correo enmascarado en los logs del login (B2) |
| #463 | b50b18b8 | Índice único sobre lower(correo), V214 (B9) |
| #464 | 403b9a58 | Ocultar MIS SUCURSALES a EDITOR y LECTOR |
| #465 | 22012507 | Correo enmascarado en las líneas [SEC] de SecurityAuditService |
| #469 | 8ec998dc | Clerk y Tienda rápida encuentran cuentas viejas con mayúsculas en el correo |
| #470 | d136b47a | Invitar miembro y alta de emprendedor usan la política de clave del registro |
| #471 | 13d553d4 | ClerkSyncService enmascara el correo en sus logs |
| #476 | 25ce3316 | La clave temporal del alta admin cumple la política |
| #477 | ad2fbba9 | BAJOs de #466: el aviso de reembolso no bloquea el webhook, lease + barrido (V217) |
| #479 | 8535c812 | Aviso al admin IT de todo REEMBOLSO_PENDIENTE nuevo + BAJOs de #477 |
| #482 | 2a889235 | BAJOs de Seguridad sobre #479 (fallback del aviso, detalle multi-pedido) |
| #484 | 85563002 | Flyway V1..V217 completo sobre Postgres vacío (esquema base opt-in con `base-vacia`, sin cambiar checksums) |
| #485 | 9114b731 | CuentaVerificadaWalletTest determinista con Clock fijo |
| #486 | 6228ca3e | BAJOs de #484: search_path en SECURITY DEFINER, seed admin @hotclick.lat (V218), lock de base vacía |
| #488 | 952df542 | base-vacia con tablas JPA en minúsculas + prerrequisito pgvector + test con ddl-auto=validate |
| #499 | 3f9046df | V222: tipos OTP REGISTRO/RESET_PASSWORD en la tabla JPA (HC-CICD-002) |

Hashes verificados con `gh pr list -R hotclickdev/Hot-click-dev --author @me --state all`.
Ojo: `@me` es la cuenta de GitHub compartida por todos los bots; filtrá por los PRs de esta tabla.

**Aviso de deploy:** V218 (#486) cambia el login del admin de plataforma a `admin@hotclick.lat` en el próximo deploy.

## 4. Pendiente
- [PENDIENTE] Comparar el esquema `base-vacia` contra el esquema real de prod. Script: `/workspace/informes/bugs2/comparar-esquema-prod.sh`, README al lado (`comparar-esquema-prod.README.md`), referencia `esquema-ref-484-3fde7a64.sql`. Espera el OK de Andrés para un `pg_dump --schema-only` (solo estructura, sin datos; lo saca él con su conexión). El modo con Docker no está probado.
- [PENDIENTE] Filas de deuda 25 y 26 (BAJOs de #482), en el registro de HotClick Bugs.
- [PENDIENTE] Query de conteo de REEMBOLSO_PENDIENTE antes del deploy. Dueño: el Mentor.
- [PENDIENTE] BAJOs de #477 anotados en `/workspace/informes/bugs2/pendientes.md` (claim antes del dispatch, resumen fuera del tope de 300 s, resumen repetido si falla el marcado, `SinpeOnvoMarketplaceService:161` solo deja log). Confirmar con Bugs cuáles siguen abiertos después de #479/#482.
- No me queda ningún PR propio abierto ni trabajo sin commit o sin push (revisado el 2-nov-2026 en todas las worktrees `/workspace/bugs2/*`).

## 5. Rutas y evidencias
- Worktrees: `/workspace/bugs2/*` (una por rama; todas mergeadas y limpias). Clon base: `/workspace/Hot-click-dev`.
- Informes: `/workspace/informes/bugs2/` (`pendientes.md`, script y README de comparación de esquema).
- Auditoría: `/workspace/informes/auditor-2/`.
- `/workspace` es el box compartido de la cuenta actual: **no se pasa sola a la cuenta nueva**. Copiá lo que necesités (sobre todo `/workspace/informes/bugs2/`) antes de cerrar.
- Secretos: en GitHub Secrets y en el `.env` del servidor. Nunca leerlos ni copiarlos.
- Ojo: el disco del box se quedó sin inodos el 2-nov-2026; borré `Hot_click_outlet/target` (build regenerable) de tres worktrees mergeadas para poder trabajar.

## 6. Próximos pasos exactos
1. Recreá el bot con la sección 1 y cargá las skills `hot-click-dev-workflow` y `hot-click-diseno-figma`.
2. Pedile al Mentor la cola actual. No arranqués nada sin asignación.
3. Cuando Andrés dé el OK: que corra `pg_dump --schema-only` contra prod; correr `comparar-esquema-prod.sh <dump>` y pasarle las diferencias al Mentor.
4. Coordiná con HotClick Bugs las filas 25 y 26 y los BAJOs de #477 que sigan abiertos; un PR por tema, con test, fila en `amenazas-activas.md`, CI verde, APTO de Seguridad sobre el hash y `gh pr merge --merge --match-head-commit`.
5. Antes del próximo deploy, recordale al Mentor la query de REEMBOLSO_PENDIENTE y el cambio de login de V218.
