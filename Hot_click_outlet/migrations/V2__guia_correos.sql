-- Migración: agregar número de guía Correos CR al pedido
-- Ejecutar manualmente en Supabase SQL Editor

ALTER TABLE hot_click_pedido_tb
  ADD COLUMN IF NOT EXISTS numero_guia   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS url_tracking  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS fecha_envio   TIMESTAMP;
