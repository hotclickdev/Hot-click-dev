-- V132: 20 categorías globales orientadas a emprendimientos/negocios del marketplace.
-- Idempotente: solo inserta las que no existan ya por nombre (case-insensitive).
-- fk_id_empresa = NULL -> categoría global (visible para todos los negocios), igual que el seed de DataSeeder.

INSERT INTO hot_click_categoria_tb (nombre_categoria, descripcion, icono, orden_display, fk_id_admin_cliente, fk_id_empresa, fk_id_estado)
SELECT v.nombre, v.descripcion, v.icono, v.orden, admin.id_usuario, NULL, 1
FROM (VALUES
  ('Ropa y Moda',                 'Prendas de vestir, moda urbana y streetwear',            'ropa',    100),
  ('Calzado',                     'Zapatos, tenis y sandalias',                              'calzad',  101),
  ('Accesorios y Bisutería',      'Bolsos, carteras, lentes y bisutería',                    'joyer?a', 102),
  ('Joyería',                     'Joyas en plata, oro y piezas artesanales',                'joyer?a', 103),
  ('Belleza y Cuidado Personal',  'Cosméticos, skincare y cuidado personal',                 'belleza', 104),
  ('Artesanías',                  'Productos artesanales hechos a mano',                     'arte',    105),
  ('Arte y Manualidades',         'Ilustraciones, pinturas y manualidades',                  'arte',    106),
  ('Repostería y Panadería',      'Postres, pasteles y productos de panadería',              'regal',   107),
  ('Comidas y Bebidas',           'Alimentos preparados, snacks y bebidas artesanales',      'regal',   108),
  ('Decoración del Hogar',        'Artículos decorativos para el hogar',                     'hogar',   109),
  ('Velas y Aromaterapia',        'Velas aromáticas, difusores e inciensos',                 'hogar',   110),
  ('Papelería y Detalles',        'Papelería creativa, invitaciones y detalles para regalo', 'regal',   111),
  ('Tecnología y Accesorios',     'Gadgets, accesorios y periféricos',                       'tecnol',  112),
  ('Mascotas',                    'Alimento, accesorios y cuidado de mascotas',              'mascot',  113),
  ('Deportes y Fitness',          'Ropa deportiva, suplementos y equipo de entrenamiento',   'deport',  114),
  ('Juguetes y Niños',            'Juguetes, ropa y artículos para niños',                   'juguet',  115),
  ('Salud y Bienestar',           'Suplementos, productos naturales y bienestar',            'cuidado', 116),
  ('Jardinería y Plantas',        'Plantas, macetas y accesorios de jardín',                 'jardin',  117),
  ('Servicios Profesionales',     'Servicios de emprendedores: diseño, consultoría, clases', 'herram',  118),
  ('Libros y Papelería Escolar',  'Libros, útiles escolares y material educativo',           'libros',  119)
) AS v(nombre, descripcion, icono, orden)
CROSS JOIN (SELECT id_usuario FROM hot_click_usuario_tb WHERE correo = 'admin@hotclick.com' LIMIT 1) AS admin
WHERE NOT EXISTS (
  SELECT 1 FROM hot_click_categoria_tb c
  WHERE lower(c.nombre_categoria) = lower(v.nombre) AND c.fk_id_empresa IS NULL
);
