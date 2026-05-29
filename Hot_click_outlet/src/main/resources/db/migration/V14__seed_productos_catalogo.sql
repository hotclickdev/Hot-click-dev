-- V14: Seed de catálogo — bodega, categorías y 100 productos demo

-- ── Columna imagen_principal_url (por si no existe aún) ──────────
ALTER TABLE "HOT_CLICK_PRODUCTO_TB"
    ADD COLUMN IF NOT EXISTS imagen_principal_url VARCHAR(500);

-- ── UNIQUE en SKU (necesario para ON CONFLICT y consistencia del negocio) ─
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_producto_sku'
    ) THEN
        ALTER TABLE "HOT_CLICK_PRODUCTO_TB" ADD CONSTRAINT uk_producto_sku UNIQUE ("SKU");
    END IF;
END $$;

-- ── Bodega principal ─────────────────────────────────────────────
INSERT INTO "HOT_CLICK_BODEGA_TB"
    ("ID_BODEGA","NOMBRE_BODEGA","DIRECCION_EXACTA","TELEFONO","FK_ID_ADMIN_CLIENTE","FK_ID_ESTADO",fk_id_empresa)
VALUES
    (1,'Bodega Central HOTCLICK','San José, Costa Rica','88888888',1,1,1)
ON CONFLICT ("ID_BODEGA") DO NOTHING;

-- ── Categorías ───────────────────────────────────────────────────
INSERT INTO "HOT_CLICK_CATEGORIA_TB"
    ("NOMBRE_CATEGORIA","DESCRIPCION","FK_ID_ADMIN_CLIENTE","FK_ID_ESTADO",fk_id_empresa)
VALUES
    ('Electrónica',          'Celulares, laptops, audio y más',           1,1,1),
    ('Ropa y Accesorios',    'Moda para hombre y mujer',                  1,1,1),
    ('Hogar y Jardín',       'Muebles, decoración y jardín',              1,1,1),
    ('Deportes y Fitness',   'Equipos y ropa deportiva',                  1,1,1),
    ('Belleza y Cuidado',    'Skincare, maquillaje y perfumes',            1,1,1),
    ('Juguetes y Juegos',    'Para niños y adultos',                      1,1,1),
    ('Herramientas',         'Ferretería y construcción',                 1,1,1),
    ('Libros y Papelería',   'Libros, útiles escolares y oficina',        1,1,1),
    ('Mascotas',             'Alimento, accesorios y juguetes para mascotas', 1,1,1),
    ('Cocina y Alimentos',   'Electrodomésticos y artículos de cocina',   1,1,1)
ON CONFLICT DO NOTHING;

-- ── Productos ────────────────────────────────────────────────────
-- Usamos DO $$ para obtener los IDs de categorías dinámicamente

DO $$
DECLARE
    cat_elec  INTEGER; cat_ropa  INTEGER; cat_hogar INTEGER;
    cat_depo  INTEGER; cat_bell  INTEGER; cat_jueg  INTEGER;
    cat_herr  INTEGER; cat_libr  INTEGER; cat_masc  INTEGER;
    cat_coci  INTEGER;
