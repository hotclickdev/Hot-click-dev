-- V263 (Fase 5 "Contador IA"): ajustes editables, corpus de normativa, registro de consultas a la IA,
-- avisos en la app para el ADMIN y estado de las consultas pendientes con Hacienda.
-- Aditiva e idempotente: no borra ni reescribe datos existentes.

-- Ajustes editables en la fila única de reglas fiscales (id=1). Sin fila, el servicio usa los valores por defecto.
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS salario_base_crc INTEGER NOT NULL DEFAULT 462200
    CHECK (salario_base_crc BETWEEN 100000 AND 5000000);
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS tope_ia_mes_usd NUMERIC(8,2) NOT NULL DEFAULT 20.00
    CHECK (tope_ia_mes_usd BETWEEN 0 AND 10000);
ALTER TABLE hot_click_config_fiscal_tb ADD COLUMN IF NOT EXISTS limite_preguntas_dia INTEGER NOT NULL DEFAULT 30
    CHECK (limite_preguntas_dia BETWEEN 1 AND 500);

-- Parámetros fiscales editables por el ADMIN (factores del RTS, tramos de renta, formularios, períodos). Sin fila se usa
-- el valor por defecto del código; los vacíos significan "sin configurar" y nada se calcula con ellos.
CREATE TABLE IF NOT EXISTS hot_click_contador_param_tb (
    clave VARCHAR(60) PRIMARY KEY,
    valor VARCHAR(400) NOT NULL DEFAULT '',
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Corpus de normativa tributaria que carga el ADMIN (la IA solo lo lee).
CREATE TABLE IF NOT EXISTS hot_click_contador_normativa_tb (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    fuente VARCHAR(300) NOT NULL,
    texto TEXT NOT NULL,
    creado_por BIGINT,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contador_normativa_fts
    ON hot_click_contador_normativa_tb USING GIN (to_tsvector('spanish', titulo || ' ' || texto));

-- Registro de cada pregunta al contador IA: sirve de bitácora y de contador para el límite diario y el tope mensual.
CREATE TABLE IF NOT EXISTS hot_click_contador_consulta_tb (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    pregunta VARCHAR(600) NOT NULL,
    respuesta TEXT,
    confianza VARCHAR(10),
    fuente VARCHAR(300),
    estado VARCHAR(20) NOT NULL,
    tokens_entrada INTEGER NOT NULL DEFAULT 0,
    tokens_salida INTEGER NOT NULL DEFAULT 0,
    costo_usd NUMERIC(10,6) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_contador_consulta_admin_fecha
    ON hot_click_contador_consulta_tb (admin_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_contador_consulta_fecha
    ON hot_click_contador_consulta_tb (creado_en);

-- Avisos dentro de la app para el ADMIN (vencimientos a 3 días). La clave evita duplicarlos.
CREATE TABLE IF NOT EXISTS hot_click_contador_aviso_tb (
    id BIGSERIAL PRIMARY KEY,
    clave VARCHAR(80) NOT NULL UNIQUE,
    tipo VARCHAR(30) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    mensaje VARCHAR(400) NOT NULL,
    vence_el DATE NOT NULL,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Estado de las consultas pendientes con Hacienda (las preguntas viven en el código; aquí solo su estado).
CREATE TABLE IF NOT EXISTS hot_click_contador_hacienda_tb (
    clave VARCHAR(40) PRIMARY KEY,
    estado VARCHAR(12) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CONFIRMADA')),
    nota VARCHAR(500),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
