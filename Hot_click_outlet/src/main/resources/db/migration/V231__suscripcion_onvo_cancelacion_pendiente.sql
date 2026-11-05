-- ALTO-02b (aditiva): al reemplazar una suscripción ONVO nunca cobrada se crea la nueva primero y después se cancela
-- la vieja. Si esa cancelación falla, el id viejo queda acá para cancelarlo a mano (revisión manual) y la fila
-- apunta a la nueva. NULL = nada pendiente.
ALTER TABLE hot_click_suscripcion_tb ADD COLUMN onvo_sub_por_cancelar VARCHAR(100);
ALTER TABLE hot_click_suscripcion_tb ADD COLUMN onvo_revision_manual_desde TIMESTAMP;
