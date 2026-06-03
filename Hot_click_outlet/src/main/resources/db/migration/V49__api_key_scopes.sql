-- Scopes por API key — limita el acceso a recursos específicos
-- Una key comprometida sin este campo tenía acceso total (ROLE_EMPRENDEDOR)
ALTER TABLE hot_click_api_key_tb
    ADD COLUMN IF NOT EXISTS scopes TEXT DEFAULT 'read:all';
