-- ============================================================
-- V22: Ofertas en productos, Convenios y Blog
-- ============================================================

-- Campos de oferta en producto
ALTER TABLE hot_click_producto_tb
  ADD COLUMN IF NOT EXISTS en_oferta         BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS precio_oferta     INTEGER,
  ADD COLUMN IF NOT EXISTS porcentaje_descuento INTEGER;

CREATE INDEX IF NOT EXISTS idx_producto_en_oferta ON hot_click_producto_tb (en_oferta) WHERE en_oferta = true;

-- Emprendimientos con convenio
CREATE TABLE IF NOT EXISTS hot_click_convenio_tb (
  id_convenio      BIGSERIAL    PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  descripcion      VARCHAR(500),
  logo_url         VARCHAR(500),
  url_web          VARCHAR(300),
  activo           BOOLEAN      NOT NULL DEFAULT true,
  fecha_registro   TIMESTAMP    NOT NULL DEFAULT NOW(),
  estado           INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_convenio_activo ON hot_click_convenio_tb (activo);

-- Blog entradas
CREATE TABLE IF NOT EXISTS hot_click_blog_entrada_tb (
  id_entrada        BIGSERIAL    PRIMARY KEY,
  titulo            VARCHAR(200) NOT NULL,
  slug              VARCHAR(220),
  resumen           VARCHAR(400),
  contenido         TEXT,
  imagen_url        VARCHAR(500),
  publicado         BOOLEAN      NOT NULL DEFAULT false,
  fecha_publicacion TIMESTAMP,
  fecha_creacion    TIMESTAMP    NOT NULL DEFAULT NOW(),
  estado            INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_blog_publicado ON hot_click_blog_entrada_tb (publicado, fecha_publicacion DESC);
