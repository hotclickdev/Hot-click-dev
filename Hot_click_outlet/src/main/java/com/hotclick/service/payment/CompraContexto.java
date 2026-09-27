package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Compra;
import com.hotclick.model.Usuario;

/** Datos comunes a todos los paquetes de una compra. */
public record CompraContexto(
    PaymentCheckoutRequest req,
    Usuario usuario,
    String provider,
    String estadoInicial,
    Compra compra
) {

    /** El paquete 1 lleva el número de la compra; los demás, un sufijo "-n". */
    public String numeroPedido(int numeroPaquete) {
        return numeroPaquete == 1
            ? compra.getNumeroCompra()
            : compra.getNumeroCompra() + "-" + numeroPaquete;
    }
}
