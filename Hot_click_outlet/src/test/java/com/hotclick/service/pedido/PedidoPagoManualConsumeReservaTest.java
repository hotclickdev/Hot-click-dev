package com.hotclick.service.pedido;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * F1 (QA final): pedido de la tienda (ONLINE, EFECTIVO, sin Pago) con reserva. Marcarlo PAGADO / cobrarlo al
 * retirar consume la reserva una sola vez (stockDescontadoEn es el candado); un MANUAL no reservó y no cambia.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("F1: cobro manual de pedido de tienda consume la reserva")
class PedidoPagoManualConsumeReservaTest {

    @Mock private PedidoGrupoService pedidoGrupoService;
    @Mock private PagoRepository pagoRepository;
    @Mock private ComprobanteSinpeRepository comprobanteRepository;
    @Mock private PaymentService paymentService;
    @Mock private AuditoriaAdminRegistroService auditoria;
    @Mock private CompanyScope companyScope;
    @Mock private AutocompraNegocioGuard autocompraGuard;
    @Mock private EntityManager entityManager;
    @InjectMocks private PedidoPagoManualService service;

    private Pedido pedido;
    private int consumos;

    @BeforeEach
    void armar() {
        pedido = new Pedido();
        pedido.setId(6L);
        pedido.setOrigen("ONLINE");
        pedido.setMetodoPago("EFECTIVO");
        pedido.setMetodoEnvio(Constants.ENVIO_RETIRO);
        pedido.setNumeroPedido("ORD-F1");
        com.hotclick.model.Empresa emp = new com.hotclick.model.Empresa();
        emp.setId(13L);
        pedido.setEmpresa(emp);
        pedido.setTotalPedido(6000);
        pedido.setUsuarioFinal(new Usuario());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setStockReservadoEn(LocalDateTime.now());
        when(companyScope.isAdminIT()).thenReturn(true);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.empty());
        when(paymentService.revisarSobreventa(any())).thenReturn(false);
        // Simula el consumo real: fija el candado de idempotencia (igual que StockReservationService).
        doAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            if (p.getStockReservadoEn() != null && p.getStockDescontadoEn() == null) {
                consumos++;
                p.setStockReservadoEn(null);
                p.setStockDescontadoEn(LocalDateTime.now());
            }
            return null;
        }).when(paymentService).consumirReservaPagoManual(any());
    }

    @Test
    @DisplayName("PAGADO consume la reserva; PAGADO repetido no vuelve a consumir")
    void pagado_consumeUnaVez() {
        service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1");
        assertThat(pedido.getStockDescontadoEn()).isNotNull();
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);

        service.confirmar(pedido, Constants.PEDIDO_PAGADO, "REF-1");

        // El segundo intento no descuenta otra vez: el candado stockDescontadoEn ya está puesto.
        assertThat(consumos).isEqualTo(1);
    }

    @Test
    @DisplayName("cobro al retirar (PENDIENTE_COMPROBANTE → ENTREGADO) consume la reserva")
    void cobroAlRetirar_consume() {
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        service.confirmarCobroAlRetirar(pedido, Constants.PEDIDO_PENDIENTE_COMPROBANTE, null);

        verify(paymentService, times(1)).consumirReservaPagoManual(any());
        assertThat(pedido.getStockDescontadoEn()).isNotNull();
    }

    @Test
    @DisplayName("pedido MANUAL (sin reserva) no consume nada al confirmar: sin regresión")
    void manual_noConsume() {
        pedido.setOrigen("MANUAL");
        pedido.setStockReservadoEn(null);

        service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1");

        assertThat(consumos).isZero();
        assertThat(pedido.getStockDescontadoEn()).isNull();
    }

    @Test
    @DisplayName("sobreventa: no se consume (la reserva ya se liberó en revisión)")
    void sobreventa_noConsume() {
        when(paymentService.revisarSobreventa(any())).thenReturn(true);

        service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1");

        verify(paymentService, never()).consumirReservaPagoManual(any());
    }
}
