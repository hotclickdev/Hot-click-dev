# Backend: pendientes (copia)

Fuente: `/workspace/ramas/PENDIENTES-BACKEND-2026-10-17.md`.

## Pendientes Backend — 17-10-2026, 2:20 am CR

Repo hotclickdev/Hot-click-dev. Master `08b5291ca` (#178 mergeado, sin deploy). Prod en `d5f995d7e`.
Sin commits locales sin subir en ramas de Backend. Sin procesos Java/Postgres corriendo.
Flyway: Backend usa V180+; V182 (#194), V183 (#197), V184 (#211) aditivas.

## Revisiones pedidas
- **SINPE en la API (hecho, sin PR):** ningún endpoint devuelve número SINPE ni titular de HotClick
  (checkout-config, pedido, confirmación, properties/yml). `SinpePaymentProvider` solo genera un token interno.
  Fuera de ONVO quedan: (1) `PosQrSessionService.destinoSinpe()/numeroSinpe()` (líneas ~162/220/237) devuelve
  `sinpeNumero` con WhatsApp/teléfono del negocio → con el QR SINPE de caja oculto, que devuelva siempre "".
  (2) `SinpeController` (subir comprobante) sigue activo → apagarlo en otro PR. Ambos esperan OK de Grok Bot.
- **Frecuencia #197 (hecho):** `frecuenciaLiquidacion` (alias `frecuenciaPayout`) obligatoria, 400
  `FRECUENCIA_INVALIDA` en registro-empresa, nuevo-negocio, upgrade-emprendedor y al aceptar la tienda rápida
  desde el enlace. Scheduler sin `orElse("QUINCENAL")`: salta y WARN; admin ve «Falta frecuencia».
  V183 hace DROP DEFAULT, sin tocar filas. Consulta de solo lectura en `docs/consultas/frecuencia-quincenal-sin-elegir.sql` (no corrida en prod).
- **Skip de embeddings sin pgvector (NO hecho):** el job de las 10 pm falla porque prod no tiene la extensión
  `vector` ni `hot_click_producto_embedding_tb`. Falta: rama `fix/…` desde master; antes de correr, chequear
  `pg_extension` y la tabla; si faltan, un WARN y salir sin excepción; test de ambos casos. Cambiar la imagen
  de Postgres es decisión del dueño (DevOps y Seguridad tiene el plan alpine+pgvector+REINDEX).

## PRs
| PR | Rama | Cabeza | Estado | Falta / bloqueo |
|---|---|---|---|---|
| #194 | feat/s4-20-numero-pedido-tienda | 16211d602 | ready, verde, MERGEABLE | Nada. Va después del hotfix SINPE. |
| #197 | feat/s3-06-cuentas-onvo-frecuencia | 5907b454f | ready, verde | Sale junto con front #213 (un build). Antes: SELECT de frecuencia NULL = 0. |
| #209 | feat/s3-22-admin-onvo-negocios | 90ab05532 | draft, **Tests Java en rojo** | Ver el fallo; va después de #197. |
| #203 | feat/s4-23-ventas-semana | b8cd038db | ready, verde | Solo display; ₡700 desde config del plan. ONVO confirma cómo aplica. |
| #206 | feat/destacado-orden-admin | b342e9027 | ready, verde | Nada. |
| #207 | feat/sinpe-estado-pago-publico | 359a957a8 | ready, verde | Mejoras no bloqueantes: vencer token (30 d) y clave derivada propia. Plazo SINPE = decisión dueño. |
| #208 | feat/s4-24-mensualidad-get | 9a484a7ed | ready, verde | POST pago fail-closed hasta llaves ONVO. |
| #176 | feat/s2-multinegocio | 30c86ef9f | draft, verde | Tiene CORREO_NEGOCIO_EN_USO; revisar y sacar de draft. |
| #211 | feat/contra-entrega-negocio | da5c36b0c | draft, verde | Tiene códigos CONTRA_ENTREGA_*; revisar y sacar de draft. Cargo por negocio: monto del dueño. |
| #193 | feat/s6-18-tablero-comision | 4d066eb61 | draft | Merge de master y CI. |
| #195 | feat/s4-19-correo-registrado | 35c561e74 | draft | Merge de master y CI. |
| #198 | feat/panel-estado-tienda-config | 484040899 | draft | Merge de master y CI. |
| #201 | feat/multinegocio-plan-codigo | 9c43a362e | draft | Merge de master y CI. |
| #202 | feat/esqueletos-s5-pendientes-dueno | d80066624 | draft | 501 PENDIENTE_DECISION_DUENO hasta decisiones. |
| #155 | feat/staging-backend | 910896a7f | draft | Solo staging; seed valida contra baseline v181. Antes de ci/staging. Comentario CLIENTE→USUARIO_FINAL (líneas 11 y 21 del seed) quizá falta. |
| #157 | feat/wh1-webhook-onvo | e0102e08f | draft | Sale con su bloque nginx; llaves ONVO. |
| #160 | fix/pag9-comprobantes-privados | 25ae12f68 | draft | Bucket AWS (dueño). |

## No empezado (cortado por presupuesto)
- Costo US$3 por payout («Costo de transferencia ONVO», monto en colones de ONVO/config o «Pendiente»), fail-closed.
- Tarifas de envío (espera #163).
- QA-NEG-056 (bloquear caja si negocio no aprobado) y comisiones de `DataSeeder.java` (6 % vs 9/7/7 % y ₡700): pendientes del traspaso.

## Esperan al dueño / ONVO
Llaves sandbox ONVO (S2-01, bloquea S3-07/S3-08 y todo ONVO → 503), días de gracia, plazo SINPE,
monto de contra entrega, cómo aplica ONVO el mínimo de ₡700, bucket de PAG-9, imagen con pgvector,
reembolsos/contracargos, facturación manual, LEG-6 a LEG-11, decisiones #41/#43/#44.
