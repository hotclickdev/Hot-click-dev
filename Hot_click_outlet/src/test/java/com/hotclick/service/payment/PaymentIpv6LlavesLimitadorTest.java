package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.TurnstileFormGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * LOW (limitador): las llaves por IP de {@link GuestCheckoutGuard} y {@link ReservaAntiBotService} usaban la IP
 * completa; con IPv6 quien controla un /64 rotaba la dirección y esquivaba el tope. Ahora van por
 * {@code IpParaLlave.reducir} (/64 en IPv6, IPv4 intacta).
 */
@DisplayName("[Payment] llaves por IP del anti-abuso de checkout: IPv6 → /64")
class PaymentIpv6LlavesLimitadorTest {

    private static final String A = "2001:db8:aa:bb:1111:2222:3333:4444";
    private static final String MISMO_64 = "2001:db8:aa:bb:ffff:eeee:dddd:cccc";
    private static final String OTRO_64 = "2001:db8:aa:cc:1111:2222:3333:4444";

    @AfterEach
    void limpiar() {
        RequestContextHolder.resetRequestAttributes();
    }

    // ── GuestCheckoutGuard ───────────────────────────────────────────────────────

    private final AtomicLong ids = new AtomicLong(100);
    private String ipActual = A;

    private GuestCheckoutGuard guard() {
        ClientIpResolver resolver = mock(ClientIpResolver.class);
        when(resolver.resolve(any())).thenAnswer(inv -> ipActual);
        PedidoRepository repo = mock(PedidoRepository.class);
        when(repo.findAllById(anyIterable())).thenAnswer(inv -> {
            List<Pedido> out = new ArrayList<>();
            for (Object id : (Iterable<?>) inv.getArgument(0)) {
                Pedido p = new Pedido();
                p.setId((Long) id);
                p.setEstadoPedido("PENDIENTE_COMPROBANTE");
                out.add(p);
            }
            return out;
        });
        return new GuestCheckoutGuard(mock(TurnstileFormGuard.class), resolver, repo);
    }

