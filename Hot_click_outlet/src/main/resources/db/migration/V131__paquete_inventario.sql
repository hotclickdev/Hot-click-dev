-- V131: paquetes de digitalización de inventario + unique barcode por empresa
-- Paquete = sesión de captura en campo (con o sin empresa asignada).
-- Líneas viven en el paquete hasta ASIGNADO (entonces se crean/reúsan Producto).

CREATE TABLE IF NOT EXISTS hot_click_paquete_inventario_tb (
    id_paquete               BIGSERIAL PRIMARY KEY,
    codigo                   VARCHAR(40)  NOT NULL,
    fk_id_empresa            BIGINT REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE SET NULL,
    nombre_negocio_temporal  VARCHAR(200),
    estado                   VARCHAR(20)  NOT NULL DEFAULT 'ABIERTO',
    notas                    TEXT,
    fk_id_creado_por         BIGINT REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL,
    fecha_creacion           TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_cierre             TIMESTAMP,
    fecha_asignacion         TIMESTAMP,
    CONSTRAINT uq_paquete_inventario_codigo UNIQUE (codigo),
    CONSTRAINT chk_paquete_estado CHECK (estado IN ('ABIERTO', 'CERRADO', 'ASIGNADO'))
);

CREATE INDEX IF NOT EXISTS idx_paquete_inventario_estado
    ON hot_click_paquete_inventario_tb (estado, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_paquete_inventario_empresa
    ON hot_click_paquete_inventario_tb (fk_id_empresa)
    WHERE fk_id_empresa IS NOT NULL;

CREATE TABLE IF NOT EXISTS hot_click_paquete_linea_tb (
    id_linea           BIGSERIAL PRIMARY KEY,
    fk_id_paquete      BIGINT NOT NULL REFERENCES hot_click_paquete_inventario_tb(id_paquete) ON DELETE CASCADE,
    barcode            VARCHAR(50),
    sku                VARCHAR(50),
    nombre             VARCHAR(200) NOT NULL,
    precio_compra      INTEGER NOT NULL DEFAULT 0,
    precio_venta       INTEGER NOT NULL DEFAULT 1,
    stock              INTEGER NOT NULL DEFAULT 0,
    marca_texto        VARCHAR(100),
    categoria_texto    VARCHAR(100),
    imagen_url         VARCHAR(500),
    estado             VARCHAR(20) NOT NULL DEFAULT 'LISTO',
    fk_id_producto     BIGINT REFERENCES hot_click_producto_tb(id_producto) ON DELETE SET NULL,
    notas_conflicto    TEXT,
    fecha_creacion     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_paquete_linea_estado CHECK (estado IN ('LISTO', 'CONFLICTO'))
);

CREATE INDEX IF NOT EXISTS idx_paquete_linea_paquete
    ON hot_click_paquete_linea_tb (fk_id_paquete);

CREATE UNIQUE INDEX IF NOT EXISTS idx_paquete_linea_barcode_unico
    ON hot_click_paquete_linea_tb (fk_id_paquete, barcode)
    WHERE barcode IS NOT NULL;

-- Unique barcode por empresa: solo si no hay duplicados previos.
-- Si existen duplicados, este índice no se crea en el mismo deploy (ver query de control).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM hot_click_producto_tb
    WHERE barcode IS NOT NULL
    GROUP BY fk_id_empresa, barcode
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_empresa_barcode
      ON hot_click_producto_tb (fk_id_empresa, barcode)
      WHERE barcode IS NOT NULL AND fk_id_empresa IS NOT NULL;
  END IF;
END $$;
