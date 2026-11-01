-- V219 (01-nov-2026) QA3-023: plan elegido sin pago confirmado. La suscripción conserva el plan vigente en
-- fk_id_plan y el nuevo queda acá hasta que el webhook ONVO verificado lo aplica. Aditiva.
ALTER TABLE hot_click_suscripcion_tb ADD COLUMN IF NOT EXISTS fk_id_plan_pendiente BIGINT
    REFERENCES hot_click_plan_tb(id_plan);
