-- Datos de prueba para el staging efímero de CI. TODO lo de acá es FICTICIO.
-- Prohibido: volcados de prod, correos/cédulas/IBAN reales. IBAN único permitido: CR00 0000 0000 0000 0000 00.
-- Se carga DESPUÉS de que Flyway migró el esquema al arrancar la app (incluye V180 cobros_pausados y V181 tienda_pausada).
-- Precios de producto = valores de prueba (no son montos de planes ni comisiones).
--
-- IDs fijos que usa qa/staging/api-tests.sh (ci/staging 1024ebd9e):
--   usuario 9001 admin@staging.test       rol ADMIN
--   usuario 9002 vendedor@staging.test    rol EMPRENDEDOR (dueño de 9101)
--   usuario 9003 comprador@staging.test   rol USUARIO_FINAL (api-tests.sh firma el JWT con role CLIENTE; da igual para los 403)
--   empresa 9101 slug 'tienda-activa'   ACTIVO, visible
--   empresa 9102 slug 'tienda-pausada'  ACTIVO, visible, tienda_pausada TRUE (→ 410 TIENDA_PAUSADA)
--   producto 9201 de 9101 (stock 50), producto 9202 de 9102 (stock 50, destacado para probar que no sale)
--   bodega 9301 de 9101, bodega 9302 de 9102; categoría 9401
-- El baseline es solo esquema (sin datos) y Flyway arranca con baseline-version, así que los datos de
-- referencia que antes venían de scripts previos a Flyway (estados 1-3 y roles base) se cargan acá,
-- idempotentes. Roles con los nombres reales de la app (Constants): ADMIN, EMPRENDEDOR, USUARIO_FINAL.
BEGIN;

INSERT INTO hot_click_estado_tb (id_estado, nombre_estado, descripcion) VALUES
  (1, 'ACTIVO', 'Activo'), (2, 'INACTIVO', 'Inactivo'), (3, 'ELIMINADO', 'Eliminado')
ON CONFLICT (id_estado) DO NOTHING;

INSERT INTO hot_click_rol_tb (nombre_rol, descripcion, nivel_acceso, fk_id_estado)
SELECT r.nombre, r.descripcion, r.nivel, 1
FROM (VALUES ('ADMIN', 'Administrador de plataforma (staging)', 100),
             ('EMPRENDEDOR', 'Dueño de negocio (staging)', 5),
             ('USUARIO_FINAL', 'Comprador (staging)', 1)) AS r(nombre, descripcion, nivel)
WHERE NOT EXISTS (SELECT 1 FROM hot_click_rol_tb x WHERE x.nombre_rol = r.nombre);

INSERT INTO hot_click_empresa_tb (id_empresa, nombre_empresa, nombre_comercial, slug, correo_empresa, plan_saas,
  estado_empresa, visibilidad_publica, cobros_pausados, tienda_pausada, fk_id_estado, dia_cobro, frecuencia_payout,
  inscrito_hacienda, pct_comision_tarjeta, monto_fijo_comision_crc, pct_descuento_sinpe, fecha_registro) VALUES
  (9101, 'QA-TEST Tienda Activa',  'QA-TEST Tienda Activa',  'tienda-activa',  'tienda-activa@staging.test',  'EMPRENDEDOR',
   'ACTIVO', TRUE, FALSE, FALSE, 1, 28, 'QUINCENAL', FALSE, 0, 0, 0, NOW()),
  (9102, 'QA-TEST Tienda Pausada', 'QA-TEST Tienda Pausada', 'tienda-pausada', 'tienda-pausada@staging.test', 'EMPRENDEDOR',
   'ACTIVO', TRUE, FALSE, TRUE,  1, 28, 'QUINCENAL', FALSE, 0, 0, 0, NOW());

