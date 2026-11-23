# E2E full-stack (Playwright contra backend real)

Workflow: `.github/workflows/e2e.yml` → job **E2E Playwright (full-stack)** (pull_request a master).
Levanta Postgres 18, el backend con perfil `dev` (Flyway + seed `catalogo-local` + `QaCuentasSeeder`
con clave QA efímera enmascarada) y Vite con proxy `/api` → backend.

| Spec | Flujo | Sin secretos | Con secretos de prueba |
|---|---|---|---|
| 01-auth | login local UI/API, 401 genérico, pk_test, registro | corre; registro = `test.fail` (bug E2E-REG-01) | `E2E_CLERK_SECRET_KEY` (sk_test_) + `E2E_CLERK_USER_EMAIL` → spec Clerk (hoy placeholder; requiere `@clerk/testing`) |
| 02-marketplace-onvo | catálogo + ficha + guest checkout | sin secretos: checkout mock de dev (sesión simulada, PENDIENTE, redirect a `/pago/exito`, no cobra). El fail-closed de producción ("ONVO no está configurado") lo cubren los tests Java `OnvoPaymentProviderModoSimuladoTest` y `OnvoArranqueProdGuardTest`, no este E2E (perfil dev) | `E2E_ONVO_SECRET_KEY` (solo `onvo_test_`; otra se descarta) → intento ONVO de prueba |
| 03-pos-turno | abrir/reutilizar turno, bodega, producto, venta efectivo, totales, cierre, 401 sin token | corre completo | — |
| 04-suscripciones | 3 planes, plan activo por cuenta QA, checkout de plan 409 sin cambiar plan | corre completo (cobro de planes fail-closed por diseño) | — |

Local:
```bash
E2E_QA_PASSWORD=<clave QA del backend> VITE_API_PROXY=http://127.0.0.1:8080 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm test:e2e:fullstack
```
El origin de `PLAYWRIGHT_BASE_URL` debe estar en `CORS_ALLOWED_ORIGINS` del backend (si no, 403).
Bug E2E-REG-01: `POST /api/auth/register` falla en BD nueva (`usuario.identificacion` NOT NULL y el registro no lo envía).
Cuando se arregle, el `test.fail` pasará a "unexpected pass" y hay que quitarlo.

## Casos QA5 / QA6 / QA7 (05–07)

| Spec | Cubre |
|---|---|
| `05-compra-qa5` | QA5-002 (bodega default vs tienda ≠ empresa 1), QA5-003 (200 y sin 500 de FK, también con el mock sin llave), login sin CSP + `/mis-pedidos` sin rebote, envío normal preseleccionado, Retiro+SINPE en Mis pedidos (solo con ONVO) |
| `06-roles-lector` | LECTOR en recolección: backend 403 con mensaje; UI no se rompe y muestra el 403 |
| `07-pos-qr-sinpe` | Turno obligatorio, confirmar-sinpe 401/403/400, historial de caja, QR vencido (necesita `E2E_DATABASE_URL`) |

