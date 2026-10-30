package com.hotclick.service.suscripcion;

/**
 * Falta configuración del billing ONVO (moneda de los planes, precio mensual del plan o price ids de ONVO). Es un
 * problema de despliegue, no del pago: el evento se trata como TRANSITORIO (5xx, ONVO reintenta) para no perder un
 * alta ya cobrada. El mensaje solo lleva nombres de propiedades, nunca valores ni datos del cliente.
 */
public class ConfigBillingFaltanteException extends RuntimeException {
    public ConfigBillingFaltanteException(String faltante) {
        super("Configuración de billing ONVO faltante: " + faltante);
    }
}
