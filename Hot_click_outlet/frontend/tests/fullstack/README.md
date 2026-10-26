# E2E full-stack (Playwright contra backend real)

Workflow: `.github/workflows/e2e.yml` → job **E2E Playwright (full-stack)** (pull_request a master).
Levanta Postgres 18, el backend con perfil `dev` (Flyway + seed `catalogo-local` + `QaCuentasSeeder`
con clave QA efímera enmascarada) y Vite con proxy `/api` → backend.

| Spec | Flujo | Sin secretos | Con secretos de prueba |
|---|---|---|---|
| 01-auth | login local UI/API, 401 genérico, pk_test, registro | corre; registro = `test.fail` (bug E2E-REG-01) | `E2E_CLERK_SECRET_KEY` (sk_test_) + `E2E_CLERK_USER_EMAIL` → spec Clerk (hoy placeholder; requiere `@clerk/testing`) |
| 02-marketplace-onvo | catálogo + ficha + guest checkout | checkout fail-closed ("ONVO no está configurado") | `E2E_ONVO_SECRET_KEY` (solo `onvo_test_`; otra se descarta) → intento ONVO creado |
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
| `05-compra-qa5` | QA5-002 (bodega default vs tienda ≠ empresa 1), QA5-003 (sin 500 de FK; 200 solo con ONVO de prueba), login sin CSP + `/mis-pedidos` sin rebote, envío normal preseleccionado, Retiro+SINPE en Mis pedidos (solo con ONVO) |
| `06-roles-lector` | LECTOR en recolección: backend 403 con mensaje; UI no se rompe y muestra el 403 |
| `07-pos-qr-sinpe` | Turno obligatorio, confirmar-sinpe 401/403/400, historial de caja, Tilopay retirado, QR vencido (necesita `E2E_DATABASE_URL`) |

Bugs reales quedan como `test.fail` con ID: **E2E-CMP-01** (500 en checkout con sesión de negocio y bodega ajena),
**E2E-POS-01** (QR/SINPE sin turno), **E2E-POS-02** (endpoints Tilopay vivos), **E2E-POS-03** (SINPE confirmable a mano).
Cuando se arreglen, Playwright marca el test como "passed unexpectedly": borrar el `test.fail`.
Rate limits por IP: guest-checkout 3/60s (05 usa 2 + 02 usa 1: no agregar más), login 10/60s (tokens cacheados en memoria por worker).
