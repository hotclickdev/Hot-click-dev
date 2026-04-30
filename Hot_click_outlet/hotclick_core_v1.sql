-- ============================================================
-- HOT_CLICK - Base de Datos CORE v1.0
-- PostgreSQL 16 / Supabase
-- 23 tablas activas (17 con modelo Java + 6 por triggers/datos)
-- ============================================================

-- ============================================================
-- MODULO 0: ESTADOS GLOBALES
-- ============================================================
CREATE TABLE "HOT_CLICK_ESTADO_TB" (
  "ID_ESTADO"      integer PRIMARY KEY,
  "NOMBRE_ESTADO"  varchar(20)  NOT NULL,
  "DESCRIPCION"    varchar(100),
  "CODIGO_COLOR"   varchar(7)
);

-- ============================================================
-- MODULO 1: USUARIOS Y ROLES
-- ============================================================
CREATE TABLE "HOT_CLICK_ROL_TB" (
  "ID_ROL"       SERIAL PRIMARY KEY,
  "NOMBRE_ROL"   varchar(30) UNIQUE NOT NULL,
  "DESCRIPCION"  varchar(200),
  "NIVEL_ACCESO" integer NOT NULL DEFAULT 1,
  "FK_ID_ESTADO" integer NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_USUARIO_TB" (
  "ID_USUARIO"          SERIAL PRIMARY KEY,
  "IDENTIFICACION"      varchar(20)  UNIQUE NOT NULL,
  "NOMBRE"              varchar(50)  NOT NULL,
  "APELLIDO_PATERNO"    varchar(50)  NOT NULL,
  "APELLIDO_MATERNO"    varchar(50),
  "CORREO"              varchar(100) UNIQUE NOT NULL,
  "TELEFONO"            varchar(20)  NOT NULL,
  "TELEFONO_ALTERNO"    varchar(20),
  "CONTRASENA_HASH"     varchar(255) NOT NULL,
  "FOTO_PERFIL_URL"     varchar(500),
  "FECHA_REGISTRO"      timestamp    DEFAULT CURRENT_TIMESTAMP,
  "FECHA_ULTIMO_ACCESO" timestamp,
  "INTENTOS_FALLIDOS"   integer      DEFAULT 0,
  "BLOQUEADO_HASTA"     timestamp,
  "FK_ID_ESTADO"        integer      NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_USUARIO_ROL_TB" (
  "FK_ID_USUARIO"    integer   NOT NULL,
  "FK_ID_ROL"        integer   NOT NULL,
  "FECHA_ASIGNACION" timestamp DEFAULT CURRENT_TIMESTAMP,
  "ASIGNADO_POR"     integer,
  "FK_ID_ESTADO"     integer   NOT NULL DEFAULT 1,
  PRIMARY KEY ("FK_ID_USUARIO", "FK_ID_ROL")
);

