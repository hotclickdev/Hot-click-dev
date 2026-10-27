package com.hotclick.service.facturacion;

import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.FacturacionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** P-04 ciclo 3: un pedido cobrado en modo prueba nunca genera comprobante ante Hacienda. */
@DisplayName("P-04 | facturación rechaza pedidos es_prueba")
class FacturacionPedidoPruebaTest {

    @Test
    void emitirRechazaPedidoDePruebaSinTocarHacienda() {
        PedidoRepository repo = mock(PedidoRepository.class);
        FacturacionEmisionSupport soporte = mock(FacturacionEmisionSupport.class);
        // El envío a Hacienda sale por evento (AFTER_COMMIT) desde fix/hacienda-alto.
        org.springframework.context.ApplicationEventPublisher envio = mock(org.springframework.context.ApplicationEventPublisher.class);
        FacturacionPollingService polling = mock(FacturacionPollingService.class);
        Pedido p = new Pedido();
        p.setId(7L);
        p.setEsPrueba(true);
        when(repo.findById(7L)).thenReturn(Optional.of(p));
        FacturacionService svc = new FacturacionService(repo, soporte, envio, polling, mock(CompanyScope.class));

        assertThatThrownBy(() -> svc.emitir(7L, "FE"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage(FacturacionService.MSG_PEDIDO_PRUEBA);
        verify(soporte, never()).emitir(any(), any());
        verifyNoInteractions(envio, polling);
    }

    @Test
    void elSoporteDeEmisionTambienRechazaPrueba() {
        Pedido p = new Pedido();
        p.setEsPrueba(true);
        FacturacionEmisionSupport soporte = mock(FacturacionEmisionSupport.class, CALLS_REAL_METHODS);
        assertThatThrownBy(() -> soporte.emitir(p, "FE"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage(FacturacionService.MSG_PEDIDO_PRUEBA);
    }
}
