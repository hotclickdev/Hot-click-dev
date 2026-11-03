-- HotClick Fase 2 · semilla QA 03 (SOLO STAGING) · NO EJECUTAR sin el paso 0
-- Comprobantes fiscales FICTICIOS para el smoke SKIP LOCKED (/workspace/qa/paso0/smoke-skip-locked.md).
-- Crea 6 filas en hot_click_comprobante_fiscal_tb, ids 990001-990006, de la tienda qa-plus-ferreteria (semilla 02).
-- NO crea filas en la cola offline: esas las inserta y borra el propio smoke (fk_id_comprobante >= 990000).
-- Esquema verificado contra 916e61f0: V33__facturacion_cr.sql:24-48 (tabla), V152:7-8 (fk_id_compra),
--   V196:24-27 (índice único por pedido activo; no aplica porque fk_id_pedido es NULL), ComprobanteFiscal.java:42-80
--   (NOT NULL: fk_id_empresa, tipo, clave_numerica, estado, ambiente, fecha_emision). Cola: V78:11-23.
-- Barreras para que NINGUNO pueda ir a Hacienda (aunque una fila de cola los apunte):
--   1) estado RECHAZADO (terminal): fuera de findTodosPendientes (PENDIENTE/ENVIADO), findPendientesDeConsulta
--      y reclamarEnvio (PENDIENTE/PENDIENTE_CONFIG): ComprobanteFiscalRepository.java:37, :41, :51.
--   2) intentos_envio = 5: esos tres queries exigen intentosEnvio < 5 (:37, :42).
--   3) sin pedido ni compra: ComprobanteXmlPreparer.java:62-63 lanza "El comprobante no tiene compra ni pedido"
--      antes de firmar, así que FacturacionContingenciaService.java:147-152 nunca llega a haciendaClient.enviar.
--   4) ambiente 'STAG', clave y consecutivo no numéricos con prefijo QA (Hacienda los rechazaría por formato),
--      cédula de receptor ficticia QA y la tienda QA no tiene credenciales de Hacienda.
-- Solo INSERT idempotente (WHERE NOT EXISTS), en una transacción. Sin UPDATE ni DELETE.
-- psql "$STAGING_URL" -v ON_ERROR_STOP=1 -v entorno=staging -f 03-comprobantes-qa.sql
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
  -- Tablas y columnas requeridas
  SELECT string_agg(r.t||'.'||r.c, ', ') INTO faltan
  FROM (VALUES
    ('hot_click_comprobante_fiscal_tb','id_comprobante'),('hot_click_comprobante_fiscal_tb','fk_id_empresa'),
    ('hot_click_comprobante_fiscal_tb','fk_id_pedido'),('hot_click_comprobante_fiscal_tb','fk_id_compra'),
    ('hot_click_comprobante_fiscal_tb','tipo'),('hot_click_comprobante_fiscal_tb','clave_numerica'),
    ('hot_click_comprobante_fiscal_tb','numero_consecutivo'),('hot_click_comprobante_fiscal_tb','estado'),
    ('hot_click_comprobante_fiscal_tb','ambiente'),('hot_click_comprobante_fiscal_tb','mensaje_hacienda'),
    ('hot_click_comprobante_fiscal_tb','fecha_emision'),('hot_click_comprobante_fiscal_tb','total_neto'),
    ('hot_click_comprobante_fiscal_tb','total_impuesto'),('hot_click_comprobante_fiscal_tb','total_factura'),
    ('hot_click_comprobante_fiscal_tb','moneda'),('hot_click_comprobante_fiscal_tb','receptor_cedula'),
    ('hot_click_comprobante_fiscal_tb','receptor_tipo'),('hot_click_comprobante_fiscal_tb','receptor_nombre'),
    ('hot_click_comprobante_fiscal_tb','receptor_correo'),('hot_click_comprobante_fiscal_tb','intentos_envio'),
    ('hot_click_cola_facturacion_offline_tb','fk_id_comprobante'),('hot_click_cola_facturacion_offline_tb','fk_id_empresa'),
    ('hot_click_cola_facturacion_offline_tb','estado'),('hot_click_cola_facturacion_offline_tb','fecha_proximo_intento')
  ) r(t,c)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns x
                    WHERE x.table_schema = current_schema() AND x.table_name = r.t AND x.column_name = r.c);
  IF faltan IS NOT NULL THEN RAISE EXCEPTION 'ABORTADO: faltan tablas o columnas: %', faltan; END IF;
  -- Tienda de la 02
  IF NOT EXISTS (SELECT 1 FROM hot_click_empresa_tb WHERE slug = 'qa-plus-ferreteria')
    THEN RAISE EXCEPTION 'ABORTADO: falta la tienda qa-plus-ferreteria; corré 01 y 02 primero'; END IF;
  -- Los ids reservados no pueden estar ocupados por comprobantes que no sean QA
  SELECT count(*) INTO n FROM hot_click_comprobante_fiscal_tb
   WHERE id_comprobante BETWEEN 990001 AND 990006 AND clave_numerica NOT LIKE 'QA-FASE2-%';
  IF n > 0 THEN RAISE EXCEPTION 'ABORTADO: % comprobantes NO QA ocupan los ids 990001-990006', n; END IF;
END $$;

INSERT INTO hot_click_comprobante_fiscal_tb (id_comprobante, fk_id_empresa, fk_id_pedido, fk_id_compra, tipo,
  clave_numerica, numero_consecutivo, estado, ambiente, mensaje_hacienda, fecha_emision,
  total_neto, total_impuesto, total_factura, moneda, receptor_cedula, receptor_tipo, receptor_nombre, receptor_correo,
  intentos_envio)
SELECT 990000 + g, e.id_empresa, NULL, NULL, '04',
       'QA-FASE2-SKIP-' || lpad(g::text, 6, '0'), 'QA-' || lpad(g::text, 8, '0'), 'RECHAZADO', 'STAG',
       'QA ficticio: smoke SKIP LOCKED, nunca enviar', now() - (g || ' min')::interval,
       1000, 130, 1130, 'CRC', 'QA-0000000' || lpad(g::text, 2, '0'), '01',
       'Receptor QA ' || g, 'qa+receptor' || g || '@ejemplo.test', 5
FROM generate_series(1, 6) g
JOIN hot_click_empresa_tb e ON e.slug = 'qa-plus-ferreteria'
WHERE NOT EXISTS (SELECT 1 FROM hot_click_comprobante_fiscal_tb x
                  WHERE x.id_comprobante = 990000 + g OR x.clave_numerica = 'QA-FASE2-SKIP-' || lpad(g::text, 6, '0'));

-- Control: tienen que quedar exactamente 6
DO $$ BEGIN
  IF (SELECT count(*) FROM hot_click_comprobante_fiscal_tb WHERE clave_numerica LIKE 'QA-FASE2-SKIP-%') <> 6
    THEN RAISE EXCEPTION 'ABORTADO: no quedaron 6 comprobantes QA'; END IF;
END $$;
COMMIT;
