package com.hotclick.service;

import com.hotclick.dto.DespachoPaqueteDTO;
import com.hotclick.model.Compra;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.AggregatorService.DetalleComision;
import com.hotclick.service.AggregatorService.Liquidacion;
import com.hotclick.service.wallet.AggregatorCommissionMath.Resultado;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DespachoPaqueteServiceTest {

    private final PedidoRepository pedidoRepository = mock(PedidoRepository.class);
    private final AggregatorService aggregatorService = mock(AggregatorService.class);
    private final DespachoPaqueteService service = new DespachoPaqueteService(pedidoRepository, aggregatorService);

    @Test
    void leeNombreTelefonoYDireccionDeLasNotasDelCheckout() {
        Map<String, String> campos = DespachoPaqueteService.leerNotas(
            "Nombre: Ana Solís | Teléfono: 8888-0000 | Dirección: San José, Escazú · Del Centro 200 m sur");

        assertThat(campos)
            .containsEntry("Nombre", "Ana Solís")
            .containsEntry("Teléfono", "8888-0000")
            .containsEntry("Dirección", "San José, Escazú · Del Centro 200 m sur");
        assertThat(DespachoPaqueteService.leerNotas(null)).isEmpty();
        assertThat(DespachoPaqueteService.leerNotas("texto libre sin campos")).isEmpty();
    }

    @Test
    void armaElPaqueteConLosOtrosNegociosYElMismoCalculoQueElWallet() {
        Compra compra = new Compra();
        compra.setId(50L);
        compra.setNumeroCompra("ORD-10482");
        Pedido propio = pedido(1L, 1, empresa(9L, "Casa Luna 506"), compra);
        propio.setTotalPedido(33400);
        propio.setCostoEnvio(4000);
        propio.setNotas("Nombre: Ana Solís | Teléfono: 8888-0000 | Dirección: Escazú");
        Pedido bruma = pedido(2L, 2, empresa(7L, "Bruma Café"), compra);
        Pedido ceiba = pedido(3L, 3, empresa(8L, "Taller Ceiba"), compra);
        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(propio));
        when(pedidoRepository.findByCompra_IdOrderByNumeroPaqueteAsc(50L)).thenReturn(List.of(propio, bruma, ceiba));
        DetalleComision detalle = new DetalleComision(
            "EMPRENDEDOR", new BigDecimal("9"), 400, new Resultado(1470, 1176, 26754, 2646));
        when(aggregatorService.liquidar(9L, 33400L, 4000L)).thenReturn(new Liquidacion(4000, detalle, 30754));

        DespachoPaqueteDTO dto = service.armar(1L);

        assertThat(dto.numeroCompra()).isEqualTo("ORD-10482");
        assertThat(dto.numeroPaquete()).isEqualTo(1);
        assertThat(dto.cantidadPaquetes()).isEqualTo(3);
        assertThat(dto.negocio()).isEqualTo("Casa Luna 506");
        assertThat(dto.otrosNegocios()).containsExactly("Bruma Café", "Taller Ceiba");
        assertThat(dto.cliente().telefono()).isEqualTo("8888-0000");
        assertThat(dto.pago().venta()).isEqualTo(29400);
        assertThat(dto.pago().envio()).isEqualTo(4000);
        assertThat(dto.pago().comision()).isEqualTo(2646);
        assertThat(dto.pago().aRecibir()).isEqualTo(30754);
    }

    private static Pedido pedido(Long id, int numeroPaquete, Empresa empresa, Compra compra) {
        Pedido pedido = new Pedido();
        pedido.setId(id);
        pedido.setNumeroPaquete(numeroPaquete);
        pedido.setEmpresa(empresa);
        pedido.setCompra(compra);
        pedido.setItems(new ArrayList<>());
        return pedido;
    }

    private static Empresa empresa(Long id, String nombreComercial) {
        Empresa empresa = new Empresa();
        empresa.setId(id);
        empresa.setNombreComercial(nombreComercial);
        return empresa;
    }
}