-- ============================================================
-- MODULO 2: BODEGAS
-- ============================================================
CREATE TABLE "HOT_CLICK_BODEGA_TB" (
  "ID_BODEGA"          SERIAL PRIMARY KEY,
  "NOMBRE_BODEGA"      varchar(100) NOT NULL,
  "DIRECCION_EXACTA"   text         NOT NULL,
  "TELEFONO"           varchar(20)  NOT NULL,
  "CORREO_CONTACTO"    varchar(100),
  "HORARIO_APERTURA"   time,
  "HORARIO_CIERRE"     time,
  "LATITUD"            decimal(10,8),
  "LONGITUD"           decimal(11,8),
  "CAPACIDAD_MAXIMA"   integer,
  "ENCARGADO_NOMBRE"   varchar(100),
  "FK_ID_ADMIN_CLIENTE" integer NOT NULL,
  "FK_ID_ESTADO"       integer NOT NULL DEFAULT 1,
  "FECHA_CREACION"     timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MODULO 3: CATEGORIAS Y MARCAS
-- ============================================================
CREATE TABLE "HOT_CLICK_MARCA_TB" (
  "ID_MARCA"           SERIAL PRIMARY KEY,
  "NOMBRE_MARCA"       varchar(100) UNIQUE NOT NULL,
  "LOGO_URL"           varchar(500),
  "FK_ID_ADMIN_CLIENTE" integer NOT NULL,
  "FK_ID_ESTADO"       integer NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_CATEGORIA_TB" (
  "ID_CATEGORIA"          SERIAL PRIMARY KEY,
  "NOMBRE_CATEGORIA"      varchar(100) NOT NULL,
  "DESCRIPCION"           varchar(300),
  "IMAGEN_URL"            varchar(500),
  "ORDEN_DISPLAY"         integer DEFAULT 0,
  "FK_ID_CATEGORIA_PADRE" integer,
  "FK_ID_ADMIN_CLIENTE"   integer NOT NULL,
  "FK_ID_ESTADO"          integer NOT NULL DEFAULT 1
);

-- ============================================================
-- MODULO 4: PRODUCTOS
-- ============================================================
CREATE TABLE "HOT_CLICK_PRODUCTO_TB" (
  "ID_PRODUCTO"          SERIAL PRIMARY KEY,
  "NOMBRE_PRODUCTO"      varchar(200) NOT NULL,
  "DESCRIPCION_CORTA"    varchar(300),
  "DESCRIPCION_LARGA"    text,
  "PRECIO_COMPRA"        integer      NOT NULL,
  "PRECIO_VENTA"         integer      NOT NULL,
  "MARGEN_GANANCIA"      decimal(8,2),
  "ROI_PORCENTAJE"       decimal(8,2),
  "COSTO_ENVIO_ESTIMADO" integer,
  "COSTO_ALMACENAJE"     integer,
  "LINK_AMAZON"          varchar(500),
  "STOCK_ACTUAL"         integer      NOT NULL DEFAULT 0,
  "STOCK_MINIMO"         integer      NOT NULL DEFAULT 5,
  "STOCK_MAXIMO"         integer,
  "UNIDAD_MEDIDA"        varchar(20)  DEFAULT 'UNIDAD',
  "PESO_EN_GRAMOS"       integer,
  "DIMENSIONES"          json,
  "SKU"                  varchar(50)  UNIQUE NOT NULL,
  "MARCA"                varchar(100),
  "MODELO"               varchar(100),
  "RANGO_PRECIO"         varchar(20),
  "ES_UNICO"             boolean      NOT NULL DEFAULT false,
  "VENDIDO"              boolean      NOT NULL DEFAULT false,
  "DESTACADO"            boolean      NOT NULL DEFAULT false,
  "VISIBLE_CATALOGO"     boolean      NOT NULL DEFAULT true,
  "FK_ID_BODEGA"         integer      NOT NULL,
  "FK_ID_CATEGORIA"      integer      NOT NULL,
  "FK_ID_MARCA"          integer,
  "FK_ID_ADMIN_CLIENTE"  integer      NOT NULL,
  "FK_ID_ESTADO"         integer      NOT NULL DEFAULT 1,
  "FECHA_CREACION"       timestamp    DEFAULT CURRENT_TIMESTAMP,
  "FECHA_ULTIMA_COMPRA"  date,
  "PROVEEDOR_PRINCIPAL"  varchar(100),
  "TIEMPO_REORDEN_DIAS"  integer      DEFAULT 7
);

CREATE TABLE "HOT_CLICK_PRODUCTO_IMAGEN_TB" (
  "ID_IMAGEN"              SERIAL PRIMARY KEY,
  "URL_IMAGEN"             varchar(500) NOT NULL,
  "PUBLIC_ID_CLOUDINARY"   varchar(200),
  "POSICION"               integer      DEFAULT 0,
  "ES_PRINCIPAL"           boolean      DEFAULT false,
  "ALT_TEXT"               varchar(200),
  "FK_ID_PRODUCTO"         integer      NOT NULL,
  "FK_ID_ESTADO"           integer      NOT NULL DEFAULT 1
);

-- ============================================================
-- MODULO 5: METODOS DE ENVIO Y PAGO (datos de referencia)
-- ============================================================
CREATE TABLE "HOT_CLICK_METODO_ENVIO_TB" (
  "ID_METODO_ENVIO"       SERIAL PRIMARY KEY,
  "NOMBRE_ENVIO"          varchar(50) NOT NULL,
  "COSTO_BASE"            integer     DEFAULT 0,
  "TIEMPO_ESTIMADO_DIAS"  integer     DEFAULT 0,
  "ACTIVO"                boolean     DEFAULT true,
  "FK_ID_ESTADO"          integer     NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_METODO_PAGO_CONFIG_TB" (
  "ID_METODO_PAGO_CONFIG" SERIAL PRIMARY KEY,
  "NOMBRE"                varchar(50) NOT NULL,
  "ACTIVO"                boolean     DEFAULT true,
  "ORDEN"                 integer     DEFAULT 0,
  "FK_ID_ESTADO"          integer     NOT NULL DEFAULT 1
);

-- ============================================================
-- MODULO 6: CARRITO
-- ============================================================
CREATE TABLE "HOT_CLICK_CARRITO_TB" (
  "ID_CARRITO"           SERIAL PRIMARY KEY,
  "FECHA_CREACION"       timestamp  DEFAULT CURRENT_TIMESTAMP,
  "FECHA_ACTUALIZACION"  timestamp  DEFAULT CURRENT_TIMESTAMP,
  "TOTAL_CARRITO"        integer    DEFAULT 0,
  "ESTADO_CARRITO"       varchar(20) DEFAULT 'ACTIVO',
  "FK_ID_USUARIO_FINAL"  integer    NOT NULL,
  "FK_ID_ESTADO"         integer    NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_CARRITO_ITEM_TB" (
  "ID_CARRITO_ITEM"          SERIAL PRIMARY KEY,
  "CANTIDAD"                 integer NOT NULL DEFAULT 1,
  "PRECIO_UNITARIO_MOMENTO"  integer NOT NULL,
  "FK_ID_CARRITO"            integer NOT NULL,
  "FK_ID_PRODUCTO"           integer NOT NULL,
  "FK_ID_ESTADO"             integer NOT NULL DEFAULT 1
);

-- ============================================================
-- MODULO 7: PEDIDOS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS seq_pedido START 1000;

CREATE TABLE "HOT_CLICK_PEDIDO_TB" (
  "ID_PEDIDO"                  BIGSERIAL PRIMARY KEY,
  "NUMERO_PEDIDO"              varchar(20) UNIQUE NOT NULL DEFAULT ('ORD-' || NEXTVAL('seq_pedido')),
  "FECHA_PEDIDO"               timestamp   DEFAULT CURRENT_TIMESTAMP,
  "FECHA_ENTREGA_ESTIMADA"     date,
  "FECHA_ENTREGA_REAL"         date,
  "SUBTOTAL"                   integer     NOT NULL,
  "DESCUENTO_TOTAL"            integer     DEFAULT 0,
  "APLICA_IMPUESTO"            boolean     DEFAULT false,
  "MONTO_IMPUESTO"             integer     DEFAULT 0,
  "TOTAL_PEDIDO"               integer     NOT NULL,
  "COSTO_ENVIO"                integer     DEFAULT 0,
  "COSTO_TOTAL_PRODUCTOS"      integer     NOT NULL,
  "UTILIDAD_BRUTA"             integer     NOT NULL,
  "MARGEN_GANANCIA_PEDIDO"     decimal(8,2),
  "ESTADO_PEDIDO"              varchar(20) DEFAULT 'PENDIENTE',
  "METODO_PAGO"                varchar(30) NOT NULL,
  "METODO_ENVIO"               varchar(30) NOT NULL,
  "NOTAS"                      text,
  "FACTURA_GENERADA"           boolean     DEFAULT false,
  "FACTURA_ENVIADA_WHATSAPP"   boolean     DEFAULT false,
  "FK_ID_USUARIO_FINAL"        integer     NOT NULL,
  "FK_ID_BODEGA"               integer     NOT NULL,
  "FK_ID_ESTADO"               integer     NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_PEDIDO_ITEM_TB" (
  "ID_PEDIDO_ITEM"           BIGSERIAL PRIMARY KEY,
  "CANTIDAD"                 integer     NOT NULL,
  "PRECIO_UNITARIO_MOMENTO"  integer     NOT NULL,
  "COSTO_UNITARIO_MOMENTO"   integer     NOT NULL,
  "DESCUENTO_APLICADO"       integer     DEFAULT 0,
  "SUBTOTAL_ITEM"            integer     NOT NULL,
  "UTILIDAD_ITEM"            integer     NOT NULL,
  "FK_ID_PEDIDO"             bigint      NOT NULL,
  "FK_ID_PRODUCTO"           integer     NOT NULL,
  "FK_ID_ESTADO"             integer     NOT NULL DEFAULT 1
);

-- Historial de cambios de estado de pedido (útil para auditoría)
CREATE TABLE "HOT_CLICK_PEDIDO_HISTORIAL_ESTADO_TB" (
  "ID_HISTORIAL_ESTADO"  BIGSERIAL PRIMARY KEY,
  "ESTADO_ANTERIOR"      varchar(20),
  "ESTADO_NUEVO"         varchar(20) NOT NULL,
  "FECHA_CAMBIO"         timestamp   DEFAULT CURRENT_TIMESTAMP,
  "COMENTARIO"           text,
  "FK_ID_PEDIDO"         bigint      NOT NULL,
  "FK_ID_USUARIO"        integer     NOT NULL,
  "FK_ID_ESTADO"         integer     NOT NULL DEFAULT 1
);

-- ============================================================
-- MODULO 8: RULETA Y PREMIOS
-- ============================================================
CREATE TABLE "HOT_CLICK_PREMIO_TB" (
  "ID_PREMIO"             SERIAL PRIMARY KEY,
  "NOMBRE_PREMIO"         varchar(100) NOT NULL,
  "DESCRIPCION"           text,
  "TIPO_PREMIO"           varchar(30)  NOT NULL,
  "VALOR_PREMIO"          integer      DEFAULT 0,
  "FK_ID_PRODUCTO_PREMIO" integer,
  "PROBABILIDAD"          decimal(5,2) NOT NULL,
  "STOCK_DISPONIBLE"      integer      DEFAULT -1,
  "COLOR_RULETA"          varchar(7)   NOT NULL,
  "ICONO_URL"             varchar(500),
  "ACTIVO"                boolean      DEFAULT true,
  "FECHA_INICIO"          timestamp,
  "FECHA_FIN"             timestamp,
  "FK_ID_ADMIN_CLIENTE"   integer      NOT NULL,
  "FK_ID_ESTADO"          integer      NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_GIRO_RULETA_TB" (
  "ID_GIRO"             BIGSERIAL PRIMARY KEY,
  "TIPO_ORIGEN"         varchar(30) NOT NULL,
  "USADO"               boolean     DEFAULT false,
  "FECHA_ASIGNACION"    timestamp   DEFAULT CURRENT_TIMESTAMP,
  "FECHA_USO"           timestamp,
  "FK_ID_USUARIO_FINAL" integer     NOT NULL,
  "FK_ID_PEDIDO"        bigint,
  "FK_ID_ESTADO"        integer     NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_RESULTADO_RULETA_TB" (
  "ID_RESULTADO"        BIGSERIAL PRIMARY KEY,
  "FECHA_GIRO"          timestamp   DEFAULT CURRENT_TIMESTAMP,
  "CODIGO_CANJE"        varchar(20) UNIQUE,
  "CANJEADO"            boolean     DEFAULT false,
  "FECHA_CANJE"         timestamp,
  "EXPIRA_EN"           timestamp,
  "FK_ID_GIRO"          bigint      NOT NULL UNIQUE,
  "FK_ID_USUARIO_FINAL" integer     NOT NULL,
  "FK_ID_PREMIO"        integer     NOT NULL,
  "FK_ID_ESTADO"        integer     NOT NULL DEFAULT 1
);

-- ============================================================
-- MODULO 9: REFERIDOS
-- ============================================================
CREATE TABLE "HOT_CLICK_REFERIDO_TB" (
  "ID_REFERIDO"             SERIAL PRIMARY KEY,
  "CODIGO_REFERIDO"         varchar(20) UNIQUE NOT NULL,
  "TOTAL_REFERIDOS"         integer     DEFAULT 0,
  "GIROS_GANADOS"           integer     DEFAULT 0,
  "FECHA_CREACION"          timestamp   DEFAULT CURRENT_TIMESTAMP,
  "FK_ID_USUARIO_REFERIDOR" integer     NOT NULL,
  "FK_ID_ESTADO"            integer     NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_REFERIDO_DETALLE_TB" (
  "ID_REFERIDO_DETALLE"  SERIAL PRIMARY KEY,
  "FECHA_REGISTRO"       timestamp DEFAULT CURRENT_TIMESTAMP,
  "GIRO_OTORGADO"        boolean   DEFAULT false,
  "FK_ID_REFERIDO"       integer   NOT NULL,
  "FK_ID_USUARIO_NUEVO"  integer   NOT NULL,
  "FK_ID_ESTADO"         integer   NOT NULL DEFAULT 1
);

-- ============================================================
-- MODULO 10: LOGS Y HISTORIAL (usados por triggers)
-- ============================================================
CREATE TABLE "HOT_CLICK_LOG_CONEXION_TB" (
  "ID_CONEXION"    BIGSERIAL PRIMARY KEY,
  "ACCION"         varchar(20) NOT NULL,
  "IP_ADDRESS"     varchar(45),
  "EXITOSO"        boolean     DEFAULT false,
  "FECHA_INTENTO"  timestamp   DEFAULT CURRENT_TIMESTAMP,
  "FK_ID_USUARIO"  integer,
  "FK_ID_ESTADO"   integer     NOT NULL DEFAULT 1
);

CREATE TABLE "HOT_CLICK_HISTORIAL_CLIENTE_TB" (
  "ID_HISTORIAL"          BIGSERIAL PRIMARY KEY,
  "TOTAL_COMPRAS"         integer   DEFAULT 0,
  "MONTO_TOTAL_GASTADO"   integer   DEFAULT 0,
  "PRIMERA_COMPRA"        timestamp,
  "ULTIMA_COMPRA"         timestamp,
  "PRODUCTO_FAVORITO"     varchar(200),
  "CATEGORIA_FAVORITA"    varchar(100),
  "PROMEDIO_COMPRA"       integer   DEFAULT 0,
  "FECHA_ACTUALIZACION"   timestamp DEFAULT CURRENT_TIMESTAMP,
  "FK_ID_USUARIO_FINAL"   integer   NOT NULL UNIQUE,
  "FK_ID_ESTADO"          integer   NOT NULL DEFAULT 1
);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

-- Estados
ALTER TABLE "HOT_CLICK_ROL_TB"          ADD FOREIGN KEY ("FK_ID_ESTADO") REFERENCES "HOT_CLICK_ESTADO_TB" ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_USUARIO_TB"       ADD FOREIGN KEY ("FK_ID_ESTADO") REFERENCES "HOT_CLICK_ESTADO_TB" ("ID_ESTADO");

-- Usuarios / Roles
ALTER TABLE "HOT_CLICK_USUARIO_ROL_TB"  ADD FOREIGN KEY ("FK_ID_USUARIO") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_USUARIO_ROL_TB"  ADD FOREIGN KEY ("FK_ID_ROL")     REFERENCES "HOT_CLICK_ROL_TB"     ("ID_ROL");
ALTER TABLE "HOT_CLICK_USUARIO_ROL_TB"  ADD FOREIGN KEY ("FK_ID_ESTADO")  REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

-- Bodegas
ALTER TABLE "HOT_CLICK_BODEGA_TB"       ADD FOREIGN KEY ("FK_ID_ADMIN_CLIENTE") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_BODEGA_TB"       ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

-- Marcas
ALTER TABLE "HOT_CLICK_MARCA_TB"        ADD FOREIGN KEY ("FK_ID_ADMIN_CLIENTE") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_MARCA_TB"        ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

-- Categorias
ALTER TABLE "HOT_CLICK_CATEGORIA_TB"    ADD FOREIGN KEY ("FK_ID_CATEGORIA_PADRE") REFERENCES "HOT_CLICK_CATEGORIA_TB" ("ID_CATEGORIA");
ALTER TABLE "HOT_CLICK_CATEGORIA_TB"    ADD FOREIGN KEY ("FK_ID_ADMIN_CLIENTE")   REFERENCES "HOT_CLICK_USUARIO_TB"   ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_CATEGORIA_TB"    ADD FOREIGN KEY ("FK_ID_ESTADO")          REFERENCES "HOT_CLICK_ESTADO_TB"    ("ID_ESTADO");

-- Productos
ALTER TABLE "HOT_CLICK_PRODUCTO_TB"     ADD FOREIGN KEY ("FK_ID_BODEGA")        REFERENCES "HOT_CLICK_BODEGA_TB"    ("ID_BODEGA");
ALTER TABLE "HOT_CLICK_PRODUCTO_TB"     ADD FOREIGN KEY ("FK_ID_CATEGORIA")     REFERENCES "HOT_CLICK_CATEGORIA_TB" ("ID_CATEGORIA");
ALTER TABLE "HOT_CLICK_PRODUCTO_TB"     ADD FOREIGN KEY ("FK_ID_MARCA")         REFERENCES "HOT_CLICK_MARCA_TB"     ("ID_MARCA");
ALTER TABLE "HOT_CLICK_PRODUCTO_TB"     ADD FOREIGN KEY ("FK_ID_ADMIN_CLIENTE") REFERENCES "HOT_CLICK_USUARIO_TB"   ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_PRODUCTO_TB"     ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"    ("ID_ESTADO");

-- Imágenes
ALTER TABLE "HOT_CLICK_PRODUCTO_IMAGEN_TB" ADD FOREIGN KEY ("FK_ID_PRODUCTO") REFERENCES "HOT_CLICK_PRODUCTO_TB" ("ID_PRODUCTO");
ALTER TABLE "HOT_CLICK_PRODUCTO_IMAGEN_TB" ADD FOREIGN KEY ("FK_ID_ESTADO")   REFERENCES "HOT_CLICK_ESTADO_TB"   ("ID_ESTADO");

-- Métodos
ALTER TABLE "HOT_CLICK_METODO_ENVIO_TB"       ADD FOREIGN KEY ("FK_ID_ESTADO") REFERENCES "HOT_CLICK_ESTADO_TB" ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_METODO_PAGO_CONFIG_TB" ADD FOREIGN KEY ("FK_ID_ESTADO") REFERENCES "HOT_CLICK_ESTADO_TB" ("ID_ESTADO");

-- Carrito
ALTER TABLE "HOT_CLICK_CARRITO_TB"      ADD FOREIGN KEY ("FK_ID_USUARIO_FINAL") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_CARRITO_TB"      ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_CARRITO_ITEM_TB" ADD FOREIGN KEY ("FK_ID_CARRITO")       REFERENCES "HOT_CLICK_CARRITO_TB" ("ID_CARRITO");
ALTER TABLE "HOT_CLICK_CARRITO_ITEM_TB" ADD FOREIGN KEY ("FK_ID_PRODUCTO")      REFERENCES "HOT_CLICK_PRODUCTO_TB" ("ID_PRODUCTO");
ALTER TABLE "HOT_CLICK_CARRITO_ITEM_TB" ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

-- Pedidos
ALTER TABLE "HOT_CLICK_PEDIDO_TB"       ADD FOREIGN KEY ("FK_ID_USUARIO_FINAL") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_PEDIDO_TB"       ADD FOREIGN KEY ("FK_ID_BODEGA")        REFERENCES "HOT_CLICK_BODEGA_TB"  ("ID_BODEGA");
ALTER TABLE "HOT_CLICK_PEDIDO_TB"       ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_PEDIDO_ITEM_TB"  ADD FOREIGN KEY ("FK_ID_PEDIDO")        REFERENCES "HOT_CLICK_PEDIDO_TB"  ("ID_PEDIDO");
ALTER TABLE "HOT_CLICK_PEDIDO_ITEM_TB"  ADD FOREIGN KEY ("FK_ID_PRODUCTO")      REFERENCES "HOT_CLICK_PRODUCTO_TB" ("ID_PRODUCTO");
ALTER TABLE "HOT_CLICK_PEDIDO_ITEM_TB"  ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_PEDIDO_HISTORIAL_ESTADO_TB" ADD FOREIGN KEY ("FK_ID_PEDIDO")  REFERENCES "HOT_CLICK_PEDIDO_TB"  ("ID_PEDIDO");
ALTER TABLE "HOT_CLICK_PEDIDO_HISTORIAL_ESTADO_TB" ADD FOREIGN KEY ("FK_ID_USUARIO") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_PEDIDO_HISTORIAL_ESTADO_TB" ADD FOREIGN KEY ("FK_ID_ESTADO")  REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

-- Premios y Ruleta
ALTER TABLE "HOT_CLICK_PREMIO_TB"          ADD FOREIGN KEY ("FK_ID_PRODUCTO_PREMIO") REFERENCES "HOT_CLICK_PRODUCTO_TB"   ("ID_PRODUCTO");
ALTER TABLE "HOT_CLICK_PREMIO_TB"          ADD FOREIGN KEY ("FK_ID_ADMIN_CLIENTE")   REFERENCES "HOT_CLICK_USUARIO_TB"    ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_PREMIO_TB"          ADD FOREIGN KEY ("FK_ID_ESTADO")          REFERENCES "HOT_CLICK_ESTADO_TB"     ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_GIRO_RULETA_TB"     ADD FOREIGN KEY ("FK_ID_USUARIO_FINAL")   REFERENCES "HOT_CLICK_USUARIO_TB"    ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_GIRO_RULETA_TB"     ADD FOREIGN KEY ("FK_ID_PEDIDO")          REFERENCES "HOT_CLICK_PEDIDO_TB"     ("ID_PEDIDO");
ALTER TABLE "HOT_CLICK_GIRO_RULETA_TB"     ADD FOREIGN KEY ("FK_ID_ESTADO")          REFERENCES "HOT_CLICK_ESTADO_TB"     ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_RESULTADO_RULETA_TB" ADD FOREIGN KEY ("FK_ID_GIRO")           REFERENCES "HOT_CLICK_GIRO_RULETA_TB"    ("ID_GIRO");
ALTER TABLE "HOT_CLICK_RESULTADO_RULETA_TB" ADD FOREIGN KEY ("FK_ID_USUARIO_FINAL")  REFERENCES "HOT_CLICK_USUARIO_TB"        ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_RESULTADO_RULETA_TB" ADD FOREIGN KEY ("FK_ID_PREMIO")         REFERENCES "HOT_CLICK_PREMIO_TB"         ("ID_PREMIO");
ALTER TABLE "HOT_CLICK_RESULTADO_RULETA_TB" ADD FOREIGN KEY ("FK_ID_ESTADO")         REFERENCES "HOT_CLICK_ESTADO_TB"         ("ID_ESTADO");

-- Referidos
ALTER TABLE "HOT_CLICK_REFERIDO_TB"         ADD FOREIGN KEY ("FK_ID_USUARIO_REFERIDOR") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_REFERIDO_TB"         ADD FOREIGN KEY ("FK_ID_ESTADO")            REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_REFERIDO_DETALLE_TB" ADD FOREIGN KEY ("FK_ID_REFERIDO")          REFERENCES "HOT_CLICK_REFERIDO_TB" ("ID_REFERIDO");
ALTER TABLE "HOT_CLICK_REFERIDO_DETALLE_TB" ADD FOREIGN KEY ("FK_ID_USUARIO_NUEVO")     REFERENCES "HOT_CLICK_USUARIO_TB"  ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_REFERIDO_DETALLE_TB" ADD FOREIGN KEY ("FK_ID_ESTADO")            REFERENCES "HOT_CLICK_ESTADO_TB"   ("ID_ESTADO");

-- Logs e historial
ALTER TABLE "HOT_CLICK_LOG_CONEXION_TB"     ADD FOREIGN KEY ("FK_ID_USUARIO") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_LOG_CONEXION_TB"     ADD FOREIGN KEY ("FK_ID_ESTADO")  REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");
ALTER TABLE "HOT_CLICK_HISTORIAL_CLIENTE_TB" ADD FOREIGN KEY ("FK_ID_USUARIO_FINAL") REFERENCES "HOT_CLICK_USUARIO_TB" ("ID_USUARIO");
ALTER TABLE "HOT_CLICK_HISTORIAL_CLIENTE_TB" ADD FOREIGN KEY ("FK_ID_ESTADO")        REFERENCES "HOT_CLICK_ESTADO_TB"  ("ID_ESTADO");

