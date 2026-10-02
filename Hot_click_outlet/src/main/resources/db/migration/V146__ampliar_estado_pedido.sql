-- V146: ampliar hot_click_pedido_tb.estado_pedido de VARCHAR(20) a VARCHAR(30).
-- PENDIENTE_COMPROBANTE (21 caracteres) es el estado inicial del checkout SINPE/efectivo
-- y no cabe en VARCHAR(20): PostgreSQL rechaza el INSERT con "value too long".
-- Ampliar un VARCHAR en PostgreSQL solo cambia metadatos (no reescribe la tabla ni sus
-- índices); toma un lock ACCESS EXCLUSIVE muy corto. Idempotente: re-ejecutarlo no cambia nada.
ALTER TABLE hot_click_pedido_tb ALTER COLUMN estado_pedido TYPE VARCHAR(30);
