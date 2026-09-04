-- V122: corrige la descripcion del flag split_payments — Gift Cards ya tiene su
-- propio gate real por plan (tieneGiftCards, V121), este flag nunca lo controlo.
UPDATE hot_click_feature_flag_tb
SET descripcion = 'Pagos divididos en una misma venta'
WHERE nombre = 'split_payments';
