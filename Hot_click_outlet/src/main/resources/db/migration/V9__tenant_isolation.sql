-- V9: Agregar fk_id_empresa a todas las tablas de datos + backfill a empresa 1

ALTER TABLE "HOT_CLICK_BODEGA_TB"              ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_CATEGORIA_TB"           ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE hot_click_marca_tb                 ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_PRODUCTO_TB"            ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_PEDIDO_TB"              ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_CONFIGURACION_MONEDA_TB"   ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_CONFIGURACION_IMPUESTO_TB" ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_GASTO_OPERATIVO_TB"     ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_DASHBOARD_KPI_TB"       ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_ALERTA_TB"              ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_ALERTA_NEGOCIO_TB"      ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_FINANZA_GLOBAL_TB"      ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE "HOT_CLICK_AUDITORIA_TB"           ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE hot_click_solicitud_servicio_tb    ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);
ALTER TABLE hot_click_cupon_tb                 ADD COLUMN IF NOT EXISTS fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa);

UPDATE "HOT_CLICK_BODEGA_TB"              SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_CATEGORIA_TB"           SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE hot_click_marca_tb                 SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_PRODUCTO_TB"            SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_PEDIDO_TB"              SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_CONFIGURACION_MONEDA_TB"   SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_CONFIGURACION_IMPUESTO_TB" SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_GASTO_OPERATIVO_TB"     SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_DASHBOARD_KPI_TB"       SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_ALERTA_TB"              SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_ALERTA_NEGOCIO_TB"      SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_FINANZA_GLOBAL_TB"      SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE "HOT_CLICK_AUDITORIA_TB"           SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE hot_click_solicitud_servicio_tb    SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE hot_click_cupon_tb                 SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL;
UPDATE hot_click_usuario_tb               SET fk_id_empresa = 1 WHERE fk_id_empresa IS NULL
    AND id_usuario IN (
        SELECT ur."FK_ID_USUARIO" FROM "HOT_CLICK_USUARIO_ROL_TB" ur WHERE ur."FK_ID_ROL" IN (1,2,4)
    );

-- SKU único por empresa (no global)
ALTER TABLE "HOT_CLICK_PRODUCTO_TB" DROP CONSTRAINT IF EXISTS "HOT_CLICK_PRODUCTO_TB_SKU_key";
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_sku_empresa
    ON "HOT_CLICK_PRODUCTO_TB" ("SKU", fk_id_empresa)
    WHERE fk_id_empresa IS NOT NULL;

-- Marca única por empresa
DROP INDEX IF EXISTS idx_marca_nombre_activo;
CREATE UNIQUE INDEX IF NOT EXISTS idx_marca_nombre_empresa
    ON hot_click_marca_tb (nombre_marca, fk_id_empresa)
    WHERE fk_id_estado = 1;

-- Finanza global: unique por empresa+fecha
ALTER TABLE "HOT_CLICK_FINANZA_GLOBAL_TB"
    DROP CONSTRAINT IF EXISTS "HOT_CLICK_FINANZA_GLOBAL_TB_FECHA_CALCULO_key";
CREATE UNIQUE INDEX IF NOT EXISTS idx_finanza_global_empresa_fecha
    ON "HOT_CLICK_FINANZA_GLOBAL_TB" (fk_id_empresa, "FECHA_CALCULO");

-- Índices de performance por tenant
CREATE INDEX IF NOT EXISTS idx_producto_empresa  ON "HOT_CLICK_PRODUCTO_TB" (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_pedido_empresa    ON "HOT_CLICK_PEDIDO_TB"   (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_bodega_empresa    ON "HOT_CLICK_BODEGA_TB"   (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_categoria_empresa ON "HOT_CLICK_CATEGORIA_TB"(fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_marca_empresa     ON hot_click_marca_tb      (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_usuario_empresa   ON hot_click_usuario_tb    (fk_id_empresa);
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON "HOT_CLICK_AUDITORIA_TB"(fk_id_empresa);
