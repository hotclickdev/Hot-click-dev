package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentCheckoutTiendaPausadaTest {

    @Mock PaymentService paymentService;
    @Mock ProductoRepository productoRepository;
    @Mock com.hotclick.service.payment.TilopayConfirmacionService tilopayConfirmacionService;
    @InjectMocks PaymentController controller;

    @Test
    void compraEnTiendaPausada409ConCodigo() {
        Empresa e = new Empresa();
        e.setTiendaPausada(true);
        Producto p = new Producto();
        p.setEmpresa(e);
        when(productoRepository.findById(9202L)).thenReturn(Optional.of(p));
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(9202L);
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setItems(List.of(item));

        var res = controller.checkout(req);

        assertThat(res.getStatusCode().value()).isEqualTo(409);
        assertThat((Map<?, ?>) res.getBody()).containsEntry("code", "TIENDA_PAUSADA");
        verify(paymentService, never()).checkout(any(), any());
    }
}
