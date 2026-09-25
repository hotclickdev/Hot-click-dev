package com.hotclick.payment;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.TilopayService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Pasarela Tilopay embebida (SDK v2). No redirige a dominio externo:
 * redirectUrl apunta a nuestra ruta /pago/tilopay/respuesta.
 */
@Component
public class TilopayPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(TilopayPaymentProvider.class);

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Autowired private TilopayService tilopayService;

    @Override
    public String getNombre() {
        return Constants.PROVEEDOR_TILOPAY;
    }

    @Override
    public PaymentSession crearSesion(Pedido pedido, Usuario usuario) {
        String orderNumber = pedido.getNumeroPedido();
        String sdkToken = tilopayService.loginSdk();
        String redirect = appUrl + "/pago/tilopay/respuesta?order=" + orderNumber;

        log.info("[tilopay] Sesión embebida pedido={} mock={}",
            orderNumber, tilopayService.isMockMode());

        return new PaymentSession(orderNumber, redirect, sdkToken, true);
    }
}
