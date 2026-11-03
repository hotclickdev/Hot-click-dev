package com.hotclick.controller.storefront;

import com.hotclick.dto.StorefrontPedidoDTO;
import com.hotclick.exception.EnvioNoDisponibleException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.service.StockService;
import com.hotclick.service.envio.DestinoEnvio;
import com.hotclick.service.payment.OrderPricingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** BAJOS #447: destino y costo del envío se validan antes de tocar stock; sin destino con envío = 400. */
@DisplayName("BAJOS #447 | tienda: destino y envío antes de reservar stock")
class StorefrontDestinoAntesDeStockTest {

    private final StockService stock = mock(StockService.class);
    private final BodegaRepository bodegas = mock(BodegaRepository.class);
    private final OrderPricingService pricing = mock(OrderPricingService.class);

    private StorefrontGuestOrderService servicio() {
        StorefrontGuestOrderService s = new StorefrontGuestOrderService(bodegas, null, null, null, stock, null, null);
        ReflectionTestUtils.setField(s, "orderPricingService", pricing);
        when(bodegas.findByEmpresaIdAndEstado(any(), any())).thenReturn(List.of());
        return s;
    }

    private static StorefrontPedidoDTO dto(String metodo, String prov, String canton) {
        StorefrontPedidoDTO d = new StorefrontPedidoDTO();
        d.setMetodoEnvio(metodo); d.setProvincia(prov); d.setCanton(canton); d.setItems(List.of());
        return d;
    }

    private static Empresa empresa() { Empresa e = new Empresa(); e.setId(1L); return e; }

    @Test
    @DisplayName("Destino inválido o ausente con envío a domicilio: 400 y no se reserva stock ni se consulta la bodega")
    void destinoInvalidoNoReserva() {
        for (String[] d : new String[][]{{"Heredia", "Siquirres"}, {null, null}, {"San José", null}}) {
            assertThatThrownBy(() -> servicio().crearPedido(empresa(), dto("DOMICILIO", d[0], d[1])))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(DestinoEnvio.DESTINO_INVALIDO);
        }
        verifyNoInteractions(stock);
        verifyNoInteractions(bodegas);
    }

    @Test
    @DisplayName("Config de envío caída: 503 antes de reservar stock")
    void configCaidaNoReserva() {
        when(pricing.calcularCostoEnvio(anyString())).thenThrow(new EnvioNoDisponibleException());
        assertThatThrownBy(() -> servicio().crearPedido(empresa(), dto("DOMICILIO", "Heredia", "Belén")))
            .isInstanceOf(EnvioNoDisponibleException.class);
        verifyNoInteractions(stock);
    }

    @Test
    @DisplayName("Retiro sin destino sigue permitido (no pide provincia/cantón)")
    void retiroSinDestino() {
        assertThat(servicio().crearPedido(empresa(), dto("RETIRO", null, null))).isNull(); // sin bodega en el mock
    }
}
