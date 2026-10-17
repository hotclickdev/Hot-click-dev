-- POS para Emprendedor (auditoría consultor §1): la caja viene incluida en todos los planes.
-- max_cajas se queda en 1; no toca montos.
UPDATE hot_click_plan_tb SET tiene_pos = TRUE WHERE nombre = 'EMPRENDEDOR';
