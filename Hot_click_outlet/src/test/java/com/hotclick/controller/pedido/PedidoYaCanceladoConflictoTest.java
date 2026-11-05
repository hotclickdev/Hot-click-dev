package com.hotclick.controller.pedido;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.PedidoYaCanceladoException;
import com.hotclick.model.Pedido;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** BAJO-05: repetir CANCELADO sobre un pedido cancelado responde 409 en voseo, no 200 «Estado actualizado». */
@DisplayName("[Pedidos] BAJO-05 cancelar un pedido ya cancelado → 409")
class PedidoYaCanceladoConflictoTest {

    @Test
    void cancelarRepetido_409_conMensajeClaro() {
        PedidoService pedidoService = mock(PedidoService.class);
        Pedido pedido = new Pedido();
        pedido.setId(5L);
        when(pedidoService.buscarPorId(5L)).thenReturn(pedido);
        PedidoTenantResponder responder = new PedidoTenantResponder();
        ReflectionTestUtils.setField(responder, "pedidoService", pedidoService);
        ReflectionTestUtils.setField(responder, "companyScope", mock(CompanyScope.class));

        ResponseEntity<ResponseDTO> r = responder.conAcceso(5L, "Estado actualizado", p -> {
            throw new PedidoYaCanceladoException();
        });

        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody().isSuccess()).isFalse();
        assertThat(r.getBody().getMessage()).isEqualTo("Este pedido ya está cancelado.");
    }
}
