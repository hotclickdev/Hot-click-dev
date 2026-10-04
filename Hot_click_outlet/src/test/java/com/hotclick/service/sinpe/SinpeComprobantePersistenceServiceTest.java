package com.hotclick.service.sinpe;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("SinpeComprobantePersistenceService: el grupo de pago cambia de estado en un solo UPDATE")
class SinpeComprobantePersistenceServiceTest {

    private final PedidoRepository pedidoRepository = mock(PedidoRepository.class);
    private final ComprobanteSinpeRepository comprobanteRepository = mock(ComprobanteSinpeRepository.class);
    private final SinpeComprobantePersistenceService service = new SinpeComprobantePersistenceService();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "pedidoRepository", pedidoRepository);
        ReflectionTestUtils.setField(service, "comprobanteRepository", comprobanteRepository);
    }

    private Pedido pedido(String numero, String grupo, String estado) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setGrupoPago(grupo);
        p.setEstadoPedido(estado);
        when(pedidoRepository.findByNumeroPedido(numero)).thenReturn(Optional.of(p));
        return p;
    }

    @Test
    @DisplayName("Con grupo: guarda el comprobante y actualiza todo el grupo con una sola consulta")
    void conGrupo_unSoloUpdate() {
        Pedido p = pedido("ORD-1", "GP-1", Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        service.guardar("ORD-1", "https://cdn.test/c.jpg", "  Ana Mora ", " 1-1111-1111 ", null, "ana@test.cr");

        ArgumentCaptor<ComprobanteSinpe> comprobante = ArgumentCaptor.forClass(ComprobanteSinpe.class);
        verify(comprobanteRepository).save(comprobante.capture());
        assertThat(comprobante.getValue().getNombreRemitente()).isEqualTo("Ana Mora");
        assertThat(comprobante.getValue().getEstado()).isEqualTo(Constants.COMPROBANTE_PENDIENTE);
        assertThat(p.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        verify(pedidoRepository).save(p);
        verify(pedidoRepository).actualizarEstadoPorGrupoPago("GP-1", Constants.PEDIDO_PENDIENTE_APROBACION);
        verify(pedidoRepository, never()).findByGrupoPagoOrderByIdAsc(anyString());
    }

    @Test
    @DisplayName("Sin grupo: cambia solo ese pedido")
    void sinGrupo_soloElPedido() {
        Pedido p = pedido("ORD-2", null, Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        service.guardar("ORD-2", "https://cdn.test/c.jpg", "Ana", null, null, "ana@test.cr");

        assertThat(p.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        verify(pedidoRepository).save(p);
        verify(pedidoRepository, never()).actualizarEstadoPorGrupoPago(anyString(), anyString());
    }

    @Test
    @DisplayName("Si el pedido ya no espera comprobante, no guarda nada")
    void estadoInvalido_noGuarda() {
        pedido("ORD-3", "GP-3", Constants.PEDIDO_PENDIENTE_APROBACION);

        assertThatThrownBy(() -> service.guardar("ORD-3", "https://cdn.test/c.jpg", "Ana", null, null, "ana@test.cr"))
            .isInstanceOf(IllegalStateException.class);

        verify(comprobanteRepository, never()).save(any());
        verify(pedidoRepository, never()).save(any());
        verify(pedidoRepository, never()).actualizarEstadoPorGrupoPago(anyString(), anyString());
    }
}