-- ============================================================
-- INDICES
-- ============================================================
CREATE INDEX idx_producto_categoria  ON "HOT_CLICK_PRODUCTO_TB" ("FK_ID_CATEGORIA");
CREATE INDEX idx_producto_unico      ON "HOT_CLICK_PRODUCTO_TB" ("ES_UNICO", "VENDIDO");
CREATE INDEX idx_producto_visible    ON "HOT_CLICK_PRODUCTO_TB" ("VISIBLE_CATALOGO", "FK_ID_ESTADO");
CREATE INDEX idx_pedido_usuario      ON "HOT_CLICK_PEDIDO_TB"   ("FK_ID_USUARIO_FINAL");
CREATE INDEX idx_pedido_fecha        ON "HOT_CLICK_PEDIDO_TB"   ("FECHA_PEDIDO");
CREATE INDEX idx_giro_usuario        ON "HOT_CLICK_GIRO_RULETA_TB"     ("FK_ID_USUARIO_FINAL", "USADO");
CREATE INDEX idx_historial_cliente   ON "HOT_CLICK_HISTORIAL_CLIENTE_TB" ("FK_ID_USUARIO_FINAL");
CREATE INDEX idx_log_conexion_usuario ON "HOT_CLICK_LOG_CONEXION_TB" ("FK_ID_USUARIO");
CREATE INDEX idx_carrito_usuario     ON "HOT_CLICK_CARRITO_TB"  ("FK_ID_USUARIO_FINAL");

