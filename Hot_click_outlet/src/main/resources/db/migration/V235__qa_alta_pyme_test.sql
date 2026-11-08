-- V235 (08-nov-2026) Excepción QA de un solo uso: alta PYME a cobro TEST.
-- Aditiva: tabla nueva y una fila. No toca cupos, precios, negocios existentes ni migraciones ya aplicadas.
-- La fila no enciende nada: el flag hotclick.qa.alta-pyme-test.habilitado sale en false y el código
-- rechaza prod, perfiles que no sean solo dev/test, y una llave ONVO que no sea de prueba sin ambigüedad.
-- El correo del fixture no es un bypass: sin flag, sin perfil local y sin ONVO TEST el alta sigue el trial default.
-- Vence el 30-nov-2026 23:59:59 hora de Costa Rica (timestamp sin zona, misma hora que compara el servicio).
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

INSERT INTO hot_click_qa_alta_pyme_test_tb
    (id, correo_normalizado, plan_destino, estado, vence_en)
SELECT 1, 'qa.sim.alta20261108@hotclick.test', 'PYME', 'DISPONIBLE', TIMESTAMP '2026-11-30 23:59:59'
WHERE NOT EXISTS (SELECT 1 FROM hot_click_qa_alta_pyme_test_tb WHERE id = 1);
