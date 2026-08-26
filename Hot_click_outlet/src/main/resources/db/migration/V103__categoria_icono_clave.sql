-- V103: categoria.icono deja de ser emoji y pasa a clave estable.
-- Idempotente: solo toca filas que aún tienen el valor legado.

UPDATE hot_click_categoria_tb SET icono = 'ropa'    WHERE icono = '👕';
UPDATE hot_click_categoria_tb SET icono = 'calzad'  WHERE icono = '👟';
UPDATE hot_click_categoria_tb SET icono = 'videoj'  WHERE icono = '🎮';
UPDATE hot_click_categoria_tb SET icono = 'tecnol'  WHERE icono = '📱';
UPDATE hot_click_categoria_tb SET icono = 'comput'  WHERE icono IN ('🖥️', '🖥');
UPDATE hot_click_categoria_tb SET icono = 'mueble'  WHERE icono = '🪑';
UPDATE hot_click_categoria_tb SET icono = 'deport'  WHERE icono IN ('🏋️', '🏋');
UPDATE hot_click_categoria_tb SET icono = 'juguet'  WHERE icono = '🧸';
UPDATE hot_click_categoria_tb SET icono = 'auto'    WHERE icono = '🚗';
UPDATE hot_click_categoria_tb SET icono = 'belleza' WHERE icono = '💄';
UPDATE hot_click_categoria_tb SET icono = 'hogar'   WHERE icono IN ('🍽️', '🍽');
UPDATE hot_click_categoria_tb SET icono = 'libros'  WHERE icono = '📚';
UPDATE hot_click_categoria_tb SET icono = 'musica'  WHERE icono = '🎵';
UPDATE hot_click_categoria_tb SET icono = 'jardin'  WHERE icono = '🌿';
UPDATE hot_click_categoria_tb SET icono = 'mascot'  WHERE icono = '🐾';
UPDATE hot_click_categoria_tb SET icono = 'arte'    WHERE icono = '🎨';
UPDATE hot_click_categoria_tb SET icono = 'joyería' WHERE icono = '💍';
UPDATE hot_click_categoria_tb SET icono = 'herram'  WHERE icono = '🔧';
UPDATE hot_click_categoria_tb SET icono = 'regal'   WHERE icono = '🎁';
UPDATE hot_click_categoria_tb SET icono = 'cuidado' WHERE icono = '🧴';
