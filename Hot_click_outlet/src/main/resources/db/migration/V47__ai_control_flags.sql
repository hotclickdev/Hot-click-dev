-- F27: AI control panel — seed new feature flags
INSERT INTO hot_click_feature_flag_tb (nombre, descripcion, activo_defecto)
VALUES
  ('chat_publico',
   'Chat de descubrimiento de productos visible en el storefront público',
   TRUE),
  ('copilot_emprendedor',
   'AI Copilot visible y usable por EMPRENDEDOR y ADMIN_CLIENTE',
   TRUE)
ON CONFLICT (nombre) DO NOTHING;
