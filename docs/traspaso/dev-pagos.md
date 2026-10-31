# Traspaso — HotClick Dev Pagos

Actualizado: 30-oct-2026 (hora Costa Rica, UTC-6). Sin secretos ni datos personales en este documento.

## Estado

Billing ONVO listo en código y en `master`. No quedan PRs ni ramas abiertas de Dev Pagos.
Lo que falta para salir a producción es configuración y verificación (ver "Pendientes predeploy").

## PRs mergeados (merge commit)

| PR | Hash |
|----|------|
| #371 | c5b9bb06 |
| #381 | 1745d4dc |
| #374 | 3c7dfaea |
| #388 | 7bb6cf47 |
| #391 | 6e50752f |
| #397 | 55ea9313 |
| #401 | 938d983d |
| #409 | 52406b4e |
| #407 | da225cfe |

Los nueve hashes se verificaron como ancestros de `origin/master`.

## Trabajo abierto

Ninguno.

## Pendientes predeploy

1. Variables de entorno de billing (las 6):
   - `PLANES_MONEDA=usd`
   - `EMPRENDEDOR_PRECIO_MENSUAL_USD`, `PYME_PRECIO_MENSUAL_USD`, `NEGOCIO_PLUS_PRECIO_MENSUAL_USD` (los tres `*_PRECIO_MENSUAL_USD`)
   - `ONVO_PRICE_ID_PYME`
   - `ONVO_PRICE_ID_NEGOCIO_PLUS`
   Sin `PLANES_MONEDA` el ledger falla cerrado con `[ALERTA-PAGO]` (no escribe con moneda falsa).
2. `SPRING_PROFILES_ACTIVE=prod`.
3. Correr la consulta read-only predeploy (`docs/security/onvo-billing-prechequeo-sql.md`), solo SELECT.
4. Firma del webhook ONVO: **sigue sin validar** end-to-end porque falta `ONVO_TEST_WEBHOOK_SECRET`
   en el entorno de pruebas. Validarla antes de activar la llave live.

## LOWs de Seguridad sobre #407 (pendientes)

- **L1:** borrar el chequeo redundante en `PosVentaService:155-158` (ya lo cubre `BodegaTenantGuard`).
- **L2:** pasar por `BodegaTenantGuard` los oráculos restantes:
  `PosQrPedidoFactory:106-108`, `RecoleccionService:145-147` y `PedidoManualFactory:176-177`.
- **L3:** test MockMvc del oráculo de bodega (end-to-end por HTTP).
  Nota: Bugs tomó **otro** L3, el de mensajes genéricos de `RecursoNoEncontradoException`; no es este.

## Post-launch

- Alertas sobre los logs `[ALERTA-PAGO]` y `BILLING_LEDGER_OMITIDO`.
- Cobro de `PAST_DUE` (reintento/cobro de suscripciones en impago).
- B3.
- Código muerto de Stripe y Tilopay (retirar).

## Revisión de #411 (Dev Pagos 2, trial Emprendedor)

Revisado en retrospectiva (ya estaba mergeado). Sin bloqueantes: el `fechaFin` rellenado no
salta la reconsulta A5-01, no toca la idempotencia S-04 y la gracia se cuenta desde el fin del
trial. Observación BAJA: si un webhook de fallo llega mucho después del fin del trial sobre una
fila sin `fechaFin`, la gracia y el tope de INCIERTA (M1) ya corren desde el fin del trial.

## Cómo continuar

Reglas:
- Identidad de commit y merge:
  `git -c user.name='HotClick Dev Pagos' -c user.email='hotclick-dev-pagos@noreply.local' commit ...`
- `gitleaks protect --staged` antes de cada commit. Agregar archivos por ruta explícita.
- Push normal: sin force, sin rebase, sin `git stash`. Traer master con `git merge origin/master`.
- Nunca imprimir ni escribir la llave ONVO de pruebas. Contra ONVO solo GET de lectura, sin cobros.
- No tocar `render.yaml`, docker-compose, `OnvoWebhookController` ni `OnvoPaymentProvider`.
- Matar solo procesos propios, por PID exacto (nunca `pkill`).

Tests dirigidos (en segundo plano), desde `Hot_click_outlet/`:

```bash
nohup mvn -o -Dfrontend.skip=true -Dtest='OnvoJobsRenovacionNegativosTest*,OnvoBillingWebhookNegativosTest*' \
  test > /workspace/hc-tests.log 2>&1 &
sed 's/\x1b\[[0-9;]*m//g' /workspace/hc-tests.log | rg "Tests run:|BUILD"
```

La suite completa la corre CI. Si hace falta localmente, una sola vez y con lock compartido:

```bash
flock /workspace/hotclick/.suite-completa.lock mvn -o -Dfrontend.skip=true test
```

Flujo de merge: PR → CI verde (`gh pr checks N`) → Seguridad da **APTO sobre el hash exacto** del head.
Cualquier push nuevo (incluido un merge de master) invalida el APTO y hay que pedirlo de nuevo.
