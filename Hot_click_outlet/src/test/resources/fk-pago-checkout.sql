-- Regresión ALTO QA5: el insert del pago (PaymentRecordFactory) sobre un pedido de la tabla JPA hot_click_pedido_tb.
-- Con la FK vieja hacia "HOT_CLICK_PEDIDO_TB" este insert violaba hot_click_pago_tb_fk_id_pedido_fkey.
INSERT INTO hot_click_pedido_tb (id_pedido) VALUES (910001);
INSERT INTO hot_click_usuario_tb (id_usuario) VALUES (910001);
INSERT INTO hot_click_pago_tb (merchant_token, monto, fk_id_pedido, fk_id_usuario, fk_id_estado)
VALUES ('tok-test-fk-v221', 1000, 910001, 910001, 1);
