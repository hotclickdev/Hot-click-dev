package com.hotclick.payment;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SinpePaymentProvider implements PaymentProvider {

    @Override
    public String getNombre() {
        return "SINPE";
    }

    @Override
    public PaymentSession crearSesion(Pedido pedido, Usuario usuario) {
        String token = "SINPE-" + pedido.getNumeroPedido() + "-"
            + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return new PaymentSession(token, null);
    }
}
