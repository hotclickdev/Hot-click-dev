-- HotClick Fase 2 · semilla QA 04 (SOLO STAGING) · dos pedidos ficticios QA, SIN pagar y sin datos de ONVO
-- Verificada contra master ca9bb6da (model/Pedido.java, model/PedidoItem.java, Flyway V1:605, V11, V156, V194, V212, V213,
-- service/envio/DestinoEnvio.java, service/envio/ZonaEnvio.java, utils/Constants.java). Requiere 01 y 02 antes.
-- Las tiendas se buscan por slug (en staging qa-pyme-cafe=2 y qa-tienda-b=4, pero no se asume el id).
-- Solo INSERT idempotente (WHERE NOT EXISTS). Sin UPDATE ni DELETE. Sin fila de pago, sin grupo_pago, sin token ONVO.
-- psql "$STAGING_URL" -v ON_ERROR_STOP=1 -v entorno=staging -f 04-pedidos-qa.sql
\set ON_ERROR_STOP on
\if :{?entorno}
\else
  \echo 'ABORTADO: falta -v entorno=staging'
  SELECT 1/0 AS falta_entorno;
\endif
SELECT CASE WHEN :'entorno' = 'staging' THEN 1 ELSE 1/0 END AS guardia_entorno;
BEGIN;
DO $$
DECLARE db text := current_database(); n bigint; faltan text;
BEGIN
  IF db !~* 'staging' OR db ~* 'prod' THEN RAISE EXCEPTION 'ABORTADO: BD "%" no parece staging', db; END IF;
  SELECT count(*) INTO n FROM hot_click_usuario_tb WHERE correo NOT LIKE '%@ejemplo.test';
  IF n > 50 THEN RAISE EXCEPTION 'ABORTADO: % usuarios no ficticios, posible producción', n; END IF;
  -- Columnas que esta semilla escribe (tablas y columnas de master)
  SELECT string_agg(c.tb||'.'||c.col, ', ') INTO faltan FROM (VALUES
    ('hot_click_pedido_tb','numero_pedido'),('hot_click_pedido_tb','fecha_pedido'),('hot_click_pedido_tb','subtotal'),
    ('hot_click_pedido_tb','descuento_total'),('hot_click_pedido_tb','aplica_impuesto'),('hot_click_pedido_tb','monto_impuesto'),
    ('hot_click_pedido_tb','total_pedido'),('hot_click_pedido_tb','costo_envio'),('hot_click_pedido_tb','costo_total_productos'),
    ('hot_click_pedido_tb','utilidad_bruta'),('hot_click_pedido_tb','origen'),('hot_click_pedido_tb','estado_pedido'),
    ('hot_click_pedido_tb','metodo_pago'),('hot_click_pedido_tb','metodo_envio'),('hot_click_pedido_tb','notas'),
    ('hot_click_pedido_tb','factura_generada'),('hot_click_pedido_tb','factura_enviada_whatsapp'),('hot_click_pedido_tb','es_prueba'),
    ('hot_click_pedido_tb','gift_card_monto'),('hot_click_pedido_tb','cliente_nombre'),('hot_click_pedido_tb','direccion_entrega'),
    ('hot_click_pedido_tb','destino_provincia'),('hot_click_pedido_tb','destino_canton'),('hot_click_pedido_tb','envio_zona'),
    ('hot_click_pedido_tb','envio_monto_zona'),('hot_click_pedido_tb','fk_id_empresa'),('hot_click_pedido_tb','fk_id_usuario_final'),
    ('hot_click_pedido_tb','fk_id_bodega'),('hot_click_pedido_tb','fk_id_estado'),
    ('hot_click_pedido_item_tb','cantidad'),('hot_click_pedido_item_tb','precio_unitario_momento'),
    ('hot_click_pedido_item_tb','costo_unitario_momento'),('hot_click_pedido_item_tb','descuento_aplicado'),
    ('hot_click_pedido_item_tb','subtotal_item'),('hot_click_pedido_item_tb','utilidad_item'),('hot_click_pedido_item_tb','sin_inventario'),
    ('hot_click_pedido_item_tb','fk_id_pedido'),('hot_click_pedido_item_tb','fk_id_producto'),('hot_click_pedido_item_tb','fk_id_estado'),
    ('hot_click_config_envio_tb','monto_gam_crc'),('hot_click_config_envio_tb','monto_fuera_gam_crc')) c(tb, col)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns i WHERE i.table_schema = current_schema()
                    AND i.table_name = c.tb AND i.column_name = c.col);
  IF faltan IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO: faltan tablas o columnas: %', faltan; END IF;
  -- Zona: tarifas de la plataforma (V212, fila única id=1)
  IF NOT EXISTS (SELECT 1 FROM hot_click_config_envio_tb WHERE id = 1) THEN
    RAISE EXCEPTION 'ABORTADO: falta la zona (hot_click_config_envio_tb id=1, V212)'; END IF;
  -- Tiendas, bodega, producto y clientes QA
  SELECT string_agg(x.slug||'/'||x.sku, ', ') INTO faltan FROM (VALUES ('qa-pyme-cafe','QA-003'),('qa-tienda-b','QA-007')) x(slug, sku)
  WHERE NOT EXISTS (SELECT 1 FROM hot_click_empresa_tb e
                    JOIN hot_click_bodega_tb b ON b.fk_id_empresa = e.id_empresa AND b.nombre_bodega = 'QA Central'
                    JOIN hot_click_producto_tb p ON p.fk_id_empresa = e.id_empresa AND p.sku = x.sku
                    WHERE e.slug = x.slug);
  IF faltan IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO: falta tienda, bodega QA Central o producto: % (corré 02)', faltan; END IF;
  IF (SELECT count(*) FROM hot_click_usuario_tb WHERE correo IN ('qa+cliente@ejemplo.test','qa+consumidor@ejemplo.test')) <> 2 THEN
    RAISE EXCEPTION 'ABORTADO: faltan qa+cliente / qa+consumidor (corré 01)'; END IF;
  -- Los números QA no pueden estar tomados por pedidos ajenos
  IF EXISTS (SELECT 1 FROM hot_click_pedido_tb p JOIN hot_click_empresa_tb e ON e.id_empresa = p.fk_id_empresa
             WHERE p.numero_pedido IN ('QA-F2-PED-0001','QA-F2-PED-0002') AND e.slug NOT IN ('qa-pyme-cafe','qa-tienda-b')) THEN
    RAISE EXCEPTION 'ABORTADO: numero_pedido QA-F2-PED-000N usado por una tienda no QA'; END IF;
