# Traspaso: HotClick Dev Marketplace

Actualizado: 2-nov-2026, ~23:00 hora CR (UTC-6). La versión anterior (26-oct) está en el historial de git de este archivo (commit `7b99c422f`).

## 1. Rol (para recrearme en otra cuenta)
- **Título:** HotClick Dev Marketplace.
- **Qué soy:** dev full stack del repo `hotclickdev/Hot-click-dev`. Arreglo hallazgos de QA, de Seguridad y de auditoría en las **áreas 2 (cuentas y roles), 3 (marketplace), 6 (chatbots y copilot) y 9 (front/UX)**. Antes también cerré área 4 (POS) y cotizaciones.
- **Stack:**
  - Backend Spring Boot 3 / Java 21 en `Hot_click_outlet/` (paquete `com.hotclick`).
  - Frontend React 19 + Vite + Tailwind v4 + pnpm en `Hot_click_outlet/frontend/`.
  - Postgres + Flyway (`Hot_click_outlet/src/main/resources/db/migration/`).
  - El build del front se versiona en `Hot_click_outlet/src/main/resources/static/`.
- **A quién reporto:** a Grok Bot. Las asignaciones vienen del **Mentor**, que habla por Andrés en las áreas 2, 3, 6 y 9.
- **Idioma:** español de Costa Rica con voseo.
- **Formato de reporte:** Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.
- **Skills que cargo:** `hot-click-dev-workflow` y `hot-click-diseno-figma` (si toco UI).

## 2. Reglas que sigo (seguilas igual)
- **PRs:** push y PRs propios permitidos, con un **máximo de 3 PRs abiertos**. Si el trabajo está incompleto, PR draft con `[INCOMPLETO]` en el título.
- **Merge a master** solo con **CI verde + APTO de HotClick Seguridad sobre el hash exacto** del head. El ciclo es:
  1. Merge puro de `origin/master` en la rama (sin rebase).
  2. Pedir re-APTO sobre el hash nuevo.
  3. `gh pr merge N -R hotclickdev/Hot-click-dev --merge --match-head-commit <hash>`.
- **Prohibido:** deploy, gastos, cuentas nuevas y servidores nuevos.
- **Git prohibido:** force push, rebase, `--no-verify`, amend, `git stash` (el stash lo comparten los bots) y `pkill`. Siempre trabajo en mi propio worktree y stageo por ruta.
- **Pagos:** ONVO es el **único procesador y es fail-closed**. Tilopay y Stripe son deuda técnica; no los toco y no toco archivos de Dev Pagos.
- **Flyway:** solo migraciones aditivas, numeradas después de V200.
- **Tests:** cada fix lleva un test de regresión (rojo antes, verde después). Corro solo los tests dirigidos, bajo `flock /workspace/hotclick/.suite-completa.lock`.
- **`static/`:** va en un commit aparte. Lo regenero con `env -i` (sin ninguna `VITE_*`). Si hay conflictos en `static/` tras un merge, lo regenero desde el código fuente ya mergeado.
- **Datos sensibles:** nada de secretos, cédulas, IBAN, SINPE ni teléfonos, ni en el chat ni en el repo. Tampoco cito IDs de staging de 8 dígitos en docs, porque `SinTelefonoPublicoEnDocsTest` los toma como teléfonos de CR. Escribí "QA staging, ver evidencia qa5".
- **Antes de push:** `gitleaks detect`. El gate E4 marca constantes con nombre de secreto (p. ej. `TOKEN`); usá nombres como `ACCESO_PRUEBA`.
- **Honestidad:** nunca digo que algo funciona sin haberlo ejecutado.
- **Mensajes:** no le escribo a Andrés en privado ni le propongo nada directo; todo pasa por el Mentor.
- **Sin CloudAgent.**

## 3. Lo que hice

### Últimos PRs (todos MERGED)
| PR | Rama | Merge | Head | Qué |
|---|---|---|---|---|
| #503 | `fix/login-empresa-activa` | `64212015b` | `50d0b162a` | Con una sola membresía, el token sale con la empresa activa por las 4 vías: password y 2FA (`AuthSupport.buildAuthResponse`), WebAuthn `loginFinish` y refresh (`AuthRefreshHandler`). Con varias membresías, selector en `CompletaTuNegocio.tsx` vía cambiar-negocio (`negociosMembresia.ts` nuevo). Toast con `saludoLogin(rol, nombre)`. Tests: `LoginEmpresaActivaUnicaMembresiaTest`, `saludoLogin.test.ts`. QA Compra la aprobó (fila 27, 3 de 3). |
| #505 | `fix/saludo-login-toast` | `b93608e1` | `895ed1e2` | `SSOComplete` usa `saludoLogin`. Test: `saludoLoginOrigenes.test.ts`. |
| #506 | `fix/sw-post-login-logout` | `61b36a382` | `8719bf50c` | El service worker aplica la versión nueva una vez después del login (lock de 5 min en sessionStorage, no con el modal de carrito abierto): `swUpdate.ts`, `main.tsx`, `useLoginFlow.ts`. `/logout` es ruta SPA pública (LogoutFilter de Spring desactivado; `SpaController`, `SecurityAuthorizationRules`, `LogoutPage`). `services/cerrarSesion.ts` `cerrarSesionCompleta` manda el Bearer explícito y espera la respuesta antes de `cerrarLocal`; lo usan /logout, `useCerrarSesion`, el logout de ProfilePage y el cierre de cuenta (ARCO). Tests: `cerrarSesion.test.ts`, `logoutPorUrl.test.ts`, `swUpdate.test.ts`, `SpaVisitanteRutasPublicasTest`. Primero salió NO APTO (MEDIO: logout sin Bearer); quedó corregido. |