    private static PaymentCheckoutRequest req(String correo, long producto, int cantidad) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setGuestEmail(correo);
        r.setBodegaId(54L);
        r.setMetodoEnvio("RETIRO");
        PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO();
        i.setProductoId(producto);
        i.setCantidad(cantidad);
        r.setItems(List.of(i));
        return r;
    }

    private ResponseEntity<ResponseDTO> crear() {
        PaymentCheckoutResponse pc = new PaymentCheckoutResponse(ids.incrementAndGet(), "ORD-X", null, "PENDIENTE", 2500, "SINPE");
        return ResponseEntity.ok(ResponseDTO.success("ok", pc));
    }

    @Test
    @DisplayName("GuestCheckoutGuard: rotar la dirección dentro del mismo /64 no da cupo nuevo")
    void guardMismoSlash64ComparteCupo() {
        GuestCheckoutGuard g = guard();
        ipActual = A;
        assertThat(g.ejecutar(req("a1@x.com", 500, 3), new MockHttpServletRequest(), this::crear).getStatusCode().value()).isEqualTo(200);
        ipActual = MISMO_64;
        assertThat(g.ejecutar(req("a2@x.com", 501, 3), new MockHttpServletRequest(), this::crear).getStatusCode().value()).isEqualTo(200);
        ipActual = "2001:db8:aa:bb:9999:8888:7777:6666";
        assertThat(g.ejecutar(req("a3@x.com", 502, 1), new MockHttpServletRequest(), this::crear).getStatusCode().value())
            .as("el tercer pedido sale del mismo /64: tope de unidades pendientes").isEqualTo(429);
    }

    @Test
    @DisplayName("GuestCheckoutGuard: otro /64 y las IPv4 siguen separados")
    void guardOtroSlash64YIpv4NoSeMezclan() {
        GuestCheckoutGuard g = guard();
        ipActual = A;
        g.ejecutar(req("b1@x.com", 500, 3), new MockHttpServletRequest(), this::crear);
        g.ejecutar(req("b2@x.com", 501, 3), new MockHttpServletRequest(), this::crear);
        ipActual = OTRO_64;
        assertThat(g.ejecutar(req("b3@x.com", 502, 3), new MockHttpServletRequest(), this::crear).getStatusCode().value()).isEqualTo(200);
        ipActual = "203.0.113.7";
        assertThat(g.ejecutar(req("b4@x.com", 503, 3), new MockHttpServletRequest(), this::crear).getStatusCode().value()).isEqualTo(200);
        g.ejecutar(req("b5@x.com", 504, 3), new MockHttpServletRequest(), this::crear);
        ipActual = "203.0.113.8";
        assertThat(g.ejecutar(req("b6@x.com", 505, 3), new MockHttpServletRequest(), this::crear).getStatusCode().value())
            .as("otra IPv4 no comparte cupo con la anterior").isEqualTo(200);
    }

    // ── ReservaAntiBotService ────────────────────────────────────────────────────

    private final PagoRepository pagoRepository = mock(PagoRepository.class);
    private final ClientIpResolver ipResolver = mock(ClientIpResolver.class);
    private final Map<Long, Pago> pagos = new HashMap<>();
    private long siguienteId = 1;

    private ReservaAntiBotService servicio() {
        ReservaAntiBotService s = new ReservaAntiBotService(pagoRepository, ipResolver);
        s.setClock(Clock.fixed(Instant.parse("2026-10-04T12:00:00Z"), Constants.ZONA_CR));
        when(pagoRepository.findIdsPendientesIn(any())).thenAnswer(inv -> {
            java.util.Collection<Long> idsIn = inv.getArgument(0);
            return idsIn.stream().filter(pagos::containsKey).toList();
        });
        when(pagoRepository.findAllById(any())).thenAnswer(inv -> {
            Iterable<Long> idsIn = inv.getArgument(0);
            List<Pago> r = new ArrayList<>();
            idsIn.forEach(id -> { if (pagos.containsKey(id)) r.add(pagos.get(id)); });
            return r;
        });
        when(ipResolver.resolve(any())).thenAnswer(inv -> ((MockHttpServletRequest) inv.getArgument(0)).getRemoteAddr());
        return s;
    }

    private void conIp(String ip) {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr(ip);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(r));
    }

    private Pago reservar(ReservaAntiBotService s, int unidades) {
        Pago p = new Pago();
        p.setId(siguienteId++);
        p.setEstadoPago(Constants.PAGO_PENDIENTE);
        pagos.put(p.getId(), p);
        Usuario u = new Usuario();
        u.setId(900L + siguienteId);
        Rol rol = new Rol();
        rol.setNombreRol(Constants.ROL_USUARIO_FINAL);
        u.setRoles(new ArrayList<>(List.of(rol)));
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(1L);
        item.setCantidad(unidades);
        r.setItems(List.of(item));
        s.registrar(u, true, r, List.of(new Pedido()), p);
        return p;
    }

    @Test
    @DisplayName("ReservaAntiBot: invitados que rotan dentro del mismo /64 suman en el mismo contador")
    void antiBotMismoSlash64SumaUnidades() {
        ReservaAntiBotService s = servicio();
        conIp(A);
        reservar(s, 6);
        conIp(MISMO_64);
        Pago segunda = reservar(s, 6);
        assertThat(segunda.getFechaExpiracion()).as("12 unidades desde el mismo /64 superan el umbral").isNotNull();
    }

    @Test
    @DisplayName("ReservaAntiBot: otro /64 no suma")
    void antiBotOtroSlash64NoSuma() {
        ReservaAntiBotService s = servicio();
        conIp(A);
        reservar(s, 6);
        conIp(OTRO_64);
        assertThat(reservar(s, 6).getFechaExpiracion()).isNull();
    }
}
