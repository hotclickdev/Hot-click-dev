-- =============================================================
-- SEED MANUAL: 8 marcas + link a los 40 productos (HC2-...)
-- Ejecutar DESPUÉS de seed_catalogo_manual.sql
-- Pegar en Supabase SQL Editor y ejecutar todo de una vez.
-- =============================================================

-- ── 1. Insertar 8 marcas ─────────────────────────────────────────
-- El índice único parcial (V5) bloquea nombres duplicados activos.
-- ON CONFLICT (nombre_marca) WHERE fk_id_estado=1 DO NOTHING lo maneja.

INSERT INTO hot_click_marca_tb (nombre_marca, logo_url, fk_id_admin_cliente, fk_id_estado, fk_id_empresa)
VALUES
    ('TechPro CR',    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=80', 1, 1, 1),
    ('Urban Style',   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80', 1, 1, 1),
    ('Casa Deco',     'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&q=80',   1, 1, 1),
    ('FitZone CR',    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&q=80', 1, 1, 1),
    ('Glow Natural',  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80', 1, 1, 1),
    ('PetLovers CR',  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&q=80', 1, 1, 1),
    ('EduPlay',       'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&q=80',   1, 1, 1),
    ('GameArena',     'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=200&q=80', 1, 1, 1)
ON CONFLICT (nombre_marca) WHERE fk_id_estado = 1 DO NOTHING;


-- ── 2. Enlazar productos con sus marcas ──────────────────────────
DO $$
DECLARE
    m_tech   INT; m_urban  INT; m_casa   INT; m_fit    INT;
    m_glow   INT; m_pet    INT; m_edu    INT; m_game   INT;
BEGIN
    SELECT id_marca INTO m_tech  FROM hot_click_marca_tb WHERE nombre_marca = 'TechPro CR'   AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;
    SELECT id_marca INTO m_urban FROM hot_click_marca_tb WHERE nombre_marca = 'Urban Style'  AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;
    SELECT id_marca INTO m_casa  FROM hot_click_marca_tb WHERE nombre_marca = 'Casa Deco'    AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;
    SELECT id_marca INTO m_fit   FROM hot_click_marca_tb WHERE nombre_marca = 'FitZone CR'   AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;
    SELECT id_marca INTO m_glow  FROM hot_click_marca_tb WHERE nombre_marca = 'Glow Natural' AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;
    SELECT id_marca INTO m_pet   FROM hot_click_marca_tb WHERE nombre_marca = 'PetLovers CR' AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;
    SELECT id_marca INTO m_edu   FROM hot_click_marca_tb WHERE nombre_marca = 'EduPlay'      AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;
    SELECT id_marca INTO m_game  FROM hot_click_marca_tb WHERE nombre_marca = 'GameArena'    AND fk_id_empresa = 1 AND fk_id_estado = 1 LIMIT 1;

    -- Celulares y Tablets → TechPro CR
    UPDATE hot_click_producto_tb SET fk_id_marca = m_tech
    WHERE sku IN ('HC2-CEL-001','HC2-CEL-002','HC2-CEL-003','HC2-CEL-004','HC2-CEL-005');

    -- Audio y Video → TechPro CR
    UPDATE hot_click_producto_tb SET fk_id_marca = m_tech
    WHERE sku IN ('HC2-AUD-001','HC2-AUD-002','HC2-AUD-003','HC2-AUD-004');

    -- Ropa Casual → Urban Style
    UPDATE hot_click_producto_tb SET fk_id_marca = m_urban
    WHERE sku IN ('HC2-ROC-001','HC2-ROC-002','HC2-ROC-003','HC2-ROC-004','HC2-ROC-005');

    -- Calzado y Bolsos → Urban Style
    UPDATE hot_click_producto_tb SET fk_id_marca = m_urban
    WHERE sku IN ('HC2-CAL-001','HC2-CAL-002','HC2-CAL-003');

    -- Sala y Comedor + Dormitorio → Casa Deco
    UPDATE hot_click_producto_tb SET fk_id_marca = m_casa
    WHERE sku IN ('HC2-SAL-001','HC2-SAL-002','HC2-SAL-003','HC2-DOR-001','HC2-DOR-002');

    -- Gym y Fitness + Aire Libre → FitZone CR
    UPDATE hot_click_producto_tb SET fk_id_marca = m_fit
    WHERE sku IN ('HC2-GYM-001','HC2-GYM-002','HC2-GYM-003','HC2-GYM-004','HC2-AIR-001','HC2-AIR-002');

    -- Skincare + Cabello y Cuerpo → Glow Natural
    UPDATE hot_click_producto_tb SET fk_id_marca = m_glow
    WHERE sku IN ('HC2-SKN-001','HC2-SKN-002','HC2-SKN-003','HC2-CAB-001','HC2-CAB-002');

    -- Mascotas → PetLovers CR
    UPDATE hot_click_producto_tb SET fk_id_marca = m_pet
    WHERE sku IN ('HC2-PRO-001','HC2-PRO-002','HC2-GAT-001');

    -- Juguetes Educativos → EduPlay
    UPDATE hot_click_producto_tb SET fk_id_marca = m_edu
    WHERE sku IN ('HC2-EDU-001','HC2-EDU-002');

    -- Gaming → GameArena
    UPDATE hot_click_producto_tb SET fk_id_marca = m_game
    WHERE sku IN ('HC2-GAM-001','HC2-GAM-002');

END $$;


-- ── Verificar resultados ─────────────────────────────────────────
SELECT
    m.nombre_marca,
    COUNT(p.id_producto) AS productos
FROM hot_click_marca_tb m
LEFT JOIN hot_click_producto_tb p ON p.fk_id_marca = m.id_marca
WHERE m.nombre_marca IN ('TechPro CR','Urban Style','Casa Deco','FitZone CR','Glow Natural','PetLovers CR','EduPlay','GameArena')
GROUP BY m.nombre_marca
ORDER BY m.nombre_marca;