-- ============================================================
-- TRIGGERS
-- ============================================================

-- TRIGGER 1: Validar stock antes de agregar al carrito
CREATE OR REPLACE FUNCTION fn_validar_stock_carrito()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual INTEGER;
    v_es_unico     BOOLEAN;
    v_vendido      BOOLEAN;
BEGIN
    SELECT stock_actual, es_unico, vendido
    INTO v_stock_actual, v_es_unico, v_vendido
    FROM "HOT_CLICK_PRODUCTO_TB"
    WHERE id_producto = NEW.fk_id_producto;

    IF v_es_unico AND v_vendido THEN
        RAISE EXCEPTION 'Este artículo único ya fue vendido';
    END IF;

    IF NEW.cantidad > v_stock_actual THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_stock_actual;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_validar_stock_carrito
    BEFORE INSERT OR UPDATE ON "HOT_CLICK_CARRITO_ITEM_TB"
    FOR EACH ROW EXECUTE FUNCTION fn_validar_stock_carrito();

-- TRIGGER 2: Marcar artículo único como vendido al generar pedido
CREATE OR REPLACE FUNCTION fn_marcar_unico_vendido()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "HOT_CLICK_PRODUCTO_TB"
    SET vendido          = true,
        stock_actual     = 0,
        visible_catalogo = false
    WHERE id_producto = NEW.fk_id_producto
      AND es_unico = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_marcar_unico_vendido
    AFTER INSERT ON "HOT_CLICK_PEDIDO_ITEM_TB"
    FOR EACH ROW EXECUTE FUNCTION fn_marcar_unico_vendido();

