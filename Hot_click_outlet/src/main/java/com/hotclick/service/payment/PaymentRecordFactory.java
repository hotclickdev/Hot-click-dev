package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.PagoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class PaymentRecordFactory {

    @Autowired private PagoRepository pagoRepository;

    public Pago createAndPersist(PaymentSession session, Pedido pedido, Usuario usuario,
                                 String provider, int total) {
        Pago pago = new Pago();
        pago.setMerchantToken(session.externalId());
        pago.setRedirectUrl(session.redirectUrl());
        pago.setMonto(total);
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setProveedor(provider);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        // SINPE requiere más tiempo para revisión manual; resto expira en 30 min
        boolean esSinpe = "SINPE".equalsIgnoreCase(provider);
        pago.setFechaExpiracion(esSinpe
            ? LocalDateTime.now(Constants.ZONA_CR).plusHours(24)
            : LocalDateTime.now(Constants.ZONA_CR).plusMinutes(30));
        pago.setPedido(pedido);
        pago.setUsuario(usuario);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        return pagoRepository.save(pago);
    }
}
