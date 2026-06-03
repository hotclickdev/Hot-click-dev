-- V51: Secuencias para batch inserts en entidades de alto volumen.
-- Activa el batch INSERT real de Hibernate (batch_size=20 en application.properties).
-- IDENTITY requiere RETURNING id por cada fila; SEQUENCE pre-asigna bloques de 50 IDs.
--
-- START WITH se calcula dinámicamente desde el MAX actual para no colisionar
-- con filas existentes. Si la tabla está vacía, empieza en 1.
-- allocationSize=50 en las entidades debe coincidir con INCREMENT BY 50 aquí.

CREATE SEQUENCE IF NOT EXISTS hot_click_pedido_item_seq
    START WITH 1
    INCREMENT BY 50;

-- Sincroniza el inicio de la secuencia con el max existente (idempotente en tabla vacía)
SELECT setval('hot_click_pedido_item_seq',
    COALESCE((SELECT MAX(id_pedido_item) FROM hot_click_pedido_item_tb), 0) + 1, false);

CREATE SEQUENCE IF NOT EXISTS hot_click_movimiento_stock_seq
    START WITH 1
    INCREMENT BY 50;

SELECT setval('hot_click_movimiento_stock_seq',
    COALESCE((SELECT MAX(id_movimiento) FROM hot_click_movimiento_stock_tb), 0) + 1, false);

CREATE SEQUENCE IF NOT EXISTS hot_click_ai_mensaje_seq
    START WITH 1
    INCREMENT BY 50;

SELECT setval('hot_click_ai_mensaje_seq',
    COALESCE((SELECT MAX(id_mensaje) FROM hot_click_ai_mensaje_tb), 0) + 1, false);
