package com.hotclick.dto;

/**
 * Ubicación de despacho que llega en el alta de un negocio. Con ella se crea la
 * primera bodega; los clientes viejos no la mandan y el alta sigue igual.
 */
public record UbicacionDespachoAlta(
    String provincia,
    String canton,
    String direccionExacta,
    Boolean permiteRetiroCliente,
    String distrito
) {}
