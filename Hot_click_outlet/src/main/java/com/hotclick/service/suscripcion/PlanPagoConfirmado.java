package com.hotclick.service.suscripcion;

/**
 * Puerto neutral de pasarela: «el pago de este plan quedó confirmado → activar el plan».
 * El plan pedido (p. ej. registro con ?plan=pyme) queda PENDIENTE como cobro y solo se activa por aquí.
 * Tilopay lo llama hoy al confirmar el cobro; ONVO (migración planeada, ver docs de pagos) se conecta
 * llamando al mismo puerto desde su webhook, sin tocar la lógica de planes.
 */
public interface PlanPagoConfirmado {

    /**
     * @param proveedor  identificador de la pasarela (TILOPAY, ONVO, …), solo para trazabilidad
     * @param referencia id externo del cobro (orderNumber, payment intent…)
     */
    void planPagoConfirmado(Long empresaId, String planNombre, String proveedor, String referencia);
}
