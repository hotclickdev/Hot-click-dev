-- P-01: plazo interno de HotClick para el SINPE del marketplace por ONVO. ONVO no define vencimiento del
-- payment intent; al cumplirse este plazo HotClick lo cancela (POST /cancel) y libera stock solo si un GET
-- confirma canceled. Aditiva: columna nueva nullable, no toca filas existentes.
ALTER TABLE hot_click_pago_tb ADD COLUMN IF NOT EXISTS plazo_interno_sinpe TIMESTAMP NULL;
