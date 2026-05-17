package com.hotclick.payment;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;

/**
 * Contrato que debe implementar cualquier pasarela de pago.
 * Agregar una nueva pasarela = crear una clase que implemente esta interface.
 */
public interface PaymentProvider {

    /** Identificador único del proveedor (ej. "PAYXPERT", "PAYPAL"). */
    String getNombre();

    /**
     * Inicia una sesión de pago con el proveedor externo.
     *
     * @param pedido  Pedido ya persistido con totales calculados.
     * @param usuario Usuario que realiza el pago.
     * @return PaymentSession con el ID externo y la URL de redirección al proveedor.
     */
    PaymentSession crearSesion(Pedido pedido, Usuario usuario) throws Exception;
}
