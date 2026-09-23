package com.hotclick.service.payment;

import com.hotclick.model.Pedido;
import com.hotclick.payment.PaymentSession;
import com.hotclick.service.TilopayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Evita dependencia circular TilopayPaymentProvider ↔ ConfirmacionService al reintentar.
 */
@Component
public class TilopayPaymentProviderAccess {

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired private TilopayService tilopayService;

    public PaymentSession nuevaSesion(Pedido pedido, String orderNumber) {
        String sdkToken = tilopayService.loginSdk();
        String redirect = appUrl + "/pago/tilopay/respuesta?order=" + pedido.getNumeroPedido();
        return new PaymentSession(orderNumber, redirect, sdkToken, true);
    }
}
