package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentExpirationCleanup — SINPE excluido vía query")
class PaymentExpirationCleanupSinpeExcludeTest {

    @Mock private EmpresaRepository empresaRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private StockReservationService stockReservationService;
    @Mock private TilopayConfirmacionService tilopayConfirmacionService;

    @InjectMocks private PaymentExpirationCleanupService service;

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setId(1L);
        empresa.setEstadoEmpresa("ACTIVO");
        when(empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO"))
            .thenReturn(List.of(empresa));
        // La query del repo ya excluye SINPE: el scheduler recibe lista vacía.
        when(pagoRepository.findExpiradosPendientesByEmpresa(any(LocalDateTime.class), eq(1L)))
            .thenReturn(List.of());
    }

    @Test
    @DisplayName("sin pagos en query (SINPE filtrados) → no cancela ni libera stock")
    void sinpeExcluidosPorQuery_noTocaNada() {
        service.cancelarExpirados();

        verify(pagoRepository, never()).saveAll(any());
        verify(pedidoRepository, never()).saveAll(any());
        verify(stockReservationService, never()).liberarReservas(any());
        verify(tilopayConfirmacionService, never()).intentarConfirmarSiAprobado(any(Pago.class));
    }
}