-- TRIGGER 3: Recalcular total del carrito automáticamente
CREATE OR REPLACE FUNCTION fn_actualizar_total_carrito()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "HOT_CLICK_CARRITO_TB"
    SET total_carrito = (
        SELECT COALESCE(SUM(cantidad * precio_unitario_momento), 0)
        FROM "HOT_CLICK_CARRITO_ITEM_TB"
        WHERE fk_id_carrito = COALESCE(NEW.fk_id_carrito, OLD.fk_id_carrito)
          AND fk_id_estado = 1
    ),
    fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id_carrito = COALESCE(NEW.fk_id_carrito, OLD.fk_id_carrito);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_actualizar_total_carrito
    AFTER INSERT OR UPDATE OR DELETE ON "HOT_CLICK_CARRITO_ITEM_TB"
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_total_carrito();

-- TRIGGER 4: Controlar intentos fallidos de login y bloqueo de cuenta
CREATE OR REPLACE FUNCTION fn_control_intentos_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW.exitoso THEN
        UPDATE "HOT_CLICK_USUARIO_TB"
        SET intentos_fallidos = intentos_fallidos + 1,
            bloqueado_hasta   = CASE
                WHEN intentos_fallidos + 1 >= 5
                THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
                ELSE bloqueado_hasta
            END
        WHERE id_usuario = NEW.fk_id_usuario;
    ELSE
        UPDATE "HOT_CLICK_USUARIO_TB"
        SET intentos_fallidos    = 0,
            bloqueado_hasta      = NULL,
            fecha_ultimo_acceso  = CURRENT_TIMESTAMP
        WHERE id_usuario = NEW.fk_id_usuario;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_control_intentos_login
    AFTER INSERT ON "HOT_CLICK_LOG_CONEXION_TB"
    FOR EACH ROW EXECUTE FUNCTION fn_control_intentos_login();

