-- V11: NOT NULL constraints en tablas de negocio (backfill ya fue hecho en V9)
-- hot_click_usuario_tb queda NULLABLE — los USUARIO_FINAL no pertenecen a empresa

UPDATE "HOT_CLICK_PRODUCTO_TB"  SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_PEDIDO_TB"    SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_BODEGA_TB"    SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_CATEGORIA_TB" SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE hot_click_marca_tb       SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;

ALTER TABLE "HOT_CLICK_PRODUCTO_TB"  ALTER COLUMN fk_id_empresa SET NOT NULL;
ALTER TABLE "HOT_CLICK_PEDIDO_TB"    ALTER COLUMN fk_id_empresa SET NOT NULL;
ALTER TABLE "HOT_CLICK_BODEGA_TB"    ALTER COLUMN fk_id_empresa SET NOT NULL;
ALTER TABLE "HOT_CLICK_CATEGORIA_TB" ALTER COLUMN fk_id_empresa SET NOT NULL;
ALTER TABLE hot_click_marca_tb       ALTER COLUMN fk_id_empresa SET NOT NULL;
