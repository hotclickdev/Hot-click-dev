-- Synthetic dump for S8 restore-drill selftests. No production data.
CREATE TABLE IF NOT EXISTS hot_click_usuario_tb (
  id bigint PRIMARY KEY,
  correo text
);
CREATE TABLE IF NOT EXISTS hot_click_pedido_tb (
  id bigint PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS hot_click_producto_tb (
  id bigint PRIMARY KEY
);
INSERT INTO hot_click_usuario_tb (id, correo) VALUES (1, 'restore-drill@example.test');
