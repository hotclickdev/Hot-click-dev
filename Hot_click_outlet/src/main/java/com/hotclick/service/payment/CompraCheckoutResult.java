package com.hotclick.service.payment;

import com.hotclick.model.Compra;
import com.hotclick.model.Pedido;

import java.util.List;

/** Compra recién creada: un pedido por negocio, alineado con su precio. */
public record CompraCheckoutResult(
    Compra compra,
    List<Pedido> pedidos,
    List<OrderPricingResult> precios
) {

    /** Paquete 1: lleva el número de la compra y el pago. */
    public Pedido principal() {
        return pedidos.get(0);
    }

    /** Lo que efectivamente se cobra, ya descontadas las tarjetas de regalo. */
    public int totalCobro() {
        return precios.stream().mapToInt(OrderPricingResult::totalConGC).sum();
    }

    /** Total antes de tarjeta de regalo (monto registrado en el pago). */
    public int totalSinGiftCard() {
        return precios.stream().mapToInt(OrderPricingResult::total).sum();
    }

    public boolean pagadaConGiftCard() {
        int gift = precios.stream().mapToInt(OrderPricingResult::gcMonto).sum();
        return gift > 0 && totalCobro() == 0;
    }
}
