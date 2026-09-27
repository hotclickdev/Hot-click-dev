package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Producto;

import java.util.List;
import java.util.Map;

/**
 * Un paquete de la compra: los ítems de un negocio que salen de una bodega
 * con un método de envío. {@code numero} es la posición 1..n en la compra.
 */
public record PaqueteCheckout(
    int numero,
    Long empresaId,
    Bodega origen,
    String metodoEnvio,
    List<PaymentCheckoutRequest.ItemDTO> items,
    Map<Long, Producto> productos,
    int subtotal,
    int costoTotal
) {}
