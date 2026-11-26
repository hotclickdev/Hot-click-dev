package com.hotclick.agente.conversacion.spi;

import java.util.OptionalLong;

/**
 * Gancho para saber si el remitente de un canal es personal de un negocio (modo interno del bot).
 *
 * <p>Usuario.telefono lo escribe el propio usuario y NO sirve como prueba de identidad. La implementación
 * ({@code agente.interno.VinculacionInternaService}) usa una vinculación verificada por código de un solo uso
 * enviado desde el teléfono. Sin bean o sin vinculación ACTIVA, todo remitente se trata como cliente
 * (NEGOCIO_VENTAS), que es el lado seguro.
 */
public interface TelefonoVinculadoResolver {

    /** @return id del usuario activo de esa empresa vinculado a ese wa_id, o vacío. */
    OptionalLong usuarioVinculado(Long empresaId, String remitenteId);
}
