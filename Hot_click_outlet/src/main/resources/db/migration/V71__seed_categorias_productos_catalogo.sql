-- V71: 7 categorías padre + 14 subcategorías + 40 productos con imágenes

-- ── 1. Categorías padre ──────────────────────────────────────────
INSERT INTO hot_click_categoria_tb
    (nombre_categoria, descripcion, imagen_url, orden_display, fk_id_admin_cliente, fk_id_estado, fk_id_empresa)
VALUES
    ('Electrónica y Gadgets',     'Celulares, audio, video y accesorios tech',     'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&q=80', 10, 1, 1, 1),
    ('Moda y Estilo',             'Ropa, calzado y bolsos de moda',                'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80', 11, 1, 1, 1),
    ('Hogar y Decoración',        'Muebles, deco y artículos del hogar',           'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',   12, 1, 1, 1),
    ('Deporte y Aventura',        'Gym, outdoor y equipos deportivos',             'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80', 13, 1, 1, 1),
    ('Belleza Natural',           'Skincare, cabello y cuidado personal',          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80', 14, 1, 1, 1),
    ('Mascotas y Amigos',         'Todo para perros, gatos y más',                 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80', 15, 1, 1, 1),
    ('Juguetes y Entretenimiento','Juguetes educativos, gaming y diversión',       'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&q=80',   16, 1, 1, 1)
ON CONFLICT DO NOTHING;

-- ── 2. Subcategorías hija (2 por cada padre) ─────────────────────
DO $$
DECLARE
    cat_elec2  INT; cat_moda INT; cat_hogar2 INT;
    cat_depo2  INT; cat_bell2 INT; cat_masc2  INT; cat_jueg2 INT;
BEGIN
    SELECT id_categoria INTO cat_elec2  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Electrónica y Gadgets'      AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO cat_moda   FROM hot_click_categoria_tb WHERE nombre_categoria = 'Moda y Estilo'              AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO cat_hogar2 FROM hot_click_categoria_tb WHERE nombre_categoria = 'Hogar y Decoración'         AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO cat_depo2  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Deporte y Aventura'         AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO cat_bell2  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Belleza Natural'            AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO cat_masc2  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Mascotas y Amigos'          AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO cat_jueg2  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Juguetes y Entretenimiento' AND fk_id_empresa = 1 LIMIT 1;

    INSERT INTO hot_click_categoria_tb
        (nombre_categoria, descripcion, imagen_url, orden_display, fk_id_categoria_padre, fk_id_admin_cliente, fk_id_estado, fk_id_empresa)
    VALUES
        ('Celulares y Tablets',  'Smartphones, tablets y accesorios',           'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80', 1, cat_elec2, 1, 1, 1),
        ('Audio y Video',        'Auriculares, parlantes y cámaras',            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', 2, cat_elec2, 1, 1, 1),
        ('Ropa Casual',          'Poleras, jeans y outfits del día a día',      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80', 1, cat_moda,   1, 1, 1),
        ('Calzado y Bolsos',     'Zapatos, zapatillas y bolsos',                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',   2, cat_moda,   1, 1, 1),
        ('Sala y Comedor',       'Muebles, decoración y accesorios de sala',   'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80', 1, cat_hogar2, 1, 1, 1),
        ('Dormitorio',           'Ropa de cama, almohadas y decor',             'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 2, cat_hogar2, 1, 1, 1),
        ('Gym y Fitness',        'Pesas, bandas y accesorios de entrenamiento', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80', 1, cat_depo2,  1, 1, 1),
        ('Aire Libre',           'Senderismo, camping y ciclismo',              'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&q=80', 2, cat_depo2,  1, 1, 1),
        ('Skincare',             'Cremas, sérums y cuidado facial',             'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80', 1, cat_bell2,  1, 1, 1),
        ('Cabello y Cuerpo',     'Shampoos, acondicionadores y más',            'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80', 2, cat_bell2,  1, 1, 1),
        ('Para Perros',          'Alimento, juguetes y accesorios caninos',     'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80', 1, cat_masc2,  1, 1, 1),
        ('Para Gatos',           'Alimento, arena y juguetes felinos',          'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80', 2, cat_masc2,  1, 1, 1),
        ('Juguetes Educativos',  'STEM, puzzles y aprendizaje',                 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&q=80',   1, cat_jueg2,  1, 1, 1),
        ('Gaming',               'Periféricos, accesorios y videojuegos',       'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80', 2, cat_jueg2,  1, 1, 1)
    ON CONFLICT DO NOTHING;
END $$;

-- ── 3. 40 Productos (visible_catalogo=true, imagen incluida) ─────
DO $$
DECLARE
    sub_cel   INT; sub_audio INT;
    sub_ropa  INT; sub_calz  INT;
    sub_sala  INT; sub_dorm  INT;
    sub_gym   INT; sub_aire  INT;
    sub_skin  INT; sub_cab   INT;
    sub_perro INT; sub_gato  INT;
    sub_educ  INT; sub_game  INT;
BEGIN
    SELECT id_categoria INTO sub_cel   FROM hot_click_categoria_tb WHERE nombre_categoria = 'Celulares y Tablets'   AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_audio FROM hot_click_categoria_tb WHERE nombre_categoria = 'Audio y Video'         AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_ropa  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Ropa Casual'           AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_calz  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Calzado y Bolsos'      AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_sala  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Sala y Comedor'        AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_dorm  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Dormitorio'            AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_gym   FROM hot_click_categoria_tb WHERE nombre_categoria = 'Gym y Fitness'         AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_aire  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Aire Libre'            AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_skin  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Skincare'              AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_cab   FROM hot_click_categoria_tb WHERE nombre_categoria = 'Cabello y Cuerpo'      AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_perro FROM hot_click_categoria_tb WHERE nombre_categoria = 'Para Perros'           AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_gato  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Para Gatos'            AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_educ  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Juguetes Educativos'   AND fk_id_empresa = 1 LIMIT 1;
    SELECT id_categoria INTO sub_game  FROM hot_click_categoria_tb WHERE nombre_categoria = 'Gaming'                AND fk_id_empresa = 1 LIMIT 1;

    INSERT INTO hot_click_producto_tb
        (nombre_producto, descripcion_corta, precio_compra, precio_venta, stock_actual, stock_minimo, sku, destacado, visible_catalogo, fk_id_bodega, fk_id_categoria, fk_id_admin_cliente, fk_id_estado, fk_id_empresa, imagen_principal_url)
    VALUES
        -- ── Celulares y Tablets (5) ──────────────────────────────────
        ('Funda Silicona iPhone 15',           'Protección completa, antideslizante, varios colores',     2500,  5900, 50,  8, 'HC2-CEL-001', false, true, 1, sub_cel,   1, 1, 1, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&q=80'),
        ('Vidrio Templado 9H Pack x2',         'Anti-rayones, oleofóbico, bordes curvados',              1500,  3900, 80, 10, 'HC2-CEL-002', false, true, 1, sub_cel,   1, 1, 1, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&q=80'),
        ('Soporte Auto Magnético 360°',         'Rejilla/parabrisas, imán N52, universal',               4500,  9900, 35,  5, 'HC2-CEL-003', false, true, 1, sub_cel,   1, 1, 1, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80'),
        ('Selfie Stick Trípode Bluetooth',      'Extensible 80cm, control remoto, pie estable',          5000, 10900, 25,  4, 'HC2-CEL-004', false, true, 1, sub_cel,   1, 1, 1, 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&q=80'),
        ('Cargador Inalámbrico MagSafe 15W',    'Qi2 compatible, carga rápida, cable USB-C incluido',    7500, 15900, 30,  5, 'HC2-CEL-005', true,  true, 1, sub_cel,   1, 1, 1, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80'),
        -- ── Audio y Video (4) ────────────────────────────────────────
        ('Auriculares Over-Ear 40h Batería',    'Cancelación ruido activa, plegables, HiFi',            22000, 44900, 15,  3, 'HC2-AUD-001', true,  true, 1, sub_audio, 1, 1, 1, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'),
        ('Parlante Bluetooth 360° IPX5',        'Sonido envolvente, 10h autonomía, mosquetón',           8500, 17900, 30,  5, 'HC2-AUD-002', false, true, 1, sub_audio, 1, 1, 1, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80'),
        ('Webcam 1080p con Anillo LED',         '30fps, micrófono integrado, plug & play',              18000, 36900, 12,  2, 'HC2-AUD-003', false, true, 1, sub_audio, 1, 1, 1, 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&q=80'),
        ('Trípode Aluminio 160cm',              'Rótula 360°, para cámara y celular, bolsa transporte', 14000, 27900, 15,  2, 'HC2-AUD-004', false, true, 1, sub_audio, 1, 1, 1, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80'),
        -- ── Ropa Casual (5) ─────────────────────────────────────────
        ('Polera Oversize Básica',              '100% algodón pre-lavado, 8 colores disponibles',        5500, 12900, 60, 10, 'HC2-ROC-001', false, true, 1, sub_ropa,  1, 1, 1, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80'),
        ('Jean Skinny Stretch Mujer',           'Denim elastizado, cintura alta, tallas 26-34',         13000, 27900, 25,  4, 'HC2-ROC-002', true,  true, 1, sub_ropa,  1, 1, 1, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80'),
        ('Camisa Lino Manga Larga Hombre',      'Regular fit, 8 colores, perfecta para verano',         10000, 21900, 20,  3, 'HC2-ROC-003', false, true, 1, sub_ropa,  1, 1, 1, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80'),
        ('Vestido Mini Estampado Floral',       'Tiras ajustables, espalda descubierta, S-XL',           9500, 19900, 22,  4, 'HC2-ROC-004', true,  true, 1, sub_ropa,  1, 1, 1, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80'),
        ('Set Loungewear Pantalón + Top',        'Tejido suave, elástico ajustable, varios tonos',       11000, 23900, 18,  3, 'HC2-ROC-005', false, true, 1, sub_ropa,  1, 1, 1, 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80'),
        -- ── Calzado y Bolsos (3) ────────────────────────────────────
        ('Zapatillas Chunky Retro Unisex',      'Suela 5cm, materiales mixtos, tallas 35-45',           24000, 49900, 15,  2, 'HC2-CAL-001', true,  true, 1, sub_calz,  1, 1, 1, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'),
        ('Bolso Tote Canvas Grande',            'Asas reforzadas, bolsillo interior con cierre',         7500, 15900, 30,  5, 'HC2-CAL-002', false, true, 1, sub_calz,  1, 1, 1, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80'),
        ('Sandalias Plataforma 6cm',            'Tiras ajustables, cómodas, 5 colores',                 12000, 24900, 20,  3, 'HC2-CAL-003', false, true, 1, sub_calz,  1, 1, 1, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80'),
        -- ── Sala y Comedor (3) ───────────────────────────────────────
        ('Set Portavelas Geométrico x3',        'Metal dorado/negro, varios tamaños, centro mesa',       7000, 14900, 20,  3, 'HC2-SAL-001', false, true, 1, sub_sala,  1, 1, 1, 'https://images.unsplash.com/photo-1602178510900-fef4a8a5d1a8?w=400&q=80'),
        ('Bandeja Decorativa Madera Oval',      '35cm, manijas latón, multiusos sala o cocina',          8500, 17900, 15,  3, 'HC2-SAL-002', false, true, 1, sub_sala,  1, 1, 1, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80'),
        ('Manteles Individuales Algodón x4',    'Reversibles, varios patrones, 30x45cm',                6000, 12900, 25,  5, 'HC2-SAL-003', false, true, 1, sub_sala,  1, 1, 1, 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80'),
        -- ── Dormitorio (2) ───────────────────────────────────────────
        ('Almohada Ergonómica Cervical',        'Espuma viscoelástica, funda lavable, M/L',             14000, 28900, 15,  3, 'HC2-DOR-001', true,  true, 1, sub_dorm,  1, 1, 1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80'),
        ('Difusor Aromas Ultrasónico 300ml',    'LED 7 colores, timer, silencioso, 5h continuo',        12000, 24900, 20,  3, 'HC2-DOR-002', false, true, 1, sub_dorm,  1, 1, 1, 'https://images.unsplash.com/photo-1602178510900-fef4a8a5d1a8?w=400&q=80'),
        -- ── Gym y Fitness (4) ────────────────────────────────────────
        ('Guantes Gym Antideslizantes',         'Acolchado en palma, ventilados, velcro, S-XL',         5000, 10900, 30,  5, 'HC2-GYM-001', false, true, 1, sub_gym,   1, 1, 1, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80'),
        ('Rueda Ab Roller Doble',               'Rodamientos silenciosos, rodillera incluida',           6500, 13900, 25,  4, 'HC2-GYM-002', false, true, 1, sub_gym,   1, 1, 1, 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80'),
        ('Cinturón Lumbar para Pesas',          'Cuero genuino, 10cm ancho, tallas S-XXL',             14000, 28900, 15,  2, 'HC2-GYM-003', false, true, 1, sub_gym,   1, 1, 1, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80'),
        ('Shaker Proteína 700ml',               'Sin BPA, malla anti-grumos, clip lateral',              3500,  7900, 40,  8, 'HC2-GYM-004', false, true, 1, sub_gym,   1, 1, 1, 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&q=80'),
        -- ── Aire Libre (2) ───────────────────────────────────────────
        ('Repelente Insectos 200ml Spray',      'DEET 20%, protección 6h, apto niños +2 años',          3000,  6900, 40,  8, 'HC2-AIR-001', false, true, 1, sub_aire,  1, 1, 1, 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80'),
        ('Linterna LED Recargable 800lm',       'IPX6, zoom, USB-C, 10h autonomía, SOS integrado',      8500, 17900, 20,  3, 'HC2-AIR-002', false, true, 1, sub_aire,  1, 1, 1, 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'),
        -- ── Skincare (3) ────────────────────────────────────────────
        ('Limpiador Facial Espuma 150ml',       'pH balanceado, aloe vera, todo tipo de piel',           4000,  8900, 35,  5, 'HC2-SKN-001', false, true, 1, sub_skin,  1, 1, 1, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80'),
        ('Contorno Ojos Hidrogel 30ml',         'Cafeína + vitamina K, ojeras y antibolsas',             7500, 15900, 20,  3, 'HC2-SKN-002', false, true, 1, sub_skin,  1, 1, 1, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80'),
        ('Protector Solar Toque Seco SPF50+',   '50ml, PA+++, finish mate, no deja blanco',              6500, 13900, 25,  5, 'HC2-SKN-003', true,  true, 1, sub_skin,  1, 1, 1, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80'),
        -- ── Cabello y Cuerpo (2) ────────────────────────────────────
        ('Mascarilla Capilar Keratina 300g',    'Reparación profunda, liso suave, 3 minutos',            5500, 11900, 25,  4, 'HC2-CAB-001', false, true, 1, sub_cab,   1, 1, 1, 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&q=80'),
        ('Exfoliante Corporal Café + Coco',     'Azúcar + aceite de coco, anticelulítico, 250g',         5000, 10900, 25,  4, 'HC2-CAB-002', false, true, 1, sub_cab,   1, 1, 1, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80'),
        -- ── Para Perros (2) ──────────────────────────────────────────
        ('Snacks Premium Perro 200g',           'Sin gluten, colágeno dental, raza pequeña',             3500,  7900, 40,  8, 'HC2-PRO-001', false, true, 1, sub_perro, 1, 1, 1, 'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=400&q=80'),
        ('Correa Retráctil 5m hasta 25kg',      'Freno automático, mango ergonómico, reflectante',       8000, 16900, 20,  3, 'HC2-PRO-002', false, true, 1, sub_perro, 1, 1, 1, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80'),
        -- ── Para Gatos (1) ───────────────────────────────────────────
        ('Arena Gato Aglomerante 4kg',          'Control olor 7 días, polvo mínimo, clumping premium',   4500,  9900, 25,  5, 'HC2-GAT-001', false, true, 1, sub_gato,  1, 1, 1, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80'),
        -- ── Juguetes Educativos (2) ──────────────────────────────────
        ('Bloques Magnéticos STEM 60 piezas',   'Colores brillantes, manual actividades, 3+ años',      14000, 28900, 15,  2, 'HC2-EDU-001', true,  true, 1, sub_educ,  1, 1, 1, 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&q=80'),
        ('Rompecabezas 3D Madera 200 piezas',   'Mapamundi, sin piezas idénticas, marco incluido',       8000, 16900, 20,  3, 'HC2-EDU-002', false, true, 1, sub_educ,  1, 1, 1, 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&q=80'),
        -- ── Gaming (2) ───────────────────────────────────────────────
        ('Mousepad Gaming XL 80x30cm',          'Bordes cosidos, base antideslizante, superficie suave', 5500, 11900, 25,  5, 'HC2-GAM-001', false, true, 1, sub_game,  1, 1, 1, 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80'),
        ('Audífonos Gaming 7.1 Virtual RGB',    'Micrófono retráctil, USB, compatible PC/PS5/Xbox',     18000, 36900, 12,  2, 'HC2-GAM-002', true,  true, 1, sub_game,  1, 1, 1, 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80')

    ON CONFLICT (sku) DO NOTHING;
END $$;