-- TRIGGER 5: Asignar giro de ruleta y crear historial al registrarse
CREATE OR REPLACE FUNCTION fn_giro_por_registro()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "HOT_CLICK_GIRO_RULETA_TB" (tipo_origen, fk_id_usuario_final, fk_id_estado)
    VALUES ('REGISTRO', NEW.id_usuario, 1);

    INSERT INTO "HOT_CLICK_HISTORIAL_CLIENTE_TB" (fk_id_usuario_final, fk_id_estado)
    VALUES (NEW.id_usuario, 1)
    ON CONFLICT (fk_id_usuario_final) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_giro_por_registro
    AFTER INSERT ON "HOT_CLICK_USUARIO_TB"
    FOR EACH ROW EXECUTE FUNCTION fn_giro_por_registro();

-- TRIGGER 6: Asignar giro y actualizar historial cuando un pedido se completa
CREATE OR REPLACE FUNCTION fn_giro_por_compra()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado_pedido = 'COMPLETADO' AND OLD.estado_pedido != 'COMPLETADO' THEN
        INSERT INTO "HOT_CLICK_GIRO_RULETA_TB" (tipo_origen, fk_id_usuario_final, fk_id_pedido, fk_id_estado)
        VALUES ('COMPRA', NEW.fk_id_usuario_final, NEW.id_pedido, 1);

        UPDATE "HOT_CLICK_HISTORIAL_CLIENTE_TB"
        SET total_compras       = total_compras + 1,
            monto_total_gastado = monto_total_gastado + NEW.total_pedido,
            ultima_compra       = CURRENT_TIMESTAMP,
            promedio_compra     = (monto_total_gastado + NEW.total_pedido) / (total_compras + 1),
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE fk_id_usuario_final = NEW.fk_id_usuario_final;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_giro_por_compra
    AFTER UPDATE ON "HOT_CLICK_PEDIDO_TB"
    FOR EACH ROW EXECUTE FUNCTION fn_giro_por_compra();

-- TRIGGER 7: Garantizar una sola imagen principal por producto
CREATE OR REPLACE FUNCTION fn_unica_imagen_principal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.es_principal THEN
        UPDATE "HOT_CLICK_PRODUCTO_IMAGEN_TB"
        SET es_principal = false
        WHERE fk_id_producto = NEW.fk_id_producto
          AND id_imagen != NEW.id_imagen;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_unica_imagen_principal
    BEFORE INSERT OR UPDATE ON "HOT_CLICK_PRODUCTO_IMAGEN_TB"
    FOR EACH ROW EXECUTE FUNCTION fn_unica_imagen_principal();

-- ============================================================
-- PROCEDIMIENTOS
-- ============================================================

-- Convierte el carrito activo en un pedido
CREATE OR REPLACE FUNCTION fn_convertir_carrito_a_pedido(
    p_id_carrito  INTEGER,
    p_id_usuario  INTEGER,
    p_metodo_pago VARCHAR(30),
    p_metodo_envio VARCHAR(30),
    p_id_bodega   INTEGER
) RETURNS BIGINT AS $$
DECLARE
    v_id_pedido   BIGINT;
    v_subtotal    INTEGER := 0;
    v_costo_total INTEGER := 0;
