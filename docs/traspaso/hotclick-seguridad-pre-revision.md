# Traspaso: HotClick Seguridad Pre-revisión

Actualizado: 2-nov-2026, 11:00 p. m. hora CR. Estado general: [INCOMPLETO] (trabajo vivo, sin rama de código propia).

## 1. Identidad para recrear el bot
- **Nombre:** HotClick Seguridad Pre-revisión
- **Título:** Pre-revisor de seguridad de PRs y casos P0 (etapa B) de Hot-click-dev
- **Descripción (copiar tal cual):**
  > Sos el bot 'HotClick Seguridad Pre-revisión' del repo hotclickdev/Hot-click-dev. Rol: pre-revisás cada PR abierto antes que HotClick Seguridad y le entregás un resumen con riesgos y líneas a mirar; NO das APTO (solo Seguridad, sobre hash exacto). Preparás casos de la etapa B (P0: montos y pagos, webhooks ONVO, IDOR entre tenants, auth, endpoints destructivos) del plan `plan-fase2-pruebas-seguridad.md`. Solo lectura sobre código. Español de Costa Rica. Solo reportás al Mentor; nunca le escribís a Andrés. Nunca mostrás secretos.
- **Agentes relacionados (cuenta anterior; en la nueva cambian los ids):**
  - Mentor (a quien reporta): `e221623d-00c2-4fcd-9bed-fbd2758bc67d`
  - HotClick Seguridad (a quien entrega pre-revisiones; único que da APTO): `58cd823a-740f-4424-9bc6-d4eebfd77fc5`
- **Skill a cargar:** `hot-click-dev-workflow` (reglas de git, gates de CI).

## 2. Reglas que sigue
1. Solo lectura sobre el código: no commitea código, no abre PRs de código, no mergea, no despliega, nunca toca `master`.
2. Nunca da APTO; solo resume riesgos (ALTO/MEDIO/BAJO) con archivo:línea, siempre sobre el **hash exacto** del head revisado.
3. Reporta solo al Mentor; entrega pre-revisiones a HotClick Seguridad; nunca escribe a Andrés.
4. Nunca muestra ni copia secretos; solo indica dónde están (GitHub Secrets, `.env` del servidor, archivos `.gpg` locales).
5. Git: sin `stash`, `add` por ruta, sin force push, sin rebase de lo pusheado, merge puro.
6. Casos P0 solo en local/staging con ONVO en modo test, cuentas QA sembradas, sin datos reales (Ley 8968).
7. Español de Costa Rica, fechas «30-oct-2026», horas CR.

## 3. Lo hecho
### Pre-revisión PR #460 (`fix/pago-lows-seguridad`, LOW de pagos sobre #459)
- Head revisado: `75ce0566becea85d0601d8245bd6f7156749d19a`. Enviada a HotClick Seguridad el 30-oct-2026.
- Resultado: **0 ALTO, 2 MEDIO, varios BAJO**.
  - MEDIO 1: la protección de reintento sobre `REEMBOLSO_PENDIENTE` solo se probó con mocks; Tilopay, Stripe y ONVO guardan CAPTURADO antes de confirmar el pedido. Pedir test de integración contra base real.
  - MEDIO 2: cobro parcial queda CAPTURADO completo sin reembolso parcial registrado; resolución manual del ADMIN, confirmar que no reembolse todo ni bloquee el envío de lo confirmado.
  - BAJO: ver evidencia (lectura sin lock en Stripe, etc.).
- No toca montos, conversión ₡/US$, auth ni webhook ONVO; sin endpoints nuevos ni secretos/PII en el diff.
- **Estado verificado el 2-nov-2026:** #460 está MERGED (ver nota de fecha) con head final `2d4ef8e0e7a14110ebf7760e7283fbab7a0fb373`, distinto del revisado. Después de `75ce0566` entraron `2a64974e` (cancelación parcial concurrente + alerta; reintento) y merges de master. Nota: mergedAt `2026-10-31T07:50:47Z` = 31-oct-2026, 1:50 a. m. hora CR.

### Casos P0 de la etapa B: 52 casos
- 12 montos/pagos, 11 webhooks ONVO, 12 IDOR entre tenants, 8 auth, 9 destructivos/admin. Cada caso con endpoint y archivo:línea.

## 4. Pendientes
- [PENDIENTE] Confirmar el prefijo de ruta en `CarritoController`, `EmpresaController`, `FeatureFlagController`, `CuentaTitularController` antes de correr esos casos.
- [CERRADO] #460: según el Mentor (2-nov-2026), HotClick Seguridad confirmó APTO sobre el head final 2d4ef8e0; cerrado.
- [EN CURSO] Pre-revisión del **#507** (`fix(pagos): APP_URL fail-closed en prod, sessionId enmascarado, tarjeta ONVO`, NO MERGE hasta confirmar APP_URL en Render prod); evidencia en `/workspace/hotclick/fase2/prerevision-PR507.md`.
- [PENDIENTE] Pre-revisar otros PRs abiertos: #440 (docs), #363 (propuesta de esquema), bumps #311–#317 (stripe-java 26→34 y shedlock 5→7 merecen mirada).
- [PENDIENTE] Ejecutar los 52 casos P0 solo en staging con ONVO test.

## 5. Rutas y evidencias
- En el repo (esta rama): `docs/traspaso/evidencias/hotclick-seguridad-pre-revision/prerevision-PR460.md` y `.../seguridad-P0.md` (revisados: sin secretos).
- En el box de la cuenta anterior: `/workspace/hotclick/fase2/` (mismos dos archivos), plan en `/workspace/hotclick/plan-fase2-pruebas-seguridad.md`, matriz en `/workspace/hotclick/fase2/matriz-pruebas.md`.
- Credenciales QA de staging: cifradas en `/workspace/hotclick/fase2/cuentas-qa-staging.tsv.gpg` (no se copian; pedir acceso al Mentor). Secretos ONVO/JWT: GitHub Secrets y `.env` del servidor.

## 6. Próximos pasos exactos
1. Cargar skill `hot-click-dev-workflow`; leer este archivo y las dos evidencias.
2. `gh pr view 460 --json state,headRefOid,mergedAt` y `gh pr list --state open`.
3. Pre-revisar #507 sobre su head exacto: `gh pr diff 507`, `gh pr view 507 --json headRefOid,statusCheckRollup`; resumen ALTO/MEDIO/BAJO con archivo:línea → HotClick Seguridad; avisar al Mentor.
4. (#460 cerrado con APTO sobre 2d4ef8e0; nada más que hacer.)
5. Confirmar con `git grep -n '@RequestMapping' -- '*Carrito*Controller.java' '*Empresa*Controller.java' '*FeatureFlag*Controller.java' '*CuentaTitular*Controller.java'` y actualizar `seguridad-P0.md`.
6. Cuando el Mentor autorice la etapa B, ejecutar P0 en staging (ONVO test) registrando hash, rol y evidencia por caso.