BEGIN
    SELECT "ID_CATEGORIA" INTO cat_elec FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Electrónica'        AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_ropa FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Ropa y Accesorios'  AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_hogar FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Hogar y Jardín'    AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_depo FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Deportes y Fitness' AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_bell FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Belleza y Cuidado'  AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_jueg FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Juguetes y Juegos'  AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_herr FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Herramientas'       AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_libr FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Libros y Papelería' AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_masc FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Mascotas'           AND fk_id_empresa=1 LIMIT 1;
    SELECT "ID_CATEGORIA" INTO cat_coci FROM "HOT_CLICK_CATEGORIA_TB" WHERE "NOMBRE_CATEGORIA"='Cocina y Alimentos' AND fk_id_empresa=1 LIMIT 1;

    INSERT INTO "HOT_CLICK_PRODUCTO_TB"
        ("NOMBRE_PRODUCTO","DESCRIPCION_CORTA","PRECIO_COMPRA","PRECIO_VENTA","STOCK_ACTUAL","STOCK_MINIMO","SKU","DESTACADO","VISIBLE_CATALOGO","FK_ID_BODEGA","FK_ID_CATEGORIA","FK_ID_ADMIN_CLIENTE","FK_ID_ESTADO",fk_id_empresa,imagen_principal_url)
    VALUES
        -- ELECTRÓNICA (20 productos)
        ('Audífonos Bluetooth Over-Ear','Sonido premium, cancelación de ruido, 30h batería',18000,34900,25,3,'HC-ELEC-001',true,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'),
        ('Parlante Portátil Bluetooth','Resistente al agua IPX7, 360° sonido, 12h',12000,24900,40,5,'HC-ELEC-002',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80'),
        ('Smartwatch Deportivo','GPS integrado, monitor cardíaco, notificaciones',22000,44900,20,3,'HC-ELEC-003',true,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'),
        ('Cargador Inalámbrico 15W','Qi compatible, carga rápida, LED indicador',4500,9900,60,10,'HC-ELEC-004',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80'),
        ('Teclado Mecánico Gaming','RGB, switches Blue, TKL compacto',28000,54900,15,3,'HC-ELEC-005',true,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&q=80'),
        ('Mouse Inalámbrico Ergonómico','DPI ajustable, 18 meses batería, silencioso',8000,16900,35,5,'HC-ELEC-006',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80'),
        ('Webcam Full HD 1080p','Micrófono integrado, plug & play, clip universal',11000,21900,20,3,'HC-ELEC-007',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&q=80'),
        ('Tablet Android 10 pulgadas','4GB RAM, 64GB, pantalla IPS, batería 6000mAh',55000,99900,12,2,'HC-ELEC-008',true,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80'),
        ('Power Bank 20000mAh','Carga rápida 22.5W, 3 puertos, pantalla LCD',14000,27900,30,5,'HC-ELEC-009',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&q=80'),
        ('Auriculares TWS In-Ear','Cancelación activa de ruido, estuche carga, 24h',16000,31900,25,5,'HC-ELEC-010',true,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80'),
        ('Cable USB-C a USB-C 100W','Nylon trenzado, carga rápida, 2 metros',2500,5900,80,10,'HC-ELEC-011',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1601999109332-542b18dbec61?w=400&q=80'),
        ('Hub USB-C 7 en 1','HDMI 4K, USB 3.0 x3, SD, PD 100W',13000,24900,20,3,'HC-ELEC-012',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=400&q=80'),
        ('Soporte para Laptop','Aluminio, ajustable, plegable, ergonómico',7000,14900,30,5,'HC-ELEC-013',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80'),
        ('Lámpara LED Escritorio','Carga USB, 3 modos luz, intensidad ajustable',6000,12900,25,5,'HC-ELEC-014',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1614094082869-cd4e4b2905c7?w=400&q=80'),
        ('Cámara de Seguridad WiFi','1080p, visión nocturna, app móvil, exterior',18000,36900,15,3,'HC-ELEC-015',true,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'),
        ('Controlador Gamepad BT','Compatible PC/Android/iOS, vibración, 8h',12000,22900,20,3,'HC-ELEC-016',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&q=80'),
        ('Router WiFi 6 AX1800','Dual band, 1800 Mbps, 4 antenas externas',38000,72900,10,2,'HC-ELEC-017',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&q=80'),
        ('Impresora Portátil Bluetooth','Impresión térmica, fotos 4x6, batería recargable',19000,37900,12,2,'HC-ELEC-018',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&q=80'),
        ('Micrófono USB Condensador','Studio quality, cardioide, plug & play',22000,42900,8,2,'HC-ELEC-019',true,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80'),
        ('Luz de Anillo LED 10 pulgadas','Tripié incluido, control remoto, 3 tonos',11000,21900,18,3,'HC-ELEC-020',false,true,1,cat_elec,1,1,1,'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&q=80'),
        -- ROPA Y ACCESORIOS (20 productos)
        ('Camiseta Premium Algodón Hombre','100% algodón, corte regular, tallas S-XXL',4500,9900,50,10,'HC-ROPA-001',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80'),
        ('Jean Slim Fit Hombre','Stretch denim, 5 bolsillos, varios colores',14000,28900,30,5,'HC-ROPA-002',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80'),
        ('Vestido Casual Mujer','Tela suave, midi, estampado floral',11000,22900,25,5,'HC-ROPA-003',true,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80'),
        ('Zapatillas Running Unisex','Suela EVA, upper mesh, amortiguación premium',28000,54900,20,3,'HC-ROPA-004',true,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'),
        ('Mochila Urbana 25L','Compartimento laptop 15", USB port, impermeable',18000,34900,15,3,'HC-ROPA-005',true,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80'),
        ('Gafas de Sol Polarizadas','UV400, montura acetato, estuche incluido',8000,16900,30,5,'HC-ROPA-006',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80'),
        ('Gorra Snapback Ajustable','Bordado premium, tela strapback, unisex',4000,8900,40,8,'HC-ROPA-007',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80'),
        ('Billetera Cuero Slim Hombre','RFID bloqueado, 6 tarjetas, sin monedero',6500,13900,35,5,'HC-ROPA-008',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80'),
        ('Cinturón Cuero Genuino','Hebilla automática, 2 colores, tallas 30-44',5500,11900,30,5,'HC-ROPA-009',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80'),
        ('Sudadera Hoodie Oversize','Fleece interior, bolsillo canguro, varios colores',16000,31900,20,3,'HC-ROPA-010',true,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80'),
        ('Blusa Elegante Mujer','Seda sintética, manga larga, cuello V',9000,18900,22,4,'HC-ROPA-011',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80'),
        ('Shorts Cargo Hombre','Tela ripstop, 6 bolsillos, ajuste regular',10000,19900,25,5,'HC-ROPA-012',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1565084888279-aca607bb7420?w=400&q=80'),
        ('Reloj Analógico Clásico','Correa cuero, cristal mineral, agua resistente',22000,44900,15,3,'HC-ROPA-013',true,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'),
        ('Bolso de Mano Mujer','Cuero PU, compartimentos, cadena metálica',14000,28900,18,3,'HC-ROPA-014',true,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80'),
        ('Calcetines Pack 5 pares','Algodón premium, varios colores, tallas 35-45',3500,7900,60,10,'HC-ROPA-015',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&q=80'),
        ('Pijama Set Mujer','Tela suave bambú, pantalón + top, S-XL',9500,19900,20,4,'HC-ROPA-016',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400&q=80'),
        ('Buzo Jogger Hombre','French terry, logo bordado, elástico ajustable',12000,23900,25,5,'HC-ROPA-017',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80'),
        ('Collar Plata 925','Cadena veneziana, dije corazón, caja regalo',7000,14900,20,3,'HC-ROPA-018',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80'),
        ('Aretes Perla Natural','Plata esterlina, perla cultivada, varios tamaños',5500,11900,25,5,'HC-ROPA-019',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80'),
        ('Sombrero de Playa','Paja natural, ala ancha, UPF 50+',6000,12900,30,5,'HC-ROPA-020',false,true,1,cat_ropa,1,1,1,'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80'),
        -- HOGAR Y JARDÍN (15 productos)
        ('Cojín Decorativo 45x45cm','Funda lavable, relleno premium, varios diseños',4500,9900,40,8,'HC-HOGAR-001',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'),
        ('Set de Velas Aromáticas x3','Soja natural, 45h burn, fragancias tropicales',5500,11900,30,5,'HC-HOGAR-002',true,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1602178510900-fef4a8a5d1a8?w=400&q=80'),
        ('Organizador Bambú Cajón','Modular, 6 compartimentos, ecológico',4000,8900,35,5,'HC-HOGAR-003',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'),
        ('Marco Fotos Collage 6 fotos','MDF blanco, 4x6" y 5x7", colgante',6000,12900,25,5,'HC-HOGAR-004',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80'),
        ('Planta Suculenta Decorativa','Set 3 macetas cerámicas, plantas variadas',7500,15900,20,3,'HC-HOGAR-005',true,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80'),
        ('Cama Nórdica King Size','200 hilos, algodón egipcio, varios colores',22000,44900,10,2,'HC-HOGAR-006',true,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80'),
        ('Alfombra Sala 120x180cm','Tejido, antideslizante, diseño geométrico',28000,54900,8,2,'HC-HOGAR-007',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'),
        ('Espejo Decorativo Redondo 60cm','Marco dorado, montaje fácil, moderno',18000,36900,12,2,'HC-HOGAR-008',true,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80'),
        ('Portarrollos Baño Acero Inox','Montaje mural, 2 barras, paper tissue',4500,9900,30,5,'HC-HOGAR-009',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=80'),
        ('Dispensador Jabón Manos 500ml','Automático sensor, recargable, USB',8500,17900,20,3,'HC-HOGAR-010',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400&q=80'),
        ('Juego Toallas Baño x4','100% algodón, 550g/m², suaves y absorbentes',14000,27900,15,3,'HC-HOGAR-011',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1600369671236-3b7e97d3b5b0?w=400&q=80'),
        ('Cesta Ratán Almacenamiento','Tejido natural, tapa, S/M/L disponibles',8000,16900,22,4,'HC-HOGAR-012',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'),
        ('Manguera Jardín 30m','Extensible, anti-kink, pistola 8 funciones',12000,23900,15,3,'HC-HOGAR-013',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80'),
        ('Lámpara Piso Arco','E27, interruptor pie, pantalla lino',24000,47900,8,2,'HC-HOGAR-014',false,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80'),
        ('Reloj Pared Madera 30cm','Silencioso, mecanismo cuarzo, diseño nórdico',9000,18900,20,4,'HC-HOGAR-015',true,true,1,cat_hogar,1,1,1,'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&q=80'),
        -- DEPORTES Y FITNESS (15 productos)
        ('Colchoneta Yoga 6mm','Antideslizante, TPE ecológico, bolsa incluida',9500,19900,25,5,'HC-DEPO-001',true,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=400&q=80'),
        ('Mancuernas Ajustables 20kg','Par, hierro fundido, 5 pesos en 1',38000,74900,10,2,'HC-DEPO-002',true,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80'),
        ('Banda Resistencia Gym x5','Látex natural, 5 intensidades, bolsa guardado',6500,13900,35,5,'HC-DEPO-003',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?w=400&q=80'),
        ('Botella Deportiva 1L','Tritan libre BPA, pajilla, clip mosquetón',5000,10900,40,8,'HC-DEPO-004',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&q=80'),
        ('Cuerda para Saltar Pro','Aluminio, rodamiento cojinete, ajustable',5500,11900,30,5,'HC-DEPO-005',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80'),
        ('Guantes Ciclismo Gel','Amortiguación, transpirables, velcro, S-XL',5000,10900,25,5,'HC-DEPO-006',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'),
        ('Casco Bicicleta Urbano','CE certificado, ventilación, ajuste dial',16000,31900,15,3,'HC-DEPO-007',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1576858574144-9ae1ebcf5ae5?w=400&q=80'),
        ('Raqueta Tenis Beginner','Aluminio 27", cuerda pre-tensada, funda',18000,34900,12,2,'HC-DEPO-008',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=80'),
        ('Cronómetro Digital Sumergible','10 memorias, alarma, retroiluminación',5000,10900,20,4,'HC-DEPO-009',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'),
        ('Pelotas Fútbol No.5 FIFA','Cosida a mano, cuero PU, varios diseños',12000,23900,15,3,'HC-DEPO-010',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=400&q=80'),
        ('Rodilleras Deporte Pack x2','Compresión, neopreno, S-XL',6000,12900,25,5,'HC-DEPO-011',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80'),
        ('Maletín Deportivo 40L','Compartimento zapatos, malla ventilación, hombro',14000,27900,18,3,'HC-DEPO-012',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80'),
        ('Cinta Kinesiológica x6 rollos','5m x 5cm, varios colores, pre-cortada',7500,15900,20,4,'HC-DEPO-013',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80'),
        ('Gorra Deportiva Dry Fit','Transpirable, visera curva, velcro, unisex',4000,8900,35,5,'HC-DEPO-014',false,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80'),
        ('Foam Roller Masaje 45cm','EVA alta densidad, textura punto gatillo',8500,17900,20,4,'HC-DEPO-015',true,true,1,cat_depo,1,1,1,'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80'),
        -- BELLEZA Y CUIDADO (10 productos)
        ('Sérum Vitamina C 30ml','Antioxidante, hidratante, piel radiante',9500,19900,30,5,'HC-BELL-001',true,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80'),
        ('Set Pinceles Maquillaje x12','Cerdas sintéticas, mango bambú, bolsa',8000,16900,25,5,'HC-BELL-002',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&q=80'),
        ('Perfume Mujer 100ml EDP','Notas florales, duración 8h, frasco premium',22000,44900,15,3,'HC-BELL-003',true,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80'),
        ('Secador de Cabello 2200W','Iónico, 3 temperaturas, difusor incluido',18000,34900,12,2,'HC-BELL-004',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80'),
        ('Mascarilla Facial Arcilla','100g, poros, puntos negros, todo tipo piel',4500,9900,35,5,'HC-BELL-005',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80'),
        ('Crema Hidratante SPF 50+','50ml, protector solar PA+++, no graso',7500,15900,30,5,'HC-BELL-006',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80'),
        ('Plancha de Cabello Cerámica','400°F, flotante, 30 seg calentamiento',22000,43900,10,2,'HC-BELL-007',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80'),
        ('Removedor Maquillaje Bifásico 250ml','Ojos sensibles, sin alcohol, desmaquilla 2x',5500,11900,25,5,'HC-BELL-008',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80'),
        ('Depiladora Eléctrica Mujer','Cabezal flotante, inalámbrica, cara/cuerpo',18000,34900,10,2,'HC-BELL-009',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80'),
        ('Aceite Esencial Lavanda 10ml','100% puro, aromaterapia, roll-on incluido',4000,8900,30,5,'HC-BELL-010',false,true,1,cat_bell,1,1,1,'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80'),
        -- COCINA Y ALIMENTOS (10 productos)
        ('Sartén Antiadherente 28cm','Cerámica, sin PFAS, mango silicona, inducción',18000,34900,20,3,'HC-COCI-001',true,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80'),
        ('Set Cuchillos Cocina x6','Acero inox alemán, bloque madera, afilador',28000,54900,12,2,'HC-COCI-002',true,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&q=80'),
        ('Cafetera Espresso Manual','15 bar, vaporizador, 1.8L depósito',38000,74900,8,2,'HC-COCI-003',true,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400&q=80'),
        ('Licuadora Personal 600W','2 vasos viaje 600ml, cuchilla inox, BPA free',14000,27900,15,3,'HC-COCI-004',false,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400&q=80'),
        ('Tabla Cortar Bambú 40x25cm','Antideslizante, ranura jugo, set 3 tamaños',8000,16900,25,5,'HC-COCI-005',false,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80'),
        ('Freidora de Aire 4.5L','1500W, sin aceite, timer, pantalla digital',38000,72900,10,2,'HC-COCI-006',true,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1626808642875-0aa545482dfb?w=400&q=80'),
        ('Recipientes Vidrio Herméticos x5','Borosilicato, tapa bambú, apto microondas',12000,23900,20,4,'HC-COCI-007',false,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'),
        ('Taza Térmica Café 350ml','Acero inox, 6h caliente, tapa antigoteo',7000,14900,30,5,'HC-COCI-008',false,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80'),
        ('Dispensador Agua Frío/Calor','Compresor, luz UV, plástico BPA free, 20L',55000,104900,5,1,'HC-COCI-009',false,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1563452965085-2e77e5bf2607?w=400&q=80'),
        ('Báscula Digital Cocina 5kg','Precisión 1g, plataforma vidrio, tara, LCD',5500,11900,25,5,'HC-COCI-010',false,true,1,cat_coci,1,1,1,'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80'),
        -- MASCOTAS (5 productos)
        ('Comedero Automático Mascota','5L, temporizador x4 comidas, LCD, perro/gato',24000,47900,10,2,'HC-MASC-001',true,true,1,cat_masc,1,1,1,'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=400&q=80'),
        ('Arnés Perro Anti-Tiro M','Ajustable, reflectante, 3 puntos amarre',8000,16900,20,4,'HC-MASC-002',false,true,1,cat_masc,1,1,1,'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=400&q=80'),
        ('Cama Ortopédica Perro L','Espuma memoria, lavable, impermeable',18000,36900,8,2,'HC-MASC-003',false,true,1,cat_masc,1,1,1,'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&q=80'),
        ('Juguete Interactivo Gato','Plumas rotatorias, USB recargable, temporizador',5500,11900,20,4,'HC-MASC-004',false,true,1,cat_masc,1,1,1,'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80'),
        ('Cortaúñas Profesional Mascotas','Acero inox, guarda seguridad, perro/gato',4000,8900,25,5,'HC-MASC-005',false,true,1,cat_masc,1,1,1,'https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=400&q=80'),
        -- HERRAMIENTAS (5 productos)
        ('Taladro Percutor 600W','Chuck 13mm, 2 velocidades, maletín, accesorios',42000,82900,8,2,'HC-HERR-001',true,true,1,cat_herr,1,1,1,'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'),
        ('Set Destornilladores 32pz','Magnético, precision bits, estuche rígido',8500,17900,20,4,'HC-HERR-002',false,true,1,cat_herr,1,1,1,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'),
        ('Cinta Métrica 5m Magnética','Gancho doble función, freno automático, mm/in',3000,6900,30,5,'HC-HERR-003',false,true,1,cat_herr,1,1,1,'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'),
        ('Nivel Láser 3 líneas','Autonivelante, 30m, trípode incluido',28000,54900,6,2,'HC-HERR-004',false,true,1,cat_herr,1,1,1,'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'),
        ('Llave Inglesa Ajustable 10"','Cromo vanadio, apertura 0-32mm, anti-slip',5500,11900,20,4,'HC-HERR-005',false,true,1,cat_herr,1,1,1,'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&q=80')
    ON CONFLICT ("SKU") DO NOTHING;
END $$;
