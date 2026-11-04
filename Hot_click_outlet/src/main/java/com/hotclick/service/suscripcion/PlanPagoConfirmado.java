package com.hotclick.service.suscripcion;

/**
 * Puerto neutral de pasarela: «el pago de este plan quedó confirmado → activar el plan».
 * El plan pedido (p. ej. registro con ?plan=pyme) queda PENDIENTE como cobro y solo se activa por aquí.
 * ONVO lo llama desde su webhook al confirmar el cobro, sin tocar la lógica de planes.
 */
public interface PlanPagoConfirmado {

    /**
     * @param proveedor  identificador de la pasarela (ONVO, MANUAL, …), solo para trazabilidad
     * @param referencia id externo del cobro (orderNumber, payment intent…)
     */
    void planPagoConfirmado(Long empresaId, String planNombre, String proveedor, String referencia);
}
