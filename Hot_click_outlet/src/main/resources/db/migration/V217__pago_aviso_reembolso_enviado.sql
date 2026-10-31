-- V217 (31-oct-2026): BAJOs de #466 sobre el aviso al admin por REEMBOLSO_PENDIENTE.
-- aviso_reembolso_admin_en pasa a ser la marca del claim (lease); el envío confirmado queda en
-- aviso_reembolso_admin_enviado_en y los intentos en aviso_reembolso_admin_intentos (tope del barrido).
-- aviso_reembolso_resumen_pendiente: REEMBOLSO_PENDIENTE anteriores a V217 que nunca se avisaron; van en UN
-- correo resumen en el primer barrido (decisión del Mentor, punto 4 de #477), no en avisos individuales.
-- Aditiva. Backfill: lo que ya tenía marca se considera enviado, así el barrido no reenvía avisos viejos.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS aviso_reembolso_admin_enviado_en TIMESTAMP;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS aviso_reembolso_admin_intentos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS aviso_reembolso_resumen_pendiente BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE hot_click_pago_tb
   SET aviso_reembolso_admin_enviado_en = aviso_reembolso_admin_en
 WHERE aviso_reembolso_admin_en IS NOT NULL AND aviso_reembolso_admin_enviado_en IS NULL;
UPDATE hot_click_pago_tb
   SET aviso_reembolso_resumen_pendiente = TRUE
 WHERE estado_pago = 'REEMBOLSO_PENDIENTE' AND aviso_reembolso_admin_en IS NULL
   AND aviso_reembolso_admin_enviado_en IS NULL;
