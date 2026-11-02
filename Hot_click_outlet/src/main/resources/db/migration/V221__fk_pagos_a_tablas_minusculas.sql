-- V221: reapunta las FK de pagos que quedaron hacia las tablas viejas en mayúsculas
-- ("HOT_CLICK_PEDIDO_TB", "HOT_CLICK_USUARIO_TB", "HOT_CLICK_ESTADO_TB"), vacías en uso real,
-- hacia las tablas que usa JPA (hot_click_pedido_tb, hot_click_usuario_tb, hot_click_estado_tb).
-- Con la FK vieja todo checkout que crea el pago falla (violación de FK -> 500).
-- Idempotente y solo aditiva: cada FK se toca solo si hoy referencia la tabla en mayúsculas y
-- la tabla en minúsculas existe. Si ya apunta bien (p. ej. corregida a mano), no hace nada.
-- No borra tablas ni datos. Se agrega NOT VALID y luego se intenta VALIDATE; si hay filas
-- huérfanas queda NOT VALID (igual se aplica a filas nuevas) y se avisa con WARNING.
DO $$
DECLARE
    r RECORD;
    v_ref_actual TEXT;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('hot_click_pago_tb',             'hot_click_pago_tb_fk_id_pedido_fkey',             'fk_id_pedido',  'HOT_CLICK_PEDIDO_TB',  'hot_click_pedido_tb',  'id_pedido'),
            ('hot_click_pago_tb',             'hot_click_pago_tb_fk_id_usuario_fkey',            'fk_id_usuario', 'HOT_CLICK_USUARIO_TB', 'hot_click_usuario_tb', 'id_usuario'),
            ('hot_click_pago_tb',             'hot_click_pago_tb_fk_id_estado_fkey',             'fk_id_estado',  'HOT_CLICK_ESTADO_TB',  'hot_click_estado_tb',  'id_estado'),
            ('hot_click_payment_log_tb',      'hot_click_payment_log_tb_fk_id_usuario_fkey',     'fk_id_usuario', 'HOT_CLICK_USUARIO_TB', 'hot_click_usuario_tb', 'id_usuario'),
            ('hot_click_transaccion_pago_tb', 'hot_click_transaccion_pago_tb_fk_id_estado_fkey', 'fk_id_estado',  'HOT_CLICK_ESTADO_TB',  'hot_click_estado_tb',  'id_estado'),
            ('hot_click_webhook_event_tb',    'hot_click_webhook_event_tb_fk_id_estado_fkey',    'fk_id_estado',  'HOT_CLICK_ESTADO_TB',  'hot_click_estado_tb',  'id_estado')
        ) AS t(tabla, fk, col, ref_vieja, ref_nueva, ref_col)
    LOOP
        SELECT rt.relname INTO v_ref_actual
          FROM pg_constraint c
          JOIN pg_class st ON st.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = st.relnamespace
          JOIN pg_class rt ON rt.oid = c.confrelid
         WHERE c.contype = 'f' AND c.conname = r.fk AND st.relname = r.tabla
           AND n.nspname = current_schema();

        IF v_ref_actual IS DISTINCT FROM r.ref_vieja THEN
            CONTINUE; -- no existe o ya apunta a otra tabla: nada que hacer
        END IF;
        IF to_regclass(format('%I.%I', current_schema(), r.ref_nueva)) IS NULL THEN
            RAISE WARNING 'V221: % sigue hacia "%": no existe %', r.fk, r.ref_vieja, r.ref_nueva;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.tabla, r.fk);
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I (%I) NOT VALID',
                       r.tabla, r.fk, r.col, r.ref_nueva, r.ref_col);
        BEGIN
            EXECUTE format('ALTER TABLE %I VALIDATE CONSTRAINT %I', r.tabla, r.fk);
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE WARNING 'V221: % queda NOT VALID (filas huérfanas previas)', r.fk;
        END;
    END LOOP;
END $$;
