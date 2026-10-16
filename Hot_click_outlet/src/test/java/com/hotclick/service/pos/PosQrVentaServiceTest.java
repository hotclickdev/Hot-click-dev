package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import org.junit.jupiter.api.DisplayName;
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

/** POS QR: cobro con pasarela (sin pasarela conectada) y cierre por webhook. */
@ExtendWith(MockitoExtension.class)
@DisplayName("Pago POS QR (pasarela)")
class PosQrVentaServiceTest {

    @Mock PosQrSesionRepository posQrRepo;
    @Mock PosQrSessionService sessionService;
    @Mock PosQrVentaCompletionService completionService;
    @InjectMocks PosQrVentaService service;

    @Test
    @DisplayName("Sin pasarela, el poll no da por pagada la sesión aunque tenga un id de pasarela")
    void sinPasarelaPollNoPaga() {
        PosQrSesion sesion = sesionTarjeta();
        sesion.setStripeSessionId("POSQR-ABC");
        sesion.setFechaExpiracion(java.time.LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).plusMinutes(10));
        when(posQrRepo.findByToken("tokentarjetaqr01")).thenReturn(Optional.of(sesion));

        assertThat(service.verificarEstado("tokentarjetaqr01")).isEqualTo("PENDIENTE");
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Pasarela completa la venta pendiente")
    void completaVentaPendiente() {
        PosQrSesion sesion = sesionTarjeta();
        when(posQrRepo.findByStripeSessionId("POSQR-X")).thenReturn(Optional.of(sesion));
        when(posQrRepo.reclamarParaCompletar(sesion.getId())).thenReturn(1);

        assertThat(service.completarSiPagoPasarela("POSQR-X")).isTrue();
        verify(completionService).completarVentaTarjeta(sesion);
    }

    @Test
    @DisplayName("Id ajeno no se trata como POS QR")
    void idAjenoNoEsPos() {
        when(posQrRepo.findByStripeSessionId("otro")).thenReturn(Optional.empty());
        assertThat(service.completarSiPagoPasarela("otro")).isFalse();
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Descripción del checkout cabe en 100 caracteres")
    void descripcionCheckoutCorta() {
        assertThat(PosQrVentaService.descripcionCheckout(List.of(Map.of("nombre", "Mouse", "cantidad", 1))))
            .isEqualTo("Mouse x1");
        assertThat(PosQrVentaService.descripcionCheckout(List.of(
            Map.of("nombre", "A".repeat(80), "cantidad", 2),
            Map.of("nombre", "B".repeat(80), "cantidad", 1)))).hasSize(100);
    }

    private static PosQrSesion sesionTarjeta() {
        Empresa empresa = new Empresa();
        empresa.setId(9L);
        empresa.setCorreoEmpresa("qa@negocio.test");
        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken("tokentarjetaqr01");
        sesion.setMetodoPago("TARJETA");
        sesion.setEstado("PENDIENTE");
        sesion.setTotal(5000);
        sesion.setEmpresa(empresa);
        sesion.setItemsJson("[{\"nombre\":\"Mouse\",\"cantidad\":1}]");
        return sesion;
    }
}