END $$;

-- Datos de los dos pedidos. Destinos del catálogo DestinoEnvio.java (CANTONES) y zona según DestinoEnvio.zona():
--   ENVIO_NORMAL_GAM -> GAM (San José/Escazú es GAM en ZonaEnvio.CANTONES_GAM)
--   ENVIO_NORMAL_FUERA_GAM -> FUERA_GAM (Limón/Siquirres no es GAM)
-- Estado PENDIENTE (Constants.PEDIDO_PENDIENTE) = sin pagar; metodo_pago SINPE (Constants.PROVEEDOR_SINPE), sin pago ni ONVO.
CREATE TEMP TABLE qa_ped ON COMMIT DROP AS
SELECT x.numero, e.id_empresa AS emp, b.id_bodega AS bod, u.id_usuario AS cli, u.nombre||' '||u.apellido_paterno AS cli_nombre,
       p.id_producto AS prod, p.precio_venta::int AS precio, p.precio_compra::int AS costo, x.cant,
       x.metodo_envio, x.zona, x.prov, x.canton,
       CASE x.zona WHEN 'GAM' THEN c.monto_gam_crc ELSE c.monto_fuera_gam_crc END AS envio
FROM (VALUES
  ('QA-F2-PED-0001','qa-pyme-cafe','QA-003',2,'qa+cliente@ejemplo.test','ENVIO_NORMAL_GAM','GAM','San José','Escazú'),
  ('QA-F2-PED-0002','qa-tienda-b','QA-007',1,'qa+consumidor@ejemplo.test','ENVIO_NORMAL_FUERA_GAM','FUERA_GAM','Limón','Siquirres')
) x(numero, slug, sku, cant, correo, metodo_envio, zona, prov, canton)
JOIN hot_click_empresa_tb e ON e.slug = x.slug
JOIN hot_click_bodega_tb b ON b.fk_id_empresa = e.id_empresa AND b.nombre_bodega = 'QA Central'
JOIN hot_click_producto_tb p ON p.fk_id_empresa = e.id_empresa AND p.sku = x.sku
JOIN hot_click_usuario_tb u ON u.correo = x.correo
CROSS JOIN (SELECT monto_gam_crc, monto_fuera_gam_crc FROM hot_click_config_envio_tb WHERE id = 1) c;
DO $$ BEGIN
  IF (SELECT count(*) FROM qa_ped) <> 2 THEN RAISE EXCEPTION 'ABORTADO: datos de pedido incompletos (%/2)', (SELECT count(*) FROM qa_ped); END IF;