BEGIN
    SELECT
        SUM(ci.cantidad * ci.precio_unitario_momento),
        SUM(ci.cantidad * p.precio_compra)
    INTO v_subtotal, v_costo_total
    FROM "HOT_CLICK_CARRITO_ITEM_TB" ci
    JOIN "HOT_CLICK_PRODUCTO_TB" p ON ci.fk_id_producto = p.id_producto
    WHERE ci.fk_id_carrito = p_id_carrito;

    INSERT INTO "HOT_CLICK_PEDIDO_TB" (
        subtotal, total_pedido, costo_total_productos, utilidad_bruta,
        metodo_pago, metodo_envio, fk_id_usuario_final, fk_id_bodega, fk_id_estado
    ) VALUES (
        v_subtotal, v_subtotal, v_costo_total, v_subtotal - v_costo_total,
        p_metodo_pago, p_metodo_envio, p_id_usuario, p_id_bodega, 1
    ) RETURNING id_pedido INTO v_id_pedido;

    INSERT INTO "HOT_CLICK_PEDIDO_ITEM_TB" (
        cantidad, precio_unitario_momento, costo_unitario_momento,
        subtotal_item, utilidad_item, fk_id_pedido, fk_id_producto, fk_id_estado
    )
    SELECT
        ci.cantidad,
        ci.precio_unitario_momento,
        p.precio_compra,
        ci.cantidad * ci.precio_unitario_momento,
        ci.cantidad * (ci.precio_unitario_momento - p.precio_compra),
        v_id_pedido,
        ci.fk_id_producto,
        1
    FROM "HOT_CLICK_CARRITO_ITEM_TB" ci
    JOIN "HOT_CLICK_PRODUCTO_TB" p ON ci.fk_id_producto = p.id_producto
    WHERE ci.fk_id_carrito = p_id_carrito;

    UPDATE "HOT_CLICK_CARRITO_TB"
    SET estado_carrito = 'CONVERTIDO', fk_id_estado = 2
    WHERE id_carrito = p_id_carrito;

    RETURN v_id_pedido;
END;
$$ LANGUAGE plpgsql;

-- Ejecuta un giro de ruleta y devuelve el ID del resultado
CREATE OR REPLACE FUNCTION fn_girar_ruleta(
    p_id_giro    BIGINT,
    p_id_usuario INTEGER
) RETURNS BIGINT AS $$
DECLARE
    v_premio_ganado INTEGER;
    v_codigo_canje  VARCHAR(20);
    v_id_resultado  BIGINT;
    v_random        DECIMAL(5,2);
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "HOT_CLICK_GIRO_RULETA_TB"
        WHERE id_giro = p_id_giro
          AND fk_id_usuario_final = p_id_usuario
          AND usado = false
    ) THEN
        RAISE EXCEPTION 'Giro inválido o ya utilizado';
    END IF;

    v_random := ROUND((RANDOM() * 100)::DECIMAL, 2);

    SELECT id_premio INTO v_premio_ganado
    FROM (
        SELECT id_premio,
               SUM(probabilidad) OVER (ORDER BY id_premio) AS prob_acumulada
        FROM "HOT_CLICK_PREMIO_TB"
        WHERE activo = true
          AND fk_id_estado = 1
          AND (fecha_fin IS NULL OR fecha_fin > CURRENT_TIMESTAMP)
    ) t
    WHERE v_random <= prob_acumulada
    ORDER BY prob_acumulada
    LIMIT 1;

    v_codigo_canje := 'HC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));

    INSERT INTO "HOT_CLICK_RESULTADO_RULETA_TB" (
        fk_id_giro, fk_id_usuario_final, fk_id_premio,
        codigo_canje, expira_en, fk_id_estado
    ) VALUES (
        p_id_giro, p_id_usuario, v_premio_ganado,
        v_codigo_canje, CURRENT_TIMESTAMP + INTERVAL '30 days', 1
    ) RETURNING id_resultado INTO v_id_resultado;

    UPDATE "HOT_CLICK_GIRO_RULETA_TB"
    SET usado = true, fecha_uso = CURRENT_TIMESTAMP
    WHERE id_giro = p_id_giro;

    RETURN v_id_resultado;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VISTAS
-- ============================================================

CREATE OR REPLACE VIEW VISTA_CATALOGO_PUBLICO AS
SELECT
    p.id_producto,
    p.nombre_producto,
    p.descripcion_corta,
    p.precio_venta,
    p.stock_actual,
    p.es_unico,
    p.vendido,
    p.destacado,
    c.nombre_categoria,
    m.nombre_marca,
    pi.url_imagen AS imagen_principal
FROM "HOT_CLICK_PRODUCTO_TB" p
JOIN "HOT_CLICK_CATEGORIA_TB" c      ON p.fk_id_categoria = c.id_categoria
LEFT JOIN "HOT_CLICK_MARCA_TB" m     ON p.fk_id_marca     = m.id_marca
LEFT JOIN "HOT_CLICK_PRODUCTO_IMAGEN_TB" pi ON pi.fk_id_producto = p.id_producto AND pi.es_principal = true
WHERE p.visible_catalogo = true
  AND p.fk_id_estado = 1
  AND (p.es_unico = false OR p.vendido = false);

CREATE OR REPLACE VIEW VISTA_PRODUCTOS_UNICOS AS
SELECT
    p.id_producto,
    p.nombre_producto,
    p.precio_venta,
    p.precio_compra,
    p.margen_ganancia,
    p.vendido,
    p.visible_catalogo,
    c.nombre_categoria,
    b.nombre_bodega
FROM "HOT_CLICK_PRODUCTO_TB" p
JOIN "HOT_CLICK_CATEGORIA_TB" c ON p.fk_id_categoria = c.id_categoria
JOIN "HOT_CLICK_BODEGA_TB"    b ON p.fk_id_bodega    = b.id_bodega
WHERE p.es_unico = true
  AND p.fk_id_estado = 1
