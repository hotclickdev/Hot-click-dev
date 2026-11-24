-- AG-05: la sesión de chat sirve también a la bandeja de los bots de WhatsApp/Instagram/Messenger.
-- Aditiva: columnas nuevas con IF NOT EXISTS. Dos relajaciones sin pérdida de datos:
--   * fk_id_empresa admite NULL (conversaciones del bot de HotClick, sin negocio);
--   * los CHECK de canal y rol se amplían (INSTAGRAM, MESSENGER; rol 'persona' para mensajes humanos).
ALTER TABLE hot_click_chat_sesion_tb ALTER COLUMN fk_id_empresa DROP NOT NULL;
ALTER TABLE hot_click_chat_mensaje_shopping_tb ALTER COLUMN fk_id_empresa DROP NOT NULL;

ALTER TABLE hot_click_chat_sesion_tb
    ADD COLUMN IF NOT EXISTS fk_id_canal_cuenta BIGINT REFERENCES hot_click_canal_cuenta_tb(id_canal_cuenta) ON DELETE SET NULL;
ALTER TABLE hot_click_chat_sesion_tb
    ADD COLUMN IF NOT EXISTS perfil VARCHAR(20) CHECK (perfil IN ('NEGOCIO_VENTAS', 'NEGOCIO_INTERNO', 'HOTCLICK', 'ASESOR_WEB'));
ALTER TABLE hot_click_chat_sesion_tb ADD COLUMN IF NOT EXISTS contacto_externo VARCHAR(100);
ALTER TABLE hot_click_chat_sesion_tb
    ADD COLUMN IF NOT EXISTS modo VARCHAR(10) NOT NULL DEFAULT 'BOT' CHECK (modo IN ('BOT', 'PERSONA'));
ALTER TABLE hot_click_chat_sesion_tb
    ADD COLUMN IF NOT EXISTS fk_id_usuario_asignado BIGINT REFERENCES hot_click_usuario_tb(id_usuario) ON DELETE SET NULL;
ALTER TABLE hot_click_chat_sesion_tb ADD COLUMN IF NOT EXISTS ultimo_mensaje_cliente TIMESTAMPTZ;
ALTER TABLE hot_click_chat_sesion_tb
    ADD COLUMN IF NOT EXISTS estado VARCHAR(10) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA'));

ALTER TABLE hot_click_chat_sesion_tb DROP CONSTRAINT IF EXISTS chk_chat_sesion_canal;
ALTER TABLE hot_click_chat_sesion_tb ADD CONSTRAINT chk_chat_sesion_canal
    CHECK (canal IN ('WEB', 'WHATSAPP', 'QR', 'EMBED', 'INSTAGRAM', 'MESSENGER'));
ALTER TABLE hot_click_chat_mensaje_shopping_tb DROP CONSTRAINT IF EXISTS chk_chat_msg_rol;
ALTER TABLE hot_click_chat_mensaje_shopping_tb ADD CONSTRAINT chk_chat_msg_rol
    CHECK (rol IN ('user', 'assistant', 'system', 'persona'));

-- Una sola conversación abierta por (cuenta, contacto); al cerrarla, el siguiente mensaje abre otra.
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_sesion_cuenta_contacto_abierta
    ON hot_click_chat_sesion_tb (fk_id_canal_cuenta, contacto_externo)
    WHERE fk_id_canal_cuenta IS NOT NULL AND estado = 'ABIERTA';
CREATE INDEX IF NOT EXISTS idx_chat_sesion_asignado
    ON hot_click_chat_sesion_tb (fk_id_usuario_asignado) WHERE fk_id_usuario_asignado IS NOT NULL;
