package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Regla anti-bot de reservas (QA-CONC-4)")
class ReservaAntiBotServiceTest {

    private final PagoRepository pagoRepository = mock(PagoRepository.class);
    private final ClientIpResolver ipResolver = mock(ClientIpResolver.class);
    private final Map<Long, Pago> pagos = new HashMap<>();
    private ReservaAntiBotService servicio;
    private Instant t0;
    private long siguienteId = 1;

    @BeforeEach
    void setUp() {
        servicio = new ReservaAntiBotService(pagoRepository, ipResolver);
        t0 = Instant.parse("2026-10-04T12:00:00Z");
        servicio.setClock(Clock.fixed(t0, Constants.ZONA_CR));
        when(pagoRepository.findIdsPendientesIn(any())).thenAnswer(inv -> {
            Collection<Long> ids = inv.getArgument(0);
            return ids.stream().filter(id -> pagos.containsKey(id)
                && Constants.PAGO_PENDIENTE.equals(pagos.get(id).getEstadoPago())).toList();
        });
        when(pagoRepository.findAllById(any())).thenAnswer(inv -> {
            Iterable<Long> ids = inv.getArgument(0);
            List<Pago> r = new ArrayList<>();
            ids.forEach(id -> { if (pagos.containsKey(id)) r.add(pagos.get(id)); });
            return r;
        });
        when(ipResolver.resolve(any())).thenAnswer(inv ->
            ((MockHttpServletRequest) inv.getArgument(0)).getRemoteAddr());
        conIp("203.0.113.7");
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("invitado: 10 unidades en la ventana no marcan nada; la 11.ª marca todas las activas")
    void umbralPorUnidades() {
        Pago a = reservar(invitado(), 5);
        Pago b = reservar(invitado(), 5);
        assertThat(a.getFechaExpiracion()).isNull();
        assertThat(b.getFechaExpiracion()).isNull();

        Pago c = reservar(invitado(), 1);
        LocalDateTime liberarEn = LocalDateTime.ofInstant(t0, Constants.ZONA_CR).plusMinutes(15);
        assertThat(List.of(a, b, c)).allSatisfy(p -> assertThat(p.getFechaExpiracion()).isEqualTo(liberarEn));
    }

    @Test
    @DisplayName("se cuentan solo reservas activas: una pagada/cancelada no suma")
    void soloActivas() {
        Pago a = reservar(invitado(), 8);
        a.setEstadoPago(Constants.PAGO_CANCELADO);
        Pago b = reservar(invitado(), 8);
        assertThat(b.getFechaExpiracion()).isNull();
    }

    @Test
    @DisplayName("fuera de la ventana no suma")
    void ventana() {
        reservar(invitado(), 8);
        servicio.setClock(Clock.fixed(t0.plus(Duration.ofMinutes(16)), Constants.ZONA_CR));
        Pago b = reservar(invitado(), 8);
        assertThat(b.getFechaExpiracion()).isNull();
    }

    @Test
    @DisplayName("invitados con distinto correo pero la misma IP comparten contador; otra IP no")
    void invitadoPorIp() {
        reservar(invitado(), 6);
        conIp("198.51.100.9");
        Pago otraIp = reservar(invitado(), 6);
        assertThat(otraIp.getFechaExpiracion()).isNull();
        conIp("203.0.113.7");
        Pago mismaIp = reservar(invitado(), 6);
        assertThat(mismaIp.getFechaExpiracion()).isNotNull();
    }

    @Test
    @DisplayName("logueado: cuenta por usuario aunque cambie la IP")
    void logueadoPorUsuario() {
        Usuario u = usuario(50L, Constants.ROL_USUARIO_FINAL, null);
        reservar(u, false, 6, null);
        conIp("198.51.100.9");
        Pago p = reservar(u, false, 6, null);
        assertThat(p.getFechaExpiracion()).isNotNull();
    }

    @Test
    @DisplayName("excluidos: ADMIN, vendedor en su propio negocio y cobro de QR de POS")
    void excluidos() {
        Usuario admin = usuario(1L, Constants.ROL_ADMIN, null);
        reservar(admin, false, 20, null);
        assertThat(reservar(admin, false, 20, null).getFechaExpiracion()).isNull();

        Empresa propia = new Empresa();
        propia.setId(7L);
        Usuario vendedor = usuario(2L, Constants.ROL_EMPRENDEDOR, propia);
        reservar(vendedor, false, 20, propia);
        assertThat(reservar(vendedor, false, 20, propia).getFechaExpiracion()).isNull();

        PaymentCheckoutRequest pos = request(20);
        pos.setPosQrToken("qr-123");
        Pago p = nuevoPago();
        servicio.registrar(invitado(), true, pos, List.of(pedido(null)), p);
        servicio.registrar(invitado(), true, pos, List.of(pedido(null)), nuevoPago());
        assertThat(p.getFechaExpiracion()).isNull();
    }

    @Test
    @DisplayName("una marca nunca alarga una expiración más corta que ya tenía el pago")
    void noAlarga() {
        Pago a = reservar(invitado(), 6);
        LocalDateTime antes = LocalDateTime.ofInstant(t0, Constants.ZONA_CR).plusMinutes(5);
        a.setFechaExpiracion(antes);
        reservar(invitado(), 6);
        assertThat(a.getFechaExpiracion()).isEqualTo(antes);
    }

    @Test
    @DisplayName("el log usa una huella, no la IP ni el id")
    void huella() {
        String h = ReservaAntiBotService.huella("ip:203.0.113.7");
        assertThat(h).hasSize(12).doesNotContain("203");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void conIp(String ip) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(ip);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(req));
    }

    private Pago reservar(Usuario invitado, int unidades) {
        return reservar(invitado, true, unidades, null);
    }

    private Pago reservar(Usuario u, boolean invitado, int unidades, Empresa empresa) {
        Pago p = nuevoPago();
        servicio.registrar(u, invitado, request(unidades), List.of(pedido(empresa)), p);
        return p;
    }

    private Pago nuevoPago() {
        Pago p = new Pago();
        p.setId(siguienteId++);
        p.setEstadoPago(Constants.PAGO_PENDIENTE);
        pagos.put(p.getId(), p);
        return p;
    }

    private static PaymentCheckoutRequest request(int unidades) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(1L);
        item.setCantidad(unidades);
        r.setItems(List.of(item));
        return r;
    }

    private static Pedido pedido(Empresa empresa) {
        Pedido p = new Pedido();
        p.setEmpresa(empresa);
        return p;
    }

    private Usuario invitado() {
        return usuario(900L + siguienteId, Constants.ROL_USUARIO_FINAL, null);
    }

    private static Usuario usuario(Long id, String rol, Empresa empresa) {
        Usuario u = new Usuario();
        u.setId(id);
        Rol r = new Rol();
        r.setNombreRol(rol);
        u.setRoles(new ArrayList<>(List.of(r)));
        u.setEmpresa(empresa);
        return u;
    }
}
