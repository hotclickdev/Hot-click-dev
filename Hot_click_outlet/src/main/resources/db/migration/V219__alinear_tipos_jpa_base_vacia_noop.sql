-- V219 (1-nov-2026, #488): NO-OP de esquema, documental.
-- #488 solo agrega columnDefinition/JdbcTypeCode en Empresa, Marca, Pago, PaymentLog y Testimonio para que
-- JPA (ddl-auto=validate) describa los tipos que YA dejan las migraciones existentes:
--   hot_click_empresa_tb.dia_cobro          SMALLINT (int2)   -- creada así por la migración de V168
--   hot_click_marca_tb.id_marca             SERIAL   (int4)
--   hot_click_marca_tb.fk_id_admin_cliente  int4
--   hot_click_pago_tb.fk_id_usuario         int4
--   hot_click_payment_log_tb.fk_id_usuario  int4
--   hot_click_testimonio_tb.id_testimonio   SERIAL   (int4), fk_id_usuario / fk_id_producto int4
-- No hay cambio efectivo de esquema: no se altera ninguna tabla ni dato. Solo lectura de information_schema;
-- si algún tipo difiere emite NOTICE (no falla, no modifica). Idempotente.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name, c.udt_name
      FROM information_schema.columns c
     WHERE c.table_schema = current_schema()
       AND (c.table_name, c.column_name) IN (
             ('hot_click_empresa_tb', 'dia_cobro'),
             ('hot_click_marca_tb', 'id_marca'),
             ('hot_click_marca_tb', 'fk_id_admin_cliente'),
             ('hot_click_pago_tb', 'fk_id_usuario'),
             ('hot_click_payment_log_tb', 'fk_id_usuario'),
             ('hot_click_testimonio_tb', 'id_testimonio'),
             ('hot_click_testimonio_tb', 'fk_id_usuario'),
             ('hot_click_testimonio_tb', 'fk_id_producto'))
  LOOP
    IF (r.column_name = 'dia_cobro' AND r.udt_name <> 'int2')
       OR (r.column_name <> 'dia_cobro' AND r.udt_name <> 'int4') THEN
      RAISE NOTICE 'V219: %.% es % (JPA espera %)', r.table_name, r.column_name, r.udt_name,
        CASE WHEN r.column_name = 'dia_cobro' THEN 'int2' ELSE 'int4' END;
    END IF;
  END LOOP;
END $$;
