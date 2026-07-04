-- V94: Las categorías pasan a ser gestión exclusiva de ADMIN.
-- Las que crea ADMIN quedan globales (fk_id_empresa = NULL) para que las vea
-- y use todo negocio; las creadas antes por cada empresa (legado) se conservan.
ALTER TABLE hot_click_categoria_tb
    ALTER COLUMN fk_id_empresa DROP NOT NULL;
