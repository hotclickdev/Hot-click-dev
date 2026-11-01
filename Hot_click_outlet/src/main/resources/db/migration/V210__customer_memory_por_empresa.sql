-- MEDIO-1 (área 6): la memoria del asistente se aísla por tienda.
-- Antes la clave era solo visitor_id (UNIQUE V65): el mismo visitante compartía
-- intereses, marcas y presupuesto entre todas las tiendas (fuga entre tenants).
-- Ahora la clave es (visitor_id, empresa_id). Las filas existentes quedan con
-- empresa_id NULL = memoria global de la plataforma (Descubrí / "Según tus gustos"),
-- no se borra ni se reasigna nada. NULLS NOT DISTINCT: una sola fila global por visitante.

ALTER TABLE customer_memory ADD COLUMN IF NOT EXISTS empresa_id BIGINT;

ALTER TABLE customer_memory DROP CONSTRAINT IF EXISTS uq_customer_memory_visitor;
ALTER TABLE customer_memory DROP CONSTRAINT IF EXISTS uq_customer_memory_visitor_empresa;

ALTER TABLE customer_memory
    ADD CONSTRAINT uq_customer_memory_visitor_empresa
    UNIQUE NULLS NOT DISTINCT (visitor_id, empresa_id);
