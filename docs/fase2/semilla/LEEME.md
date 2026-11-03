# Semilla QA · solo staging
- **No ejecutar** hasta el OK de Andrés en el paso 0.
- Tres guardias: `-v entorno=staging` obligatorio, la BD tiene que llamarse *staging* (y no *prod*), y aborta si hay más de 50 usuarios que no sean `@ejemplo.test`.
- Solo INSERT idempotente. Las contraseñas se fijan con "recuperar contraseña" en staging y se guardan en el vault.
- Orden: 01 (usuarios) → 02 (roles, tiendas, equipo, suscripciones, bodegas, productos). Ambas verificadas contra adf05174. Planes y categorías no se crean: se usan los de Flyway.

## Antes de sembrar (en staging, solo lectura)
Columnas NOT NULL sin DEFAULT en las tablas que tocan las semillas; todas deben venir en los INSERT:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name IN ('hot_click_usuario_tb','hot_click_usuario_rol_tb','hot_click_empresa_tb','hot_click_miembro_empresa_tb',
                     'hot_click_suscripcion_tb','hot_click_bodega_tb','hot_click_producto_tb')
  AND is_nullable = 'NO' AND column_default IS NULL
ORDER BY table_name, column_name;
```
Si sale alguna columna que no está en el INSERT, no sembrar: avisar para ajustar la semilla.

## Notas
- `fk_id_estado = 1` (ACTIVO) va explícito en usuarios y roles (V1__initial_schema.sql:27 y :35 en 916e61f0; en staging la tabla viene del dump legacy).
- Rate limit de login: unas **10 por minuto por IP** (`RateLimitingFilter.java:133`, `/api/auth/login` → 10/60 s). Escalonar los logins de las 18 cuentas.
- Sin `-v entorno=staging`, ahora aborta con un mensaje claro (P3).

## Negocio activo de los dueños (P7)
La semilla solo inserta, así que no puede setear `hot_click_usuario_tb.fk_id_empresa`: queda NULL en las 18 cuentas. QA lo confirmó en PG17: hasta hacer cambiar-negocio, todo devuelve `EMPRESA_REQUERIDA`, incluso al dueño.
Después de cada login, y antes de probar, cada cuenta de dueño o de equipo llama a **cambiar-negocio** con su tienda (plus-dueno elige entre qa-plus-ferreteria y qa-tienda-b). La propuesta de QA no trae una forma segura de hacerlo solo con INSERT, por eso queda como paso manual.

## Revalidación QA (PG17, 916e61f0)
- Las 23 columnas NOT NULL que solo tenían DEFAULT en Flyway ahora van con valor explícito en la 02. También `usuario_rol.fk_id_estado = 1`.
- P4: el bloque 3b usa WHERE NOT EXISTS, así que es idempotente aunque `hot_click_usuario_rol_tb` no tenga PK.
- P6: sin `-v entorno=staging`, las dos semillas fuerzan `SELECT 1/0` y psql sale con rc=3.

## Categorías (prerrequisito)
La 02 aborta si `hot_click_categoria_tb` está vacía. En `916e61f0`, `DataSeeder.seedCategoriasDefault` (DataSeeder.java:326) no se llama, así que una BD nueva no trae categorías. Staging ya las tiene; en una BD temporal hay que crear al menos una categoría ficticia antes de correr la 02.

## usuario_rol.fk_id_estado
La 02 detecta si la columna existe (`\gset` + `\if`). Si no está, como pasa en un esquema creado por Hibernate, la omite del INSERT y muestra un AVISO.

## 03-comprobantes-qa.sql (smoke SKIP LOCKED)
- Correr después de la 01 y la 02: `psql "$STAGING_URL" -v ON_ERROR_STOP=1 -v entorno=staging -f 03-comprobantes-qa.sql`.
- Crea 6 comprobantes fiscales ficticios (ids 990001-990006) en qa-plus-ferreteria. Con esos ids, el `fk_id_comprobante >= 990000` del smoke cumple la FK de la cola.
- No pueden ir a Hacienda: están en RECHAZADO con `intentos_envio = 5`, sin pedido ni compra, en ambiente STAG, y la clave y el consecutivo llevan el prefijo QA.
- El smoke tiene que usar `<EMPRESA_QA>` = id de qa-plus-ferreteria (`SELECT id_empresa FROM hot_click_empresa_tb WHERE slug='qa-plus-ferreteria'`), porque la cola no valida que la empresa coincida con la del comprobante y conviene que sea la misma.
- La semilla no borra nada. Las 6 filas de comprobante quedan en staging; el smoke solo borra sus filas de la cola.

## qa+emprendedor sin negocio en staging (2-nov) — corregido en la 02
- Causa: `V8__saas_empresa_y_roles.sql:30-34` (master ca9bb6da) inserta HOTCLICK con `id_empresa = 1` explícito y ninguna migración hace `setval`, así que la secuencia BIGSERIAL seguía en 1. En la 02, la primera tienda (qa-emprendedor) recibió id 1, chocó con la PK y el `ON CONFLICT DO NOTHING` sin destino la descartó en silencio. Las otras 8 quedaron con ids 2..9 (igual que en `evid/staging-ca9b/negocios.txt`). Sin tienda no se crearon ni el PROPIETARIO, ni la bodega, ni QA-001/QA-002.
- Descartado: la suscripción (las otras cuentas funcionan igual sin ella), el rol EMPRENDEDOR (ya lo tiene, logins.txt) y `fk_id_empresa` (P7 vale para todas las cuentas). No hace falta ningún UPDATE.
- Arreglo: el bloque 2a de la 02 consume `nextval()` hasta pasar `max(id)` en empresa, miembro, suscripción, bodega y producto, sin setval, UPDATE ni DELETE. Además la 02 ahora aborta (rc=3) si después del INSERT no están las 9 tiendas.
- En staging basta con volver a correr la 02 (es idempotente): crea qa-emprendedor (id nuevo, probablemente el 10), su PROPIETARIO, su bodega y sus productos. En una BD nueva los ids se corren uno (qa-pyme-cafe=3): buscá siempre por slug.

## 04-pedidos-qa.sql
Dos pedidos ficticios sin pagar (PENDIENTE, metodo_pago SINPE, sin pago ni datos de ONVO, `es_prueba = true`):
- QA-F2-PED-0001: qa-pyme-cafe, qa+cliente, 2 × QA-003, San José/Escazú, GAM: ₡12 500 + ₡4 000 de envío = ₡16 500.
- QA-F2-PED-0002: qa-tienda-b, qa+consumidor, 1 × QA-007, Limón/Siquirres, FUERA_GAM: ₡3 000 + ₡5 500 = ₡8 500.
El envío se lee de `hot_click_config_envio_tb` (id = 1), así que el monto puede variar. Las tiendas se buscan por slug. Corre después de la 01 y la 02:
`psql "$STAGING_URL" -v ON_ERROR_STOP=1 -v entorno=staging -f 04-pedidos-qa.sql`

### 04 — fix ids (2-nov, tras rc=3 en staging ca9bb6da)
- Causa: `id_pedido_item` no tiene DEFAULT en staging; Hibernate lo toma de `hot_click_pedido_item_seq` (PedidoItem.java:10-13, allocationSize 50; secuencia creada en V51__sequences_batch.sql:9).
- Ahora la 04 escribe `id_pedido = nextval(pg_get_serial_sequence('hot_click_pedido_tb','id_pedido'))` (Pedido.java:20-22, IDENTITY) e `id_pedido_item = nextval('hot_click_pedido_item_seq')`.
- Antes de insertar, adelanta cada secuencia solo con nextval() hasta pasar max(id) (como el bloque 2a de la 02). Sin setval.
- Guardia: si falta cualquiera de las dos secuencias, aborta con rc=3 sin escribir nada.
- Prueba local: `bash /workspace/qa/local/prueba04.sh` (PG17 desechable, ids sin DEFAULT).
