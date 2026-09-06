package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PosQrVentaCompletionService {

    @Autowired private PosQrPedidoFactory pedidoFactory;

    @Transactional
    public void completarVentaTarjeta(PosQrSesion sesion) {
        String metodo = sesion.getMetodoPago() == null ? "TARJETA" : sesion.getMetodoPago();
        pedidoFactory.crearPedidoPOS(sesion, metodo);
    }

    @Transactional
    public void completarVentaSinpe(PosQrSesion sesion, Long usuarioId, String notas) {
        if (notas != null) sesion.setNotas(notas);
        pedidoFactory.crearPedidoPOS(sesion, "SINPE");
    }
}
