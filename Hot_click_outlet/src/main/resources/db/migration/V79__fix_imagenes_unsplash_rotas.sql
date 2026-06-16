-- V79: Corrige URLs de Unsplash rotas (HTTP 404) en el seed de productos demo
-- (V14 y V71). Esas fotos fueron borradas de Unsplash y el navegador las
-- bloquea con ERR_BLOCKED_BY_ORB al recibir HTML 404 donde esperaba una
-- imagen. Usa UPDATE por sku para que sea idempotente sin importar si V14/V71
-- ya se aplicaron antes (si el sku no existe, no afecta filas).
--
-- Nombres de tabla/columna en minúsculas sin comillas, según la convención
-- vigente desde V71 (HOT_CLICK_* en mayúsculas quedó obsoleto).

UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1620207418302-439b387441b0?w=400&q=80' WHERE sku = 'HC-ELEC-011';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&q=80'   WHERE sku = 'HC-ROPA-010';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&q=80' WHERE sku = 'HC-ROPA-012';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1542327897-d73f4005b533?w=400&q=80'   WHERE sku = 'HC-ROPA-017';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&q=80' WHERE sku = 'HC-HOGAR-002';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400&q=80' WHERE sku = 'HC-HOGAR-011';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&q=80' WHERE sku = 'HC-BELL-003';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80' WHERE sku = 'HC-MASC-001';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80'   WHERE sku = 'HC-MASC-002';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80' WHERE sku = 'HC-MASC-005';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1542327897-d73f4005b533?w=400&q=80'   WHERE sku = 'HC2-ROC-005';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1602910344008-22f323cc1817?w=400&q=80' WHERE sku = 'HC2-SAL-001';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&q=80' WHERE sku = 'HC2-DOR-002';
UPDATE hot_click_producto_tb SET imagen_principal_url = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80' WHERE sku = 'HC2-PRO-001';