-- contrasena_hash no es un bcrypt válido: nadie entra con contraseña; los tests usan el JWT de staging.
INSERT INTO hot_click_usuario_tb (id_usuario, identificacion, nombre, apellido_paterno, correo, telefono, contrasena_hash,
  puntos_fidelidad, limite_credito, saldo_credito, total_compras_hist, num_pedidos_hist, fk_id_empresa) VALUES
  (9001, 'QA-9001', 'Admin',     'Prueba', 'admin@staging.test',     '00000000', '!sin-login', 0, 0, 0, 0, 0, NULL),
  (9002, 'QA-9002', 'Vendedor',  'Prueba', 'vendedor@staging.test',  '00000000', '!sin-login', 0, 0, 0, 0, 0, 9101),
  (9003, 'QA-9003', 'Comprador', 'Prueba', 'comprador@staging.test', '00000000', '!sin-login', 0, 0, 0, 0, 0, NULL);

INSERT INTO hot_click_usuario_rol_tb (fk_id_usuario, fk_id_rol)
  SELECT 9001, id_rol FROM hot_click_rol_tb WHERE nombre_rol = 'ADMIN'
  UNION ALL SELECT 9002, id_rol FROM hot_click_rol_tb WHERE nombre_rol = 'EMPRENDEDOR'
  UNION ALL SELECT 9003, id_rol FROM hot_click_rol_tb WHERE nombre_rol = 'USUARIO_FINAL';

INSERT INTO hot_click_miembro_empresa_tb (id_miembro, fk_id_usuario, fk_id_empresa, rol_en_empresa, estado) VALUES
  (9501, 9002, 9101, 'PROPIETARIO', 1);

INSERT INTO hot_click_bodega_tb (id_bodega, nombre_bodega, direccion_exacta, telefono, permite_retiro_cliente,
  acepta_efectivo, fk_id_admin_cliente, fk_id_empresa) VALUES
  (9301, 'QA-TEST Bodega Activa',  'Dirección ficticia, San José', '00000000', FALSE, TRUE, 9002, 9101),
  (9302, 'QA-TEST Bodega Pausada', 'Dirección ficticia, San José', '00000000', FALSE, TRUE, 9002, 9102);

INSERT INTO hot_click_categoria_tb (id_categoria, nombre_categoria, fk_id_admin_cliente, fk_id_empresa) VALUES
  (9401, 'QA-TEST Categoría', 9001, NULL);

INSERT INTO hot_click_producto_tb (id_producto, sku, nombre_producto, precio_compra, precio_venta, stock_actual, stock_minimo,
  es_unico, vendido, destacado, visible_catalogo, en_carrusel, en_oferta, es_personalizado, version, fk_id_estado,
  fk_id_bodega, fk_id_categoria, fk_id_admin_cliente, fk_id_empresa) VALUES
  (9201, 'QA-9201', 'QA-TEST Producto Activo',  500, 1000, 50, 1, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, 0, 1, 9301, 9401, 9002, 9101),
  (9202, 'QA-9202', 'QA-TEST Producto Pausado', 500, 1000, 50, 1, FALSE, FALSE, TRUE,  TRUE, FALSE, FALSE, FALSE, 0, 1, 9302, 9401, 9002, 9102);

-- Mantener las secuencias por encima de los IDs fijos.
SELECT setval(pg_get_serial_sequence('hot_click_empresa_tb', 'id_empresa'), GREATEST((SELECT MAX(id_empresa) FROM hot_click_empresa_tb), 9102));
SELECT setval(pg_get_serial_sequence('hot_click_usuario_tb', 'id_usuario'), GREATEST((SELECT MAX(id_usuario) FROM hot_click_usuario_tb), 9003));
SELECT setval(pg_get_serial_sequence('hot_click_producto_tb', 'id_producto'), GREATEST((SELECT MAX(id_producto) FROM hot_click_producto_tb), 9202));
SELECT setval(pg_get_serial_sequence('hot_click_bodega_tb', 'id_bodega'), GREATEST((SELECT MAX(id_bodega) FROM hot_click_bodega_tb), 9302));
COMMIT;
