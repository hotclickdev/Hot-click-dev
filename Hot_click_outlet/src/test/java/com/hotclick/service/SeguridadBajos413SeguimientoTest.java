package com.hotclick.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.controller.storefront.StorefrontGuestOrderService;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.auth.AuthEmailOtpHandler;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.payment.GuestUserResolver;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BAJOS de Seguridad sobre #413 (puntos 1, 2 y 5). Datos ficticios: el «PII» es un correo inventado que viaja
 * dentro del mensaje de la excepción.
 */
@DisplayName("[BAJOS #413] Sin getMessage() en logs y respuestas; teléfono sin dígitos; parámetro sin usar")
class SeguridadBajos413SeguimientoTest {

    private static final String PII = "pii.fict@test.cr";
    private static final String MENSAJE_GENERICO = "No se pudo enviar el código. Intentá de nuevo en unos minutos.";

    private final List<Logger> loggers = new ArrayList<>();
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void setUp() {
        appender.start();
    }

    @AfterEach
    void tearDown() {
        loggers.forEach(l -> l.detachAppender(appender));
    }

    private void escuchar(Class<?> clase) {
        Logger l = (Logger) LoggerFactory.getLogger(clase);
        l.setLevel(Level.ALL);
        l.addAppender(appender);
        loggers.add(l);
    }

    private static RuntimeException conPii() {
        return new RuntimeException("falló para " + PII, new IllegalStateException("causa " + PII));
    }

    // ───────────── 1. StorefrontGuestOrderService:166 y :172 ─────────────

    @Test
    @DisplayName("1. notificarPedidoNuevo: ni el webhook ni el correo fallido dejan el correo en el log")
    void storefrontNoLogueaGetMessage() {
        escuchar(StorefrontGuestOrderService.class);
        N8nWebhookService n8n = mock(N8nWebhookService.class);
        NotificacionEmailService email = mock(NotificacionEmailService.class);
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-FICT-9");
        doThrow(conPii()).when(n8n).notificarPedidoNuevo(pedido);
        doThrow(conPii()).when(email).enviarPedidoRecibido(pedido);
        StorefrontGuestOrderService s = new StorefrontGuestOrderService(null, null, null, null, null, n8n, email);

        ReflectionTestUtils.invokeMethod(s, "notificarPedidoNuevo", pedido);

        assertThat(appender.list).as("un log por cada fallo").hasSize(2);
        for (ILoggingEvent ev : appender.list) {
            assertThat(ev.getFormattedMessage()).contains("ORD-FICT-9").contains("RuntimeException")
                .doesNotContain(PII).doesNotContain("pii.fict");
            assertThat(ev.getThrowableProxy()).as("stack saneado (ExcepcionSaneada), no la excepción original").isNotNull();
            assertThat(ev.getThrowableProxy().getClassName()).endsWith("ExcepcionSaneada");
            assertThat(ev.getThrowableProxy().getCause()).isNull();
            assertThat(ev.getThrowableProxy().getMessage()).doesNotContain(PII).doesNotContain("pii.fict");
        }
    }

    // ───────────── 2. AuthEmailOtpHandler:52 y :68 ─────────────

    private static String mensaje(org.springframework.http.ResponseEntity<ResponseDTO> res) {
        assertThat(res.getBody()).isNotNull();
        return res.getBody().getMessage();
    }

    @Test
    @DisplayName("2. sendLoginEmailOtp: el 400 lleva un mensaje genérico, no el de la excepción")
    void emailOtpSendMensajeGenerico() {
        AuthEmailOtpHandler h = new AuthEmailOtpHandler();
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.isTempToken(anyString())).thenThrow(conPii());
        ReflectionTestUtils.setField(h, "jwtUtil", jwt);

        var res = h.sendLoginEmailOtp(Map.of("tempToken", "t"), new MockHttpServletRequest());

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(mensaje(res)).isEqualTo(MENSAJE_GENERICO)
            .doesNotContain(PII).doesNotContain("pii.fict");
    }

    @Test
    @DisplayName("2. enableEmailOtp: el 400 lleva un mensaje genérico, no el de la excepción")
    void emailOtpEnableMensajeGenerico() {
        AuthEmailOtpHandler h = new AuthEmailOtpHandler();
        AuthSupport authSupport = mock(AuthSupport.class);
        when(authSupport.usuarioFromRequest(any())).thenThrow(conPii());
        ReflectionTestUtils.setField(h, "authSupport", authSupport);

        var res = h.enableEmailOtp(new MockHttpServletRequest());

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(mensaje(res)).isEqualTo(MENSAJE_GENERICO)
            .doesNotContain(PII).doesNotContain("pii.fict");
    }

    // ───────────── 5. GuestUserResolver:54 y TelegramService:63 ─────────────

    private Usuario crearInvitadoConTelefono(String telefono) {
        GuestUserResolver r = new GuestUserResolver();
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        RolRepository roles = mock(RolRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("hash");
        when(usuarios.findByCorreo(anyString())).thenReturn(Optional.empty());
        when(usuarios.findAllByCorreoIgnoreCase(anyString())).thenReturn(List.of());
        when(usuarios.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(roles.findByNombreRol(anyString())).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(r, "usuarioRepository", usuarios);
        ReflectionTestUtils.setField(r, "rolRepository", roles);
        ReflectionTestUtils.setField(r, "passwordEncoder", encoder);
        Usuario u = r.resolve("nuevo.fict@test.cr", telefono);
        verify(usuarios).save(u);
        return u;
    }

    @Test
    @DisplayName("5. teléfono sin dígitos (letras o signos) → 00000000, igual que en blanco o null")
    void telefonoSinDigitosUsaCeros() {
        assertThat(crearInvitadoConTelefono("abc").getTelefono()).isEqualTo("00000000");
        assertThat(crearInvitadoConTelefono("+ - ( )").getTelefono()).isEqualTo("00000000");
        assertThat(crearInvitadoConTelefono("   ").getTelefono()).isEqualTo("00000000");
        assertThat(crearInvitadoConTelefono(null).getTelefono()).isEqualTo("00000000");
    }

    @Test
    @DisplayName("5. teléfono con dígitos: se conservan solo los dígitos")
    void telefonoConDigitosSeLimpia() {
        assertThat(crearInvitadoConTelefono("+506 8888-1111").getTelefono()).isEqualTo("50688881111");
    }

    @Test
    @DisplayName("5. TelegramService.reenviarSinFormato no recibe el parámetro «respuesta» sin usar")
    void reenviarSinFormatoSinParametroSobrante() {
        List<Method> candidatos = new ArrayList<>();
        for (Method m : TelegramService.class.getDeclaredMethods()) {
            if (m.getName().equals("reenviarSinFormato")) candidatos.add(m);
        }
        assertThat(candidatos).hasSize(1);
        assertThat(candidatos.get(0).getParameterTypes()).containsExactly(String.class);
    }
}