También agregué filas en `docs/security/amenazas-activas.md`.

### PRs anteriores (detalle en la versión del 26-oct)
#284, #285, #292, #305, #307, #318, #321, #322, #326, #334, #337, #341 y #349, todos mergeados. En master también están #347 (`fix/login-reenviar-verificacion`) y #495 (`fix/login-verificar-codigo`), que son del área de login; verificá la autoría con `gh pr view` antes de contarlos como míos.

### Ramas de respaldo (no mergear)
- `wip/cajero-asignable` (`d5501c6b`): EN PAUSA por Andrés (CAJERO no se activa).
- `wip/billing-onvo-webhook-sonar` y `wip/billing-renovacion-v1`: solo como referencia; las reemplazó #305.

## 4. Pendientes
- [PENDIENTE] Re-QA de QA Compra de #505 y #506 cuando staging tenga `61b36a382`. Hace falta un deploy y yo no deployo.
- [PENDIENTE] BAJOs abiertos (no bloquean):
  - `roles.get(0)` en WebAuthn y en refresh: cambiarlo por `PlatformStaff.rolPrincipal`.
  - La autoselección de empresa con una membresía no valida si el negocio está suspendido.
  - Otro sitio puede forzar un logout local navegando a `/logout`.
  - El SW no reaplica la versión nueva si el usuario elige el carrito desde el modal.
  - `ErrorPublico`: TLDs y hosts.
  - `direccionFinal`.
  - Aviso de PII en la UI para el motivo libre de la resolución de sobreventa (área 9).
- [PENDIENTE] Esperando a Andrés (por medio del Mentor):
  - Precio del envío exprés.
  - B2: 2FA sin contraseña local.
  - Cupo diario del asistente: hay que llevar una propuesta antes de implementar.
  - Período gratis de 70 cupos para Emprendedor, ~3 meses, configurable.
- [PENDIENTE] Lo que quedó de la nota del 26-oct: DTO público del catálogo sin bodega; BAJOs de cotizaciones/POS (`@Size` en items, DTO en `/publica/{token}`, 404 vs 403 en turnos, etc.). Están en el historial de este archivo.

No dejé trabajo sin commitear: revisé mis worktrees `wt-empresa-activa`, `wt-saludo` y `wt-swlogout` (2-nov) y los tres están limpios, sin PRs propios abiertos.

## 5. Rutas y evidencias
- Evidencia de QA en staging (box viejo): `/workspace/hotclick-reportes/qa5/staging-64212015-20261102/`.
- Evidencia anterior en el repo: `docs/traspaso/evidencia/hotclick-dev-marketplace/` (incluye la spec de M-08).
- Amenazas activas: `docs/security/amenazas-activas.md`.
- Lock de tests: `/workspace/hotclick/.suite-completa.lock`.
- Herramientas en el box viejo: JDK 21 en `/workspace/tools/jdk21` y Maven 3.9.9 en `/workspace/tools/apache-maven-3.9.9`. En la cuenta nueva hay que volver a instalarlos.
- **Secretos:** no los tengo ni los copio. Están en GitHub Secrets del repo y en el `.env` de cada servidor; `gh` va autenticado con `repo` y `workflow`.

## 6. Próximos pasos exactos
1. `gh pr list -R hotclickdev/Hot-click-dev --state open` para confirmar que no tengo PRs propios abiertos (tope 3).
2. Cuando el Mentor confirme el deploy a staging de `61b36a382`, pedirle a QA Compra el re-QA de #505 y #506 (sesión nueva o incógnito, por el SW viejo). Si algo falla: fix con test de regresión, PR nuevo y el ciclo de merge de la sección 2.
3. Si el Mentor asigna BAJOs, empezar por `roles.get(0)` → `PlatformStaff.rolPrincipal` y la validación de negocio suspendido (un PR, con tests de regresión).
4. No implementar nada de lo que espera a Andrés hasta que el Mentor traiga la decisión.
5. Reportar siempre con el formato Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## 7. Trampas
- Master se mueve seguido: cada merge de master pide un re-APTO nuevo.
- Usuarios con sesión vieja ven el bundle viejo (el SW está en modo prompt); para QA, usá incógnito.
- Si el box se queda sin espacio o inodos, el checkout de worktrees falla: limpiá `target/` y `node_modules/` de worktrees ya mergeados.
