package com.hotclick.service.sinpe;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** P-02 (lock en aprobar/rechazar) y P-03 (token de invitado, respuesta uniforme, correo sin mayúsculas). C1, C2, C4. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SinpeGuestEndurecidoTest {

    @Mock PedidoRepository pedidoRepository;
    @Mock ComprobanteSinpeRepository comprobanteRepository;
    @Mock SupabaseStorageService storageService;
    @Mock GuestCancelTokenService guestTokenService;
    @Mock SinpeAprobacionGuard aprobacionGuard;
    @Mock SinpeComprobantePersistenceService persistenceService;
    @Mock PaymentService paymentService;
    @InjectMocks SinpeComprobanteService service;

    private final MockMultipartFile img = new MockMultipartFile("imagen", "c.png", "image/png", new byte[]{1});

    private Pedido pedido(String correo) {
        Usuario u = new Usuario();
        u.setCorreo(correo);
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-9");
        p.setUsuarioFinal(u);
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        return p;
    }

    @Test
    void invitadoSinToken_rechazaAntesDeBuscarElPedido() {
        when(guestTokenService.esValido("ORD-9", null)).thenReturn(false);
        assertThatThrownBy(() -> service.subirComprobanteInvitado("ORD-9", null, img, "Ana", null, null, "a@x.cr"))
            .isInstanceOf(SecurityException.class).hasMessage(SinpeComprobanteService.PEDIDO_NO_VALIDO);
        verifyNoInteractions(pedidoRepository, storageService);
    }

    @Test
    void pedidoInexistenteYAjeno_mismoError() {
        when(pedidoRepository.findByNumeroPedido("NOPE")).thenReturn(Optional.empty());
        when(pedidoRepository.findByNumeroPedido("ORD-9")).thenReturn(Optional.of(pedido("duena@x.cr")));
        assertThatThrownBy(() -> service.subirComprobante("NOPE", img, "Ana", null, null, "a@x.cr"))
            .isInstanceOf(SecurityException.class).hasMessage(SinpeComprobanteService.PEDIDO_NO_VALIDO);
        assertThatThrownBy(() -> service.subirComprobante("ORD-9", img, "Ana", null, null, "otro@x.cr"))
            .isInstanceOf(SecurityException.class).hasMessage(SinpeComprobanteService.PEDIDO_NO_VALIDO);
        verifyNoInteractions(storageService);
    }

    @Test
    void correoConMayusculasYEspacios_esElMismoDueno() throws Exception {
        when(guestTokenService.esValido("ORD-9", "tk")).thenReturn(true);
        when(pedidoRepository.findByNumeroPedido("ORD-9")).thenReturn(Optional.of(pedido("Ana@X.cr")));
        when(storageService.subirComprobantePrivado(any())).thenReturn("k");
        service.subirComprobanteInvitado("ORD-9", "tk", img, "Ana", null, null, "  ana@x.CR ");
        verify(persistenceService).guardar(eq("ORD-9"), eq("k"), eq("Ana"), any(), any(), any());
    }

    @Test
    void correoNulo_fallaCerrado() {
        assertThat(SinpeComprobanteService.mismoCorreo(pedido(null), "a@x.cr")).isFalse();
        assertThat(SinpeComprobanteService.mismoCorreo(pedido("a@x.cr"), null)).isFalse();
        assertThat(SinpeComprobanteService.mismoCorreo(null, "a@x.cr")).isFalse();
    }

    @Test
    void aprobarYRechazar_bloqueanLaFilaDelComprobante() {
        ComprobanteSinpe c = new ComprobanteSinpe();
        c.setEstado(Constants.COMPROBANTE_APROBADO);
        when(comprobanteRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(c));
        // El segundo admin ve el estado ya resuelto (tras esperar el lock) y no toca nada.
        assertThatThrownBy(() -> service.rechazar(7L, "x", "b@x.cr", 2L)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.aprobar(7L, "b@x.cr", 2L)).isInstanceOf(IllegalStateException.class);
        verify(comprobanteRepository, times(2)).findByIdForUpdate(7L);
        verify(comprobanteRepository, never()).findById(anyLong());
        verifyNoInteractions(paymentService);
    }
}
