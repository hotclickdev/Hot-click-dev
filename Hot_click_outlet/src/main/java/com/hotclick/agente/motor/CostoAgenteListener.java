package com.hotclick.agente.motor;

/**
 * Gancho de costo: el motor lo invoca tras cada llamada a Claude con su costo en USD (ya calculado con el precio del
 * modelo). Si una implementación lanza una excepción, el motor la ignora y sigue.
 */
@FunctionalInterface
public interface CostoAgenteListener {

    /** @param empresaId negocio dueño de la conversación; null = HotClick */
    void costo(Long empresaId, double usd);
}
