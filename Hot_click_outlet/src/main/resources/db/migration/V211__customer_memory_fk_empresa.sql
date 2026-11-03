-- Seguimiento BAJO de #434 (área 6): customer_memory.empresa_id apunta a la tienda real.
-- NULL sigue permitido = memoria global de la plataforma (filas viejas de antes de V210).
-- No se modifica ni borra ninguna fila: V210 solo escribe empresa_id resuelto por el servidor
-- (requireEmpresaActiva), así que no hay huérfanos esperables.
-- ON DELETE CASCADE: si una tienda se elimina, su memoria de visitantes no queda suelta
-- ni pasa a ser global.
-- La UNIQUE (visitor_id, empresa_id) de V210 ya sirve de índice compuesto para la búsqueda;
-- este índice simple es para la FK (borrados en hot_click_empresa_tb sin scan completo).

ALTER TABLE customer_memory DROP CONSTRAINT IF EXISTS fk_customer_memory_empresa;

ALTER TABLE customer_memory
    ADD CONSTRAINT fk_customer_memory_empresa
    FOREIGN KEY (empresa_id) REFERENCES hot_click_empresa_tb(id_empresa) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customer_memory_empresa ON customer_memory (empresa_id);
