package com.hotclick.service.payment;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A.1: tilopay/reintentar es permitAll; solo el dueño o el invitado con cancelToken pueden tocar el Pago. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TilopayReintentarDuenioTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private TilopayPaymentProviderAccess providerAccess;
    @Mock private UsuarioRepository usuarioRepository;
    @InjectMocks private TilopayConfirmacionService service;

    private final GuestCancelTokenService tokens = new GuestCancelTokenService();
    private Pedido pedido;
    private Pago pago;
    private final LocalDateTime expOriginal = LocalDateTime.of(2026, 1, 1, 10, 0);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(tokens, "secret", "secreto-de-prueba-no-real-0123456789");
        ReflectionTestUtils.setField(service, "guestCancelTokenService", tokens);

        Usuario duenio = usuario(7L, "duenia@example.com");
        pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("ORD-ABC");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setUsuarioFinal(duenio);

        pago = new Pago();
        pago.setId(10L);
        pago.setPedido(pedido);
        pago.setMerchantToken("ORD-ABC");
        pago.setProveedor(Constants.PROVEEDOR_TILOPAY);
        pago.setEstadoPago(Constants.PAGO_FALLIDO);
        pago.setFechaExpiracion(expOriginal);

        // Búsqueda exacta (como la query JPQL): solo el correo idéntico resuelve al dueño.
        when(usuarioRepository.findByCorreo(anyString())).thenReturn(Optional.empty());
        when(usuarioRepository.findByCorreo("duenia@example.com")).thenReturn(Optional.of(duenio));
        when(usuarioRepository.findByCorreo("otro@example.com")).thenReturn(Optional.of(usuario(8L, "otro@example.com")));
        when(pedidoRepository.findByNumeroPedido("ORD-ABC")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(1L)).thenReturn(Optional.of(pago));
        when(providerAccess.nuevaSesion(any(), anyString()))
            .thenAnswer(i -> new PaymentSession(i.getArgument(1), "https://pago.example/r", "tok-falso", true));
    }

    private static Usuario usuario(Long id, String correo) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setCorreo(correo);
        return u;
    }

    private void assertPagoIntacto() {
        assertThat(pago.getMerchantToken()).isEqualTo("ORD-ABC");
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_FALLIDO);
        assertThat(pago.getFechaExpiracion()).isEqualTo(expOriginal);
        verify(pagoRepository, never()).save(any());
        verify(providerAccess, never()).nuevaSesion(any(), anyString());
    }

    @Test
    void otroUsuarioRecibe404YPagoIntacto() {
        assertThatThrownBy(() -> service.reintentar("ORD-ABC", "otro@example.com", null))
            .isInstanceOf(RecursoNoEncontradoException.class).hasMessage("Pedido no encontrado");
        assertPagoIntacto();
    }

    @Test
    void anonimoSinTokenRecibe404YPagoIntacto() {
        assertThatThrownBy(() -> service.reintentar("ORD-ABC", null, null))
            .isInstanceOf(RecursoNoEncontradoException.class).hasMessage("Pedido no encontrado");
        assertPagoIntacto();
    }

    @Test
    void tokenIncorrectoOdeOtroPedidoRecibe404YPagoIntacto() {
        assertThatThrownBy(() -> service.reintentar("ORD-ABC", null, "deadbeef"))
            .isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.reintentar("ORD-ABC", null, tokens.emitir("ORD-OTRO", GuestCancelTokenService.Proposito.REINTENTAR)))
            .isInstanceOf(RecursoNoEncontradoException.class);
        assertPagoIntacto();
    }

    @Test
    void tokenDeCancelarNoSirveParaReintentar() {
        assertThatThrownBy(() -> service.reintentar("ORD-ABC", null, tokens.emitir("ORD-ABC")))
            .isInstanceOf(RecursoNoEncontradoException.class);
        assertPagoIntacto();
    }

    @Test
    void pedidoInexistenteDaElMismo404() {
        when(pedidoRepository.findByNumeroPedido("NO-EXISTE")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.reintentar("NO-EXISTE", null, null))
            .isInstanceOf(RecursoNoEncontradoException.class).hasMessage("Pedido no encontrado");
    }

    @Test
    void duenioAutenticadoReintenta() {
        PaymentSession s = service.reintentar("ORD-ABC", "duenia@example.com", null);
        assertThat(s.externalId()).isEqualTo("ORD-ABC-R2");
        assertThat(pago.getMerchantToken()).isEqualTo("ORD-ABC-R2");
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(pagoRepository).save(pago);
    }

    /** C1: variantes Unicode que equalsIgnoreCase daba por iguales; cada una es otra cuenta. */
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({
        "\u017Fam@example.com, sam@example.com",
        "\u212Aim@example.com, kim@example.com",
        "\u0130na@example.com, ina@example.com",
        "DUENIA@example.com, duenia@example.com"
    })
    void varianteUnicodeDelCorreoDelDuenioRecibe404(String atacante, String victima) {
        Usuario v = usuario(7L, victima);
        pedido.setUsuarioFinal(v);
        when(usuarioRepository.findByCorreo(victima)).thenReturn(Optional.of(v));
        when(usuarioRepository.findByCorreo(atacante)).thenReturn(Optional.of(usuario(99L, atacante)));
        assertThat(atacante.equalsIgnoreCase(victima)).isTrue(); // el chequeo viejo los aceptaba

        assertThatThrownBy(() -> service.reintentar("ORD-ABC", atacante, null))
            .isInstanceOf(RecursoNoEncontradoException.class).hasMessage("Pedido no encontrado");
        assertPagoIntacto();
    }

    @Test
    void usuarioAutenticadoInexistenteRecibe404() {
        assertThatThrownBy(() -> service.reintentar("ORD-ABC", "fantasma@example.com", null))
            .isInstanceOf(RecursoNoEncontradoException.class);
        assertPagoIntacto();
    }

    @Test
    void invitadoConCancelTokenValidoReintenta() {
        PaymentSession s = service.reintentar("ORD-ABC", null, tokens.emitir("ORD-ABC", GuestCancelTokenService.Proposito.REINTENTAR));
        assertThat(s.externalId()).isEqualTo("ORD-ABC-R2");
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }
}
