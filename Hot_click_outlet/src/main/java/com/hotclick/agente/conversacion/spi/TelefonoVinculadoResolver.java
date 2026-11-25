package com.hotclick.agente.conversacion.spi;

import java.util.OptionalLong;

/**
 * Gancho para saber si el remitente de un canal es personal de un negocio (modo interno del bot).
 *
 * <p>PENDIENTE: hoy no existe una vinculación VERIFICADA de teléfono a usuario (Usuario.telefono lo escribe el
 * propio usuario y no sirve como prueba de identidad). Una historia posterior (vinculación por código, como la de
 * Telegram) registrará un bean que implemente esta interfaz. Mientras no haya bean, todo remitente se trata como
 * cliente (NEGOCIO_VENTAS), que es el lado seguro.
 */
public interface TelefonoVinculadoResolver {

    /** @return id del usuario activo de esa empresa vinculado a ese wa_id, o vacío. */
    OptionalLong usuarioVinculado(Long empresaId, String remitenteId);
}
