package com.hotclick.service;

import com.hotclick.controller.TestimonioController;
import com.hotclick.dto.RegisterRequest;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.auth.AuthRegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Ley 8968: el chat de alertas ops (TelegramService) no recibe nombre, correo, teléfono ni comentarios de personas. */
@DisplayName("Chat ops de Telegram: sin datos personales")
class TelegramOpsSinPiiTest {

    private static final String NOMBRE = "María Fernanda Quesada";
    private static final String CORREO = "maria.quesada@correo.cr";
    private static final String TELEFONO = "88887777";
    private static final String COMENTARIO = "Excelente atención de Jimena, mi cédula es 1-2345-6789";

    private final TelegramService telegram = mock(TelegramService.class);

    private String textoEnviado() {
        ArgumentCaptor<String> c = ArgumentCaptor.forClass(String.class);
        verify(telegram).enviar(c.capture());
        return c.getValue();
    }

    private static void sinPii(String texto) {
        assertThat(texto).doesNotContain("María").doesNotContain("Quesada").doesNotContain(NOMBRE)
            .doesNotContain(CORREO).doesNotContain("@").doesNotContain(TELEFONO)
            .doesNotContain("Jimena").doesNotContain("cédula").doesNotContain("usuario@");
    }

    @Test
    @DisplayName("registro: el aviso no lleva nombre, correo ni teléfono")
    void registro() throws Exception {
        AuthRegistrationService svc = new AuthRegistrationService();
        TurnstileService turnstile = mock(TurnstileService.class);
        SecurityAuditService audit = mock(SecurityAuditService.class);
        UsuarioService usuarioService = mock(UsuarioService.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(turnstile.verify(any(), any())).thenReturn(true);
        when(encoder.encode(any())).thenReturn("hash");
        when(usuarioService.registrarSolicitud(any())).thenAnswer(i -> i.getArgument(0));
        ReflectionTestUtils.setField(svc, "turnstileService", turnstile);
        ReflectionTestUtils.setField(svc, "securityAuditService", audit);
        ReflectionTestUtils.setField(svc, "usuarioService", usuarioService);
        ReflectionTestUtils.setField(svc, "passwordEncoder", encoder);
        ReflectionTestUtils.setField(svc, "telegramService", telegram);

        RegisterRequest req = new RegisterRequest();
        req.setNombre(NOMBRE);
        req.setCorreo(CORREO);
        req.setContrasena("Segura12345");
        req.setTelefono(TELEFONO);
        req.setDeclaraMayoriaEdad(true);
        svc.register(req, mock(HttpServletRequest.class));

        sinPii(textoEnviado());
    }

    @Test
    @DisplayName("nueva compra: el aviso ops no lleva el nombre del cliente; el bot del negocio sí lo recibe")
    void nuevaCompra() {
        PedidoService svc = new PedidoService();
        PedidoRepository repo = mock(PedidoRepository.class);
        TelegramNotificacionClienteService negocio = mock(TelegramNotificacionClienteService.class);
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        ReflectionTestUtils.setField(svc, "pedidoRepository", repo);
        ReflectionTestUtils.setField(svc, "telegramService", telegram);
        ReflectionTestUtils.setField(svc, "telegramNotificacionClienteService", negocio);

        Pedido p = new Pedido();
        p.setClienteNombre(NOMBRE);
        p.setTotalPedido(25000);
        p.setMetodoPago("SINPE");
        p.setEstadoPedido("PENDIENTE");
        com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
        e.setId(4L);
        p.setEmpresa(e);
        Pedido saved = svc.crearPedido(p);

        String texto = textoEnviado();
        sinPii(texto);
        assertThat(texto).contains(saved.getNumeroPedido()).contains("25").contains("SINPE");
        verify(negocio).notificarVenta(eq(4L), eq(saved.getNumeroPedido()), eq(25000), eq("SINPE"), eq(NOMBRE),
            any(), any());
    }

    private TestimonioController controller() {
        TestimonioController c = new TestimonioController();
        TextModerationService mod = mock(TextModerationService.class);
        when(mod.moderar(anyString())).thenReturn(new TextModerationService.ModerationResult(true, null));
        ReflectionTestUtils.setField(c, "textModerationService", mod);
        ReflectionTestUtils.setField(c, "testimonioService", mock(TestimonioService.class));
        ReflectionTestUtils.setField(c, "telegramService", telegram);
        return c;
    }

    private static UserDetails usuarioLogueado() {
        UserDetails ud = mock(UserDetails.class);
        when(ud.getUsername()).thenReturn(CORREO);
        return ud;
    }

    @Test
    @DisplayName("testimonio: el aviso ops no lleva usuario ni comentario")
    void testimonio() {
        Map<String, Object> body = new HashMap<>();
        body.put("comentario", COMENTARIO);
        controller().crearTestimonio(body, usuarioLogueado());
        String texto = textoEnviado();
        sinPii(texto);
        assertThat(texto).contains("testimonio");
    }

    @Test
    @DisplayName("reseña: el aviso ops no lleva usuario ni comentario")
    void resena() {
        Map<String, Object> body = new HashMap<>();
        body.put("comentario", COMENTARIO);
        body.put("productoId", 10);
        body.put("calificacion", 5);
        controller().crearResena(body, usuarioLogueado());
        String texto = textoEnviado();
        sinPii(texto);
        assertThat(texto).contains("reseña");
    }
}
