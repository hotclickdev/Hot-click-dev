-- Datos de prueba para el staging efímero de CI. TODO lo de acá es FICTICIO.
-- Prohibido: volcados de prod, correos/cédulas/IBAN reales. IBAN único permitido: CR00 0000 0000 0000 0000 00.
-- Se carga DESPUÉS de que Flyway migró el esquema al arrancar la app.
--
-- TODO(Backend): confirmar nombres reales de tablas/columnas (usuarios, roles, empresas/negocios,
-- estado Pausado, visible_catalogo, productos, bodegas). Los IDs fijos los usa qa/staging/api-tests.sh.
--
-- IDs de referencia que esperan los tests:
--   usuario 9001 admin@staging.test       rol ADMIN
--   usuario 9002 vendedor@staging.test    rol EMPRENDEDOR (dueño de empresa 9101)
--   usuario 9003 comprador@staging.test   rol CLIENTE
--   empresa 9101 slug 'tienda-activa'   estado APROBADO
--   empresa 9102 slug 'tienda-pausada'  estado PAUSADO, visible_catalogo = FALSE
--   producto 9201 de 9101 (stock 50), producto 9202 de 9102 (stock 50)
--   bodega 9301 de 9101
BEGIN;
-- TODO(Backend): reemplazar por INSERTs reales. Ejemplo orientativo:
-- INSERT INTO usuarios (id, correo, nombre, rol) VALUES
--   (9001,'admin@staging.test','Admin Prueba','ADMIN'),
--   (9002,'vendedor@staging.test','Vendedor Prueba','EMPRENDEDOR'),
--   (9003,'comprador@staging.test','Comprador Prueba','CLIENTE');
-- INSERT INTO empresas (id, slug, nombre, estado, visible_catalogo, iban) VALUES
--   (9101,'tienda-activa','Tienda Activa','APROBADO',TRUE,'CR00 0000 0000 0000 0000 00'),
--   (9102,'tienda-pausada','Tienda Pausada','PAUSADO',FALSE,'CR00 0000 0000 0000 0000 00');
SELECT 1;
COMMIT;