Bugs reales quedan como `test.fail` con ID (E2E-CMP-01 ya arreglado por #324),
**E2E-POS-01** (QR/SINPE sin turno), **E2E-POS-03** (SINPE confirmable a mano).
Cuando se arreglen, Playwright marca el test como "passed unexpectedly": borrar el `test.fail`.
Rate limits por IP: guest-checkout 3/60s (05 usa 2 + 02 usa 1: no agregar más), login 10/60s (tokens cacheados en memoria por worker).

## Simulación final en sandbox aislado (08–11 + `scripts/e2e-sandbox.sh`)

Cubre los 7 flujos de la simulación final sobre una instancia propia (Postgres + backend `dev` + Vite), sin tocar la QA viva ni producción.

| # | Flujo | Spec |
|---|---|---|
| 1 | Alta de negocio (`/api/auth/registro-empresa`) | `08-alta-negocio-trial` |
| 2 | Pago ONVO de prueba, tarjeta 4242 (solo `onvo_test_`) | `02` (guest checkout) y `10` modo C (suscripción por el SDK web) |
| 3 | Compra en marketplace | `02`, `05` (límite guest-checkout 3/60 s por IP: no agregar más) |
| 4 | POS con cajero (rol `CAJERO`) | `09-pos-cajero` (+ `03`, `07`) |
| 5 | PYME → Negocio Plus, cobro inmediato del monto **completo**, sin prorrateo | `10-cambio-plan-completo` |
| 6 | Cancelación del trial | `08-alta-negocio-trial` |
| 7 | Aislamiento entre negocios | `11-aislamiento-negocios` |

**Decisión de negocio (Andrés, 15-nov-2026 18:59, America/Costa_Rica):** al subir a Negocio Plus se cobra el monto completo del plan nuevo, sin prorrateo, aunque el plan anterior ya se hubiera renovado. La suite solo lo verifica (`10`, modo C); no cambia ese comportamiento.

### Cómo correrlo

```bash
# Desde la raíz del repo. Requiere JDK 21, Node 22 + pnpm, psql y los binarios initdb/pg_ctl de PostgreSQL.
E2E_PG_BIN=/usr/lib/postgresql/17/bin scripts/e2e-sandbox.sh                       # suite full-stack completa
E2E_PG_BIN=... scripts/e2e-sandbox.sh "fullstack/(08|09|10|11)-"                    # solo la simulación final
```

El script: crea un datadir temporal de Postgres, arranca el backend (jar existente o `mvn -DskipTests package`), genera una clave QA efímera,
corre Playwright (Vite lo arranca `playwright.fullstack.config.ts`) y **baja solo sus propios procesos** al terminar.

| Variable | Defecto | Nota |
|---|---|---|
| `E2E_PG_PORT` / `E2E_BACKEND_PORT` / `E2E_FRONT_PORT` | 55434 / 18081 / 3100 | **Prohibidos**: 5432, 8081, 3000, 55432 (y cualquier puerto ocupado): el script aborta |
| `E2E_PG_BIN` | `pg_config --bindir` | carpeta con `initdb`, `pg_ctl`, `psql` |
| `E2E_WORKDIR` | `/tmp/e2e-sandbox` | datadir, logs y clave QA (permisos 700) |
| `E2E_JAR` | `Hot_click_outlet/target/hot-click-outlet-1.0.0.jar` | |
| `ONVO_SECRET_KEY` | — | **solo `onvo_test_`** (pasa al backend); `onvo_live_` aborta; cualquier otra se descarta |
| `ONVO_PRICE_ID_PYME`, `ONVO_PRICE_ID_NEGOCIO_PLUS`, `ONVO_PUBLISHABLE_KEY` | — | de PRUEBA de ONVO: habilitan los cobros reales de sandbox (modo C) |

Perfil `dev` (Flyway + seed `catalogo-local` + `QaCuentasSeeder` con `QA_DEFAULT_PASSWORD`). `E2E_DATABASE_URL` apunta a la BD propia (la usan `07` y `08–11` para verificar correo/aprobar el negocio nuevo).
Las specs nunca ven la llave ONVO: el script solo les pasa `E2E_ONVO_MODO=prueba` y `E2E_ONVO_PRECIOS=listo`. `abortarSiOnvoLive()` aborta si cualquier variable del entorno trae `onvo_live_`.

### Modos de cobro (spec `10`)

| Modo | Backend | Qué verifica |
|---|---|---|
| A (sin llave) | mock dev/test | negocio nuevo (aprobado + correo verificado): PYME → Plus activa el plan local, `mock:true`, sin cobro |
| B (`onvo_test_`, sin price ids) | fail-closed | `503 ONVO_PRICE_ID_FALTANTE`, el plan no cambia, nada se cobra |
| C (`onvo_test_` + price ids de prueba) | sandbox real de ONVO | PYME pagado con 4242 por el SDK web → subida a Plus: `requiere_pago` con `montoUsd` = precio completo de Plus, y la factura registrada es por ese monto. **Requiere los `ONVO_PRICE_ID_*` de prueba; sin ellos queda omitido (no se inventan cobros).** Los selectores del iframe de ONVO no se han podido validar sin esos IDs. |

Además, un negocio recién creado (PENDIENTE_APROBACION) no puede elegir plan: `409 EMPRESA_PENDIENTE_APROBACION`.

### Notas de ejecución conocidas
- `/api/auth/login` tiene 10/60 s por IP; `loginUi` (UI) no espera la ventana: `06-roles-lector` (UI) puede dar 429 si corre justo tras muchos logins.
- Con llave `onvo_test_`, `05` «Retiro + SINPE» está marcado `test.fail` y hoy pasa («Expected to fail, but passed»): quitar el `test.fail` es un cambio aparte, no de esta suite.
- Cada corrida del sandbox usa BD nueva; en una BD reutilizada el límite de bodegas del plan se agota (el helper reutiliza una bodega existente).