END $$;

-- Ids (fix 2-nov, CI/CD rc=3 en ca9bb6da: "null value in column id_pedido_item"). En staging id_pedido_item no tiene
-- DEFAULT: Hibernate lo saca de una secuencia propia. Se asignan los dos ids con nextval de la secuencia de la entidad:
--   Pedido:     @GeneratedValue(strategy = GenerationType.IDENTITY)  model/Pedido.java:20-22  -> secuencia de la columna id_pedido
--   PedidoItem: @SequenceGenerator(sequenceName = "hot_click_pedido_item_seq", allocationSize = 50)  model/PedidoItem.java:10-13
--               (creada en V51__sequences_batch.sql:9, INCREMENT BY 50)
SELECT coalesce(pg_get_serial_sequence('hot_click_pedido_tb','id_pedido'), '') AS seq_ped,
       coalesce((SELECT 'public.hot_click_pedido_item_seq' WHERE to_regclass('hot_click_pedido_item_seq') IS NOT NULL), '') AS seq_item \gset
DO $$
DECLARE r record; v bigint; mx bigint; i int;
  sp text := pg_get_serial_sequence('hot_click_pedido_tb','id_pedido');
  si text := (SELECT 'public.hot_click_pedido_item_seq' WHERE to_regclass('hot_click_pedido_item_seq') IS NOT NULL);
BEGIN
  -- (las variables psql no se expanden dentro del bloque DO; se recalculan aquí)
  IF sp IS NULL THEN RAISE EXCEPTION 'ABORTADO: falta la secuencia de hot_click_pedido_tb.id_pedido'; END IF;
  IF si IS NULL THEN RAISE EXCEPTION 'ABORTADO: falta la secuencia hot_click_pedido_item_seq (V51)'; END IF;
  -- Igual que el bloque 2a de la 02: solo nextval() hasta pasar max(id); sin setval, UPDATE ni DELETE.
  FOR r IN SELECT * FROM (VALUES (sp,'hot_click_pedido_tb','id_pedido'),
                                 (si,'hot_click_pedido_item_tb','id_pedido_item')) t(sq, tb, col) LOOP
    EXECUTE format('SELECT coalesce(max(%I),0) FROM %I', r.col, r.tb) INTO mx;
    i := 0;
    LOOP
      EXECUTE format('SELECT last_value + CASE WHEN is_called THEN 1 ELSE 0 END FROM %s', r.sq) INTO v;
      EXIT WHEN v > mx;
      PERFORM nextval(r.sq); i := i + 1;
      IF i > 100000 THEN RAISE EXCEPTION 'ABORTADO: secuencia % muy atrás de max(%)=%', r.sq, r.col, mx; END IF;
    END LOOP;
    IF i > 0 THEN RAISE NOTICE 'AVISO: % avanzada % veces (max %)', r.sq, i, mx; END IF;
  END LOOP;
