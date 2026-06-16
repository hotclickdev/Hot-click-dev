-- V72: Agrega columna max_creditos_ai al plan y hace seed de los 4 planes base.
-- -1 = ilimitado,  0 = sin acceso a IA.

ALTER TABLE hot_click_plan_tb
    ADD COLUMN IF NOT EXISTS max_creditos_ai INTEGER NOT NULL DEFAULT 0;

INSERT INTO hot_click_plan_tb
    (nombre, descripcion, precio_mensual,
     max_usuarios, max_productos, max_bodegas, max_cajas,
     tiene_pos, tiene_crm, tiene_compras, tiene_reportes, tiene_ai, tiene_api,
     max_creditos_ai, activo)
VALUES
    ('Inicio Ferial',
     'Plan base para ferias y eventos locales',
     5000,
     1, 50, 1, 1,
     false, false, false, false, false, false,
     0, true),

    ('Emprendedor Pro',
     'Para negocios en crecimiento con acceso a IA',
     10000,
     3, 300, 2, 2,
     true, false, true, true, true, false,
     25, true),

    ('Comercio Expansión',
     'Plan completo — productos, bodegas e IA ilimitados',
     15000,
     7, -1, -1, 3,
     true, true, true, true, true, true,
     -1, true),

    ('Personalizado',
     'Configuración Enterprise según acuerdo con HOTCLICK',
     0,
     -1, -1, -1, -1,
     true, true, true, true, true, true,
     -1, true)
ON CONFLICT (nombre) DO UPDATE SET
    precio_mensual  = EXCLUDED.precio_mensual,
    max_usuarios    = EXCLUDED.max_usuarios,
    max_productos   = EXCLUDED.max_productos,
    max_bodegas     = EXCLUDED.max_bodegas,
    max_cajas       = EXCLUDED.max_cajas,
    tiene_pos       = EXCLUDED.tiene_pos,
    tiene_crm       = EXCLUDED.tiene_crm,
    tiene_compras   = EXCLUDED.tiene_compras,
    tiene_reportes  = EXCLUDED.tiene_reportes,
    tiene_ai        = EXCLUDED.tiene_ai,
    tiene_api       = EXCLUDED.tiene_api,
    max_creditos_ai = EXCLUDED.max_creditos_ai;
