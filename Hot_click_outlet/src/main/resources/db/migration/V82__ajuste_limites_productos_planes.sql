-- V82: Ajusta max_productos de los 4 planes comerciales
-- Inicio Ferial: 10 | Emprendedor Pro: 50 | Comercio Expansión: 250 | Personalizado: -1 (ilimitado)

UPDATE hot_click_plan_tb SET max_productos = 10  WHERE nombre = 'Inicio Ferial';
UPDATE hot_click_plan_tb SET max_productos = 50  WHERE nombre = 'Emprendedor Pro';
UPDATE hot_click_plan_tb SET max_productos = 250 WHERE nombre = 'Comercio Expansión';
