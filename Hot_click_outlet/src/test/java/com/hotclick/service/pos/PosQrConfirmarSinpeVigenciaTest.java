package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** confirmar-sinpe del POS: fail-closed ante QR vencido o sin fecha de expiración (#220). */
@ExtendWith(MockitoExtension.class)
@DisplayName("[POS-QR] confirmar-sinpe exige sesión vigente")
class PosQrConfirmarSinpeVigenciaTest {

    private static final long EMPRESA = 7L;
    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 22, 12, 0);

    @Mock PosQrSesionRepository posQrRepo;
    @Mock PosQrVentaCompletionService completionService;
    @Mock ConfirmadorDistintoGuard confirmadorDistintoGuard;
    @Mock com.hotclick.repository.PosSinpeConfirmacionRepository confirmacionRepo;
    @Mock com.hotclick.service.AuditoriaAdminRegistroService auditoria;
    @InjectMocks PosQrVentaService service;

    @BeforeEach
    void reloj() {
        service.setClock(Clock.fixed(AHORA.atZone(Constants.ZONA_CR).toInstant(), Constants.ZONA_CR));
    }

    @Test
    @DisplayName("Vencida → rechaza y no completa ni reclama")
    void vencida() {
        rechaza(AHORA.minusSeconds(1));
    }

    @Test
    @DisplayName("Justo en la hora de expiración → rechaza")
    void enElLimite() {
        rechaza(AHORA);
    }

    @Test
    @DisplayName("Sin fechaExpiracion → rechaza (fail-closed)")
    void sinFecha() {
        rechaza(null);
    }

    @Test
    @DisplayName("Vigente → reclama y completa la venta SINPE")
    void vigente() {
        PosQrSesion s = sesion(AHORA.plusMinutes(1));
        when(posQrRepo.findByToken("tok")).thenReturn(Optional.of(s));
        when(posQrRepo.reclamarParaCompletar(s.getId())).thenReturn(1);
        when(confirmacionRepo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        service.confirmarSinpe("tok", 1L, EMPRESA, "REF123456", null);
        verify(completionService).completarVentaSinpe(s, 1L, null);
    }

    @Test
    @DisplayName("Sesión TARJETA vigente → rechaza confirmar a mano y no reclama")
    void metodoTarjeta() {
        rechazaPorMetodo("TARJETA");
    }

    @Test
    @DisplayName("Sesión sin método → rechaza (fail-closed)")
    void metodoNull() {
        rechazaPorMetodo(null);
    }

    @Test
    @DisplayName("verificarEstado usa el mismo reloj y regla: vencida o sin fecha → EXPIRADO")
    void verificarEstadoVencida() {
        for (LocalDateTime expira : new LocalDateTime[]{AHORA, null}) {
            PosQrSesion s = sesion(expira);
            when(posQrRepo.findByToken("tok")).thenReturn(Optional.of(s));
            assertThat(service.verificarEstado("tok")).isEqualTo("EXPIRADO");
        }
        verify(posQrRepo, never()).reclamarParaCompletar(any());
    }

    @Test
    @DisplayName("El token del QR se enmascara en logs")
    void mascara() {
        assertThat(PosQrVentaService.mascararToken("abcd1234-secreto")).isEqualTo("abcd****");
        assertThat(PosQrVentaService.mascararToken("abc")).isEqualTo("****");
        assertThat(PosQrVentaService.mascararToken(null)).isEqualTo("null");
    }

    private void rechazaPorMetodo(String metodo) {
        PosQrSesion s = sesion(AHORA.plusMinutes(5));
        s.setMetodoPago(metodo);
        when(posQrRepo.findByToken("tok")).thenReturn(Optional.of(s));
        assertThatThrownBy(() -> service.confirmarSinpe("tok", 1L, EMPRESA, "REF123456", null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("SINPE");
        verify(posQrRepo, never()).reclamarParaCompletar(any());
        verify(completionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    private void rechaza(LocalDateTime expira) {
        PosQrSesion s = sesion(expira);
        when(posQrRepo.findByToken("tok")).thenReturn(Optional.of(s));
        assertThatThrownBy(() -> service.confirmarSinpe("tok", 1L, EMPRESA, "REF123456", null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("vencida");
        verify(posQrRepo, never()).reclamarParaCompletar(any());
        verify(completionService, never()).completarVentaSinpe(any(), anyLong(), any());
    }

    private static PosQrSesion sesion(LocalDateTime expira) {
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        PosQrSesion s = new PosQrSesion();
        s.setId(5L);
        s.setToken("tok");
        s.setEmpresa(e);
        s.setEstado("PENDIENTE");
        s.setMetodoPago("SINPE");
        s.setFechaExpiracion(expira);
        return s;
    }
}
