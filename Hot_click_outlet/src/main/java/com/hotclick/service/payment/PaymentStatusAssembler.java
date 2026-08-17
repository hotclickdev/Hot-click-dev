package com.hotclick.service.payment;

import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.model.Pago;
import com.hotclick.model.TransaccionPago;
import com.hotclick.repository.TransaccionPagoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PaymentStatusAssembler {

    @Autowired private TransaccionPagoRepository transaccionPagoRepository;

    public PaymentStatusResponse build(Pago pago) {
        TransaccionPago txn = transaccionPagoRepository
            .findTopByPagoIdOrderByFechaTransaccionDesc(pago.getId())
            .orElse(null);

        PaymentStatusResponse resp = new PaymentStatusResponse();
        resp.setPagoId(pago.getId());
        resp.setEstadoPago(pago.getEstadoPago());
        resp.setNumeroPedido(pago.getPedido().getNumeroPedido());
        resp.setMetodoPago(pago.getMetodoPagoTipo() != null ? pago.getMetodoPagoTipo() : pago.getProveedor());
        resp.setTotal(pago.getMonto());
        resp.setProveedor(pago.getProveedor());
        if (txn != null) {
            resp.setCardLast4(txn.getCardLast4());
            resp.setCardBrand(txn.getCardBrand());
            resp.setFechaTransaccion(txn.getFechaTransaccion() != null
                ? txn.getFechaTransaccion().toString() : null);
        }
        return resp;
    }
}
