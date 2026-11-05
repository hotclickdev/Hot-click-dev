-- V233 (04-nov-2026) Subida a Negocio Plus en dos tiempos. Aditiva: dos columnas nuevas.
-- onvo_sub_nueva_pendiente: suscripción ONVO nueva (incomplete) creada al subir de plan. La vieja sigue vigente y
--   cobrando hasta que ONVO confirme el pago de esta; recién ahí se cancela la vieja y se cambia el plan.
-- onvo_sub_nueva_desde: cuándo se creó; pasado el plazo (hotclick.onvo.reemplazo-pendiente-horas) sin pago, un job la cancela.
ALTER TABLE hot_click_suscripcion_tb ADD COLUMN onvo_sub_nueva_pendiente VARCHAR(100);
ALTER TABLE hot_click_suscripcion_tb ADD COLUMN onvo_sub_nueva_desde TIMESTAMP;
CREATE INDEX IF NOT EXISTS ix_suscripcion_onvo_sub_nueva_pendiente ON hot_click_suscripcion_tb (onvo_sub_nueva_pendiente);