ORDER BY p.vendido ASC, p.fecha_creacion DESC;

CREATE OR REPLACE VIEW VISTA_PREMIOS_ACTIVOS AS
SELECT
    p.id_premio,
    p.nombre_premio,
    p.tipo_premio,
    p.valor_premio,
    p.probabilidad,
    p.color_ruleta,
    p.stock_disponible,
    COUNT(rr.id_resultado) AS veces_ganado
FROM "HOT_CLICK_PREMIO_TB" p
LEFT JOIN "HOT_CLICK_RESULTADO_RULETA_TB" rr ON rr.fk_id_premio = p.id_premio
WHERE p.activo = true
  AND p.fk_id_estado = 1
  AND (p.fecha_fin IS NULL OR p.fecha_fin > CURRENT_TIMESTAMP)
GROUP BY p.id_premio, p.nombre_premio, p.tipo_premio,
         p.valor_premio, p.probabilidad, p.color_ruleta, p.stock_disponible;

CREATE OR REPLACE VIEW VISTA_STOCK_CRITICO AS
SELECT
    p.id_producto,
    p.nombre_producto,
    p.stock_actual,
    p.stock_minimo,
    p.es_unico,
    c.nombre_categoria
FROM "HOT_CLICK_PRODUCTO_TB" p
JOIN "HOT_CLICK_CATEGORIA_TB" c ON p.fk_id_categoria = c.id_categoria
WHERE p.stock_actual <= p.stock_minimo
  AND p.es_unico = false
  AND p.fk_id_estado = 1
ORDER BY p.stock_actual ASC;

CREATE OR REPLACE VIEW VISTA_CLIENTES_HISTORIAL AS
SELECT
    u.id_usuario,
    u.nombre || ' ' || u.apellido_paterno AS nombre_completo,
    u.correo,
    u.telefono,
    u.fecha_registro,
    hc.total_compras,
    hc.monto_total_gastado,
    hc.primera_compra,
    hc.ultima_compra,
    hc.promedio_compra,
    (SELECT COUNT(*) FROM "HOT_CLICK_GIRO_RULETA_TB" gr
     WHERE gr.fk_id_usuario_final = u.id_usuario AND gr.usado = false) AS giros_disponibles
FROM "HOT_CLICK_USUARIO_TB" u
LEFT JOIN "HOT_CLICK_HISTORIAL_CLIENTE_TB" hc ON hc.fk_id_usuario_final = u.id_usuario
WHERE u.fk_id_estado = 1;

-- ============================================================
-- DATOS INICIALES
-- ============================================================
BEGIN;
SET CONSTRAINTS ALL DEFERRED;

INSERT INTO "HOT_CLICK_ESTADO_TB" ("ID_ESTADO", "NOMBRE_ESTADO", "DESCRIPCION", "CODIGO_COLOR") VALUES
  (1, 'ACTIVO',     'Registro activo y funcional',       '#00FF00'),
  (2, 'INACTIVO',   'Registro desactivado',              '#FFA500'),
  (3, 'ELIMINADO',  'Registro eliminado logicamente',    '#FF0000'),
  (4, 'SUSPENDIDO', 'Registro suspendido temporalmente', '#FFFF00');

INSERT INTO "HOT_CLICK_ROL_TB" ("ID_ROL", "NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO") VALUES
  (1, 'ADMIN_IT',      'Administrador del sistema - control total',  10),
  (2, 'ADMIN_CLIENTE', 'Administrador de negocio - gestión propia',   5),
  (3, 'USUARIO_FINAL', 'Cliente registrado',                          1);

INSERT INTO "HOT_CLICK_METODO_ENVIO_TB" ("ID_METODO_ENVIO", "NOMBRE_ENVIO", "COSTO_BASE", "TIEMPO_ESTIMADO_DIAS") VALUES
  (1, 'RETIRO_EN_TIENDA',   0,    0),
  (2, 'ENVIO_A_DOMICILIO',  2000, 2);

INSERT INTO "HOT_CLICK_METODO_PAGO_CONFIG_TB" ("ID_METODO_PAGO_CONFIG", "NOMBRE", "ACTIVO", "ORDEN") VALUES
  (1, 'TARJETA_CREDITO',  TRUE, 1),
  (2, 'SINPE_MOVIL',      TRUE, 2),
  (3, 'EFECTIVO_ENTREGA', TRUE, 3);

-- Admin del sistema (contraseña debe actualizarse en producción)
INSERT INTO "HOT_CLICK_USUARIO_TB"
  ("ID_USUARIO", "IDENTIFICACION", "NOMBRE", "APELLIDO_PATERNO", "CORREO", "TELEFONO", "CONTRASENA_HASH") VALUES
  (1, '999999999', 'Admin', 'Sistema', 'admin@hotclick.com', '88888888', '$2b$10$placeholder');

INSERT INTO "HOT_CLICK_USUARIO_ROL_TB" ("FK_ID_USUARIO", "FK_ID_ROL") VALUES (1, 1);

INSERT INTO "HOT_CLICK_PREMIO_TB"
  ("ID_PREMIO", "NOMBRE_PREMIO", "TIPO_PREMIO", "VALOR_PREMIO", "PROBABILIDAD", "COLOR_RULETA", "FK_ID_ADMIN_CLIENTE", "FK_ID_ESTADO") VALUES
  (1, '10% Descuento',      'DESCUENTO',   10,  30.00, '#e74c3c', 1, 1),
  (2, 'Envío Gratis',       'ENVIO_GRATIS', 0,  25.00, '#3498db', 1, 1),
  (3, '500 Puntos',         'PUNTOS',      500, 20.00, '#2ecc71', 1, 1),
  (4, '20% Descuento',      'DESCUENTO',   20,  10.00, '#f39c12', 1, 1),
  (5, 'Giro Extra',         'PUNTOS',       1,   5.00, '#9b59b6', 1, 1),
  (6, '¡Suerte la próxima!','NADA',         0,  10.00, '#95a5a6', 1, 1);

SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;

-- ============================================================
-- RESUMEN
-- 23 tablas activas para el MVP actual
-- 7 triggers | 2 procedimientos | 5 vistas
-- ============================================================
