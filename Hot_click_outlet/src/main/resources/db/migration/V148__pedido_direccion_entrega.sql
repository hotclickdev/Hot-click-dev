-- V148: dirección de entrega en el pedido (señas, cantón, provincia) para los correos
-- («Enviamos a …»). Antes solo viajaba dentro de notas. Nullable: retiro en tienda y
-- pedidos anteriores quedan en NULL; solo metadatos, sin reescribir la tabla.
ALTER TABLE hot_click_pedido_tb ADD COLUMN IF NOT EXISTS direccion_entrega VARCHAR(500);