END $$;

-- Montos en colones enteros (₡). subtotal = precio × cantidad; total = subtotal + envío; IVA 0 (aplica_impuesto false).
INSERT INTO hot_click_pedido_tb (id_pedido, numero_pedido, fecha_pedido, subtotal, descuento_total, aplica_impuesto, monto_impuesto,
  total_pedido, costo_envio, costo_total_productos, utilidad_bruta, origen, estado_pedido, metodo_pago, metodo_envio, notas,
  factura_generada, factura_enviada_whatsapp, es_prueba, gift_card_monto, cliente_nombre, direccion_entrega,
  destino_provincia, destino_canton, envio_zona, envio_monto_zona, fk_id_empresa, fk_id_usuario_final, fk_id_bodega, fk_id_estado)
SELECT nextval(:'seq_ped'), q.numero, now(), q.precio*q.cant, 0, false, 0,
       q.precio*q.cant + q.envio, q.envio, q.costo*q.cant, (q.precio-q.costo)*q.cant, 'ONLINE', 'PENDIENTE', 'SINPE', q.metodo_envio,
       'Pedido ficticio QA Fase 2 (staging). No cobrar ni despachar.',
       false, false, true, 0, q.cli_nombre, 'Dirección QA ficticia 0, '||q.canton||', '||q.prov,
       q.prov, q.canton, q.zona, q.envio, q.emp, q.cli, q.bod, 1
FROM qa_ped q
WHERE NOT EXISTS (SELECT 1 FROM hot_click_pedido_tb x WHERE x.numero_pedido = q.numero);

INSERT INTO hot_click_pedido_item_tb (id_pedido_item, cantidad, precio_unitario_momento, costo_unitario_momento, descuento_aplicado,
  subtotal_item, utilidad_item, sin_inventario, fk_id_pedido, fk_id_producto, fk_id_estado)
SELECT nextval(:'seq_item'), q.cant, q.precio, q.costo, 0, q.precio*q.cant, (q.precio-q.costo)*q.cant, false, p.id_pedido, q.prod, 1
FROM qa_ped q JOIN hot_click_pedido_tb p ON p.numero_pedido = q.numero
WHERE NOT EXISTS (SELECT 1 FROM hot_click_pedido_item_tb i WHERE i.fk_id_pedido = p.id_pedido AND i.fk_id_producto = q.prod);

DO $$ BEGIN
  IF (SELECT count(*) FROM hot_click_pedido_tb WHERE numero_pedido IN ('QA-F2-PED-0001','QA-F2-PED-0002')
        AND estado_pedido = 'PENDIENTE' AND es_prueba) <> 2
  OR (SELECT count(*) FROM hot_click_pedido_item_tb i JOIN hot_click_pedido_tb p ON p.id_pedido = i.fk_id_pedido
        WHERE p.numero_pedido IN ('QA-F2-PED-0001','QA-F2-PED-0002')) <> 2 THEN
    RAISE EXCEPTION 'ABORTADO: conteo final distinto de 2 pedidos / 2 ítems';
  END IF;
END $$;
SELECT p.numero_pedido, e.slug, p.fk_id_empresa, p.estado_pedido, p.metodo_pago, p.destino_provincia, p.destino_canton,
       p.envio_zona, p.subtotal AS subtotal_crc, p.costo_envio AS envio_crc, p.total_pedido AS total_crc
FROM hot_click_pedido_tb p JOIN hot_click_empresa_tb e ON e.id_empresa = p.fk_id_empresa
WHERE p.numero_pedido IN ('QA-F2-PED-0001','QA-F2-PED-0002') ORDER BY 1;
COMMIT;
