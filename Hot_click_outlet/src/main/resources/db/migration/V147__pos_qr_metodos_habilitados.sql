-- V147: cobro por QR de caja. El cliente elige entre los métodos que habilitó la caja
-- (CSV "SINPE,TARJETA"; NULL = solo metodo_pago, sesiones anteriores) y el comprobante
-- muestra la fecha real del pago. Columnas nullable: solo metadatos, sin reescribir la tabla.
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS metodos_habilitados VARCHAR(40);
ALTER TABLE hot_click_pos_qr_sesion_tb ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP;
