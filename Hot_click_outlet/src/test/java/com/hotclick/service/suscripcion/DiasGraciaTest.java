package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("26-oct: 8 días de gracia; el día 8 vende, desde el día 9 la tienda se suspende; al pagar vuelve")
class DiasGraciaTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock SuscripcionPlanSupport planSupport;
    @Mock EmpresaRepository empresaRepo;
    @Mock com.hotclick.service.onvo.OnvoBillingClient onvoBilling; // sin llave=false → hay cobro
    @Mock OnvoRenovacionReconsulta reconsulta; // B1: el job reinicia el conteo de INCIERTAS al empezar
    @InjectMocks SuscripcionRenewalService service;

    private static LocalDate hoy() { return LocalDate.now(Constants.ZONA_CR); }

    /** Misma condición que el repositorio: fecha_fin < hoy - diasGracia. Día N = hoy - fecha_fin. */
    private static boolean vencidaEnDia(int dia, int gracia) {
        LocalDate fechaFin = hoy().minusDays(dia);
        return fechaFin.isBefore(hoy().minusDays(gracia));
    }

    @Test
    void bordes_dia8VendeDia9No() {
        assertFalse(vencidaEnDia(8, 8), "día 8 todavía vende");
        assertTrue(vencidaEnDia(9, 8), "día 9 ya no vende");
    }

    @Test
    void usaLaGraciaConfiguradaYSuspendeLaTienda() {
        ReflectionTestUtils.setField(service, "diasGracia", 8);
        LocalDate limite = hoy().minusDays(8);
        Empresa e = new Empresa();
        e.setId(5L);
        Suscripcion s = new Suscripcion();
        ReflectionTestUtils.setField(s, "id", 9L);
        s.setEmpresa(e);
        when(suscripcionRepo.findPastDueOnvoVencidos(eq(limite), any())).thenReturn(List.of(s), List.of());
        when(suscripcionRepo.marcarVencidoSiPastDue(9L)).thenReturn(1);

        assertEquals(1, service.expirarPastDueVencidos());
        verify(empresaRepo).suspenderPorImpagoBatch(List.of(5L));
    }

    @Test
    void procesaTodosLosLotesElMismoDia() {
        ReflectionTestUtils.setField(service, "diasGracia", 8);
        ReflectionTestUtils.setField(service, "maxBajasPorCorrida", 1);
        Empresa e1 = new Empresa(); e1.setId(1L);
        Empresa e2 = new Empresa(); e2.setId(2L);
        Suscripcion s1 = new Suscripcion(); ReflectionTestUtils.setField(s1, "id", 11L); s1.setEmpresa(e1);
        Suscripcion s2 = new Suscripcion(); ReflectionTestUtils.setField(s2, "id", 12L); s2.setEmpresa(e2);
        when(suscripcionRepo.findPastDueOnvoVencidos(any(), any())).thenReturn(List.of(s1), List.of(s2), List.of());
        when(suscripcionRepo.marcarVencidoSiPastDue(anyLong())).thenReturn(1);

        assertEquals(2, service.expirarPastDueVencidos());
        verify(empresaRepo).suspenderPorImpagoBatch(List.of(1L));
        verify(empresaRepo).suspenderPorImpagoBatch(List.of(2L));
    }

    @Test
    void tiendaSuspendidaNoSeVendeNiPorLinkDirectoYAlPagarSeReactiva() {
        Empresa e = new Empresa();
        e.setEstadoEmpresa(Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO);
        e.setVisibilidadPublica(true);
        Producto p = new Producto();
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setEmpresa(e);
        // Checkout, SINPE y carrito validan con esPublicableEnMemoria; catálogo y link directo con ACTIVO en SQL.
        assertFalse(StockReservationService.esPublicableEnMemoria(p));

        assertTrue(SuspensionImpago.reactivarSiSuspendida(e));
        assertEquals("ACTIVO", e.getEstadoEmpresa());
        assertTrue(StockReservationService.esPublicableEnMemoria(p));
    }

    @Test
    void reactivarNoTocaOtrosEstados() {
        Empresa e = new Empresa();
        e.setEstadoEmpresa("RECHAZADO");
        assertFalse(SuspensionImpago.reactivarSiSuspendida(e));
        assertEquals("RECHAZADO", e.getEstadoEmpresa());
    }
}
