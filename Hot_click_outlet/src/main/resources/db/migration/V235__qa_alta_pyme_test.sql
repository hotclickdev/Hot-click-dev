-- V235 (08-nov-2026) Excepción QA de un solo uso: alta PYME a cobro TEST.
-- Aditiva: solo la tabla vacía y sus índices. No inserta filas, correos ni fechas de fixture.
-- La activación escribe la fila recién cuando el flag de servidor, el perfil dev/test y ONVO TEST
-- coinciden (QaAltaPymeTestService). En prod esa puerta no abre, así que esta migración no deja datos de QA.
-- No toca cupos, precios, negocios existentes ni migraciones ya aplicadas.
CREATE TABLE IF NOT EXISTS hot_click_qa_alta_pyme_test_tb (
    id                  SMALLINT PRIMARY KEY,
    correo_normalizado  VARCHAR(160) NOT NULL,
    plan_destino        VARCHAR(30)  NOT NULL,
    estado              VARCHAR(20)  NOT NULL,
    vence_en            TIMESTAMP    NOT NULL,
    consumido_en        TIMESTAMP,
    revocado_en         TIMESTAMP,
    empresa_id          BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_qa_alta_pyme_test_correo
    ON hot_click_qa_alta_pyme_test_tb (correo_normalizado);
CREATE UNIQUE INDEX IF NOT EXISTS uq_qa_alta_pyme_test_empresa
    ON hot_click_qa_alta_pyme_test_tb (empresa_id) WHERE empresa_id IS NOT NULL;
