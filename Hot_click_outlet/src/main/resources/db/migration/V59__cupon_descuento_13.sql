-- V59: Ajusta el DEFAULT de descuento_porcentaje en cupones de 17 a 13
ALTER TABLE hot_click_cupon_tb
  ALTER COLUMN descuento_porcentaje SET DEFAULT 13;

-- Amplía código a 10 chars (antes 20 max, suficiente; solo actualiza la constraint si existe)
-- No se modifica el length ya que VARCHAR(20) tiene margen suficiente
