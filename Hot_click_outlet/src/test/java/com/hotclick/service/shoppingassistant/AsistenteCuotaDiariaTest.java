package com.hotclick.service.shoppingassistant;

import com.hotclick.model.Empresa;
import com.hotclick.rag.dto.AccionChat;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.ClientIpResolver;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Cupo diario del asistente: cliente, plan, global, medianoche CR, atómico y fail-closed")
class AsistenteCuotaDiariaTest {

    private static final ZoneId CR = ZoneId.of("America/Costa_Rica");
    private static final String VISITOR_A = "0b5f2c1e-3f0a-4d0e-9a52-1d6f0c9a7b11";

    /** Reloj mutable para simular el paso de la medianoche. */
    static final class RelojTest extends Clock {
        volatile Instant ahora;
        RelojTest(Instant ahora) { this.ahora = ahora; }
        @Override public ZoneId getZone() { return CR; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return ahora; }
    }

    private final JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
        "jdbc:h2:mem:cupo" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
    private final EmpresaRepository empresas = mock(EmpresaRepository.class);
    private final ClientIpResolver ips = mock(ClientIpResolver.class);
    // 2026-10-26 12:00 en Costa Rica (UTC-6) = 18:00Z
    private final RelojTest reloj = new RelojTest(Instant.parse("2026-10-26T18:00:00Z"));

    @BeforeEach
    void setUp() {
        jdbc.execute("CREATE TABLE hot_click_asistente_cuota_dia_tb (clave VARCHAR(120) NOT NULL, dia DATE NOT NULL, "
            + "usos INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (clave, dia))");
        when(ips.resolve(any())).thenReturn("203.0.113.9");
        when(empresas.findNombrePlanEfectivo(any())).thenReturn(Optional.empty());
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    private AsistenteCuotaDiaria cuota(int cliente, int emp, int pyme, int plus, int mkt, int global) {
        return cuota(cliente, emp, pyme, plus, mkt, global, "");
    }

    private AsistenteCuotaDiaria cuota(int cliente, int emp, int pyme, int plus, int mkt, int global, String soporte) {
        return new AsistenteCuotaDiaria(jdbc, empresas, ips, reloj, cliente, emp, pyme, plus, mkt, global,
            new AsistenteLimiteMensaje(empresas, soporte, "límite cliente", "límite agotado"));
    }

    private AsistenteCuotaDiaria cuotaPorDefecto() {
        return cuota(20, 100, 300, 1000, 1000, 3000);
    }

    private static String visitor(int i) {
        return new UUID(0xABCDL, i).toString();
    }

    private int usos(String clave) {
        List<Integer> r = jdbc.queryForList("SELECT usos FROM hot_click_asistente_cuota_dia_tb WHERE clave = ?",
            Integer.class, clave);
        return r.isEmpty() ? 0 : r.get(0);
    }

    private void planDe(long empresaId, String plan) {
        when(empresas.findNombrePlanEfectivo(empresaId)).thenReturn(Optional.ofNullable(plan));
    }

    @Test
    @DisplayName("Cliente: el mensaje 21 del mismo visitante se niega con aviso y botones")
    void cliente_veinteYElVeintiunoNiega() {
        AsistenteCuotaDiaria c = cuotaPorDefecto();
        for (int i = 0; i < 20; i++) assertThat(c.reservar(7L, false, VISITOR_A).permitida()).isTrue();

        var r = c.reservar(7L, false, VISITOR_A);

        assertThat(r.permitida()).isFalse();
        assertThat(r.motivo()).isEqualTo(AsistenteCuotaDiaria.Motivo.CLIENTE);
        assertThat(r.mensaje()).isEqualTo("límite cliente");
        assertThat(r.acciones()).extracting(AccionChat::tipo).contains(AccionChat.BUSCAR);
        // otro visitante sigue entrando y el rechazo no consumió cupo del negocio
        assertThat(c.reservar(7L, false, visitor(1)).permitida()).isTrue();
        assertThat(usos("n:7")).isEqualTo(21);
    }

    @Test
    @DisplayName("Plan: Emprendedor 100, Pyme 300, Negocio Plus 1000; sin plan o desconocido = Emprendedor")
    void topesPorPlan() {
        AsistenteCuotaDiaria c = cuotaPorDefecto();
        planDe(1, "EMPRENDEDOR"); planDe(2, "PYME"); planDe(3, "Negocio Plus"); planDe(4, null); planDe(5, "OTRO");
        assertThat(c.topePlan(1L)).isEqualTo(100);
        assertThat(c.topePlan(2L)).isEqualTo(300);
        assertThat(c.topePlan(3L)).isEqualTo(1000);
        assertThat(c.topePlan(4L)).isEqualTo(100);
        assertThat(c.topePlan(5L)).isEqualTo(100);
    }

    @Test
    @DisplayName("Plan: error leyendo el plan cuenta como Emprendedor (no abre de más)")
    void errorLeyendoPlan_esEmprendedor() {
        when(empresas.findNombrePlanEfectivo(9L)).thenThrow(new IllegalStateException("bd"));
        assertThat(cuotaPorDefecto().topePlan(9L)).isEqualTo(100);
    }

    @Test
    @DisplayName("Negocio: al llegar al tope del plan se niega aunque el cliente tenga cupo, y se devuelve el del cliente")
    void negocio_topeDelPlan_yRollbackDelCliente() {
        AsistenteCuotaDiaria c = cuota(20, 3, 6, 9, 9, 3000);
        planDe(7, "EMPRENDEDOR");
        for (int i = 0; i < 3; i++) assertThat(c.reservar(7L, false, visitor(i)).permitida()).isTrue();

        var r = c.reservar(7L, false, visitor(50));

        assertThat(r.permitida()).isFalse();
        assertThat(r.motivo()).isEqualTo(AsistenteCuotaDiaria.Motivo.NEGOCIO);
        assertThat(r.mensaje()).isEqualTo("límite agotado");
        assertThat(usos("c:v:" + visitor(50))).isZero();
        assertThat(usos("n:7")).isEqualTo(3);
        // otra tienda no se ve afectada
        assertThat(c.reservar(8L, false, visitor(50)).permitida()).isTrue();
    }

    @Test
    @DisplayName("Global: al tope se niega y se devuelven los cupos de cliente y negocio")
    void global_topeYRollback() {
        AsistenteCuotaDiaria c = cuota(20, 100, 300, 1000, 1000, 2);
        assertThat(c.reservar(1L, false, visitor(1)).permitida()).isTrue();
        assertThat(c.reservar(2L, false, visitor(2)).permitida()).isTrue();

        var r = c.reservar(3L, false, visitor(3));

        assertThat(r.permitida()).isFalse();
        assertThat(r.motivo()).isEqualTo(AsistenteCuotaDiaria.Motivo.GLOBAL);
        assertThat(usos("g")).isEqualTo(2);
        assertThat(usos("n:3")).isZero();
        assertThat(usos("c:v:" + visitor(3))).isZero();
    }

    @Test
    @DisplayName("Marketplace: tiene su propio tope, independiente de las tiendas")
    void marketplace_topePropio() {
        AsistenteCuotaDiaria c = cuota(20, 100, 300, 1000, 2, 3000);
        assertThat(c.reservar(null, true, visitor(1)).permitida()).isTrue();
        assertThat(c.reservar(1L, true, visitor(2)).permitida()).isTrue();
        assertThat(c.reservar(null, true, visitor(3)).permitida()).isFalse();
        assertThat(c.reservar(1L, false, visitor(3)).permitida()).isTrue();
    }

    @Test
    @DisplayName("Medianoche en Costa Rica: a las 23:59 sigue el día; a las 00:00 se reinicia")
    void reinicioALaMedianocheDeCostaRica() {
        AsistenteCuotaDiaria c = cuota(2, 100, 300, 1000, 1000, 3000);
        reloj.ahora = Instant.parse("2026-10-27T05:59:00Z"); // 26-oct 23:59 CR
        assertThat(c.reservar(7L, false, VISITOR_A).permitida()).isTrue();
        assertThat(c.reservar(7L, false, VISITOR_A).permitida()).isTrue();
        assertThat(c.reservar(7L, false, VISITOR_A).permitida()).isFalse();

        reloj.ahora = Instant.parse("2026-10-27T06:00:00Z"); // 27-oct 00:00 CR (en UTC aún es 06:00, no medianoche)
        assertThat(c.reservar(7L, false, VISITOR_A).permitida()).isTrue();
        assertThat(usos("c:v:" + VISITOR_A)).isEqualTo(1);
    }

    @Test
    @DisplayName("Concurrencia: 60 hilos contra un tope de 10 nunca lo superan")
    void concurrencia_noSuperaElTope() throws Exception {
        AsistenteCuotaDiaria c = cuota(1000, 10, 10, 10, 10, 1000);
        ExecutorService ex = Executors.newFixedThreadPool(12);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        List<Future<?>> fs = new java.util.ArrayList<>();
        for (int i = 0; i < 60; i++) {
            final int n = i;
            fs.add(ex.submit(() -> {
                go.await();
                if (c.reservar(7L, false, visitor(n)).permitida()) ok.incrementAndGet();
                return null;
            }));
        }
        go.countDown();
        for (Future<?> f : fs) f.get(30, TimeUnit.SECONDS);
        ex.shutdown();
        assertThat(ok.get()).isEqualTo(10);
        assertThat(usos("n:7")).isEqualTo(10);
        assertThat(usos("g")).isEqualTo(10);
    }

    @Test
    @DisplayName("Fail-closed: sin tabla o con la BD caída se niega")
    void failClosed() {
        jdbc.execute("DROP TABLE hot_click_asistente_cuota_dia_tb");
        var r = cuotaPorDefecto().reservar(7L, false, VISITOR_A);
        assertThat(r.permitida()).isFalse();
        assertThat(r.motivo()).isEqualTo(AsistenteCuotaDiaria.Motivo.ERROR);
        assertThat(r.acciones()).isNotEmpty();

        JdbcTemplate caido = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:tcp://127.0.0.1:1/noexiste", "sa", ""));
        var c = new AsistenteCuotaDiaria(caido, empresas, ips, reloj, 20, 100, 300, 1000, 1000, 3000,
            new AsistenteLimiteMensaje(empresas, "", "a", "b"));
        assertThat(c.reservar(null, true, null).permitida()).isFalse();
    }

    @Test
    @DisplayName("Topes en cero (configurables) niegan siempre")
    void topeCero_niega() {
        assertThat(cuota(0, 100, 300, 1000, 1000, 3000).reservar(7L, false, VISITOR_A).permitida()).isFalse();
    }

    @Test
    @DisplayName("Clave de cliente: usuario autenticado > visitorId UUID válido > IP")
    void claveCliente() {
        AsistenteCuotaDiaria c = cuotaPorDefecto();
        MockHttpServletRequest req = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(req));

        assertThat(c.claveCliente(VISITOR_A)).isEqualTo("v:" + VISITOR_A);
        assertThat(c.claveCliente(VISITOR_A.toUpperCase())).isEqualTo("v:" + VISITOR_A);
        assertThat(c.claveCliente("no-es-uuid")).isEqualTo("ip:203.0.113.9");
        assertThat(c.claveCliente(null)).isEqualTo("ip:203.0.113.9");
        assertThat(c.claveCliente("0b5f2c1e-3f0a-4d0e-9a52-1d6f0c9a7b11-x")).isEqualTo("ip:203.0.113.9");

        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("ana@correo.test", "x", "ROLE_USER"));
        String usuario = c.claveCliente(VISITOR_A);
        assertThat(usuario).startsWith("u:").doesNotContain("ana").hasSize(34);
        assertThat(c.claveCliente(visitor(9))).isEqualTo(usuario);
    }

    @Test
    @DisplayName("Un visitorId rotando no evita el tope del negocio ni el global")
    void visitorRotando_noEvitaTopes() {
        AsistenteCuotaDiaria c = cuota(20, 5, 5, 5, 5, 3000);
        int ok = 0;
        for (int i = 0; i < 30; i++) if (c.reservar(7L, false, visitor(i)).permitida()) ok++;
        assertThat(ok).isEqualTo(5);
    }

    @Test
    @DisplayName("Botones: negocio Pyme usa su WhatsApp; Emprendedor usa el de HotClick; sin ninguno se omite")
    void accionesWhatsapp() {
        Empresa e = new Empresa();
        e.setId(7L);
        e.setSlug("casa-luna");
        e.setNumeroWhatsapp("8888-1234");
        when(empresas.findById(7L)).thenReturn(Optional.of(e));

        planDe(7, "PYME");
        var pyme = cuota(0, 1, 1, 1, 1, 1, "7000-0000").reservar(7L, false, null);
        assertThat(pyme.acciones()).extracting(AccionChat::url)
            .containsExactly("/tienda/casa-luna", "https://wa.me/50688881234");

        planDe(7, "EMPRENDEDOR");
        var emp = cuota(0, 1, 1, 1, 1, 1, "7000-0000").reservar(7L, false, null);
        assertThat(emp.acciones()).extracting(AccionChat::url)
            .containsExactly("/tienda/casa-luna", "https://wa.me/50670000000");

        planDe(7, null);
        var sinNada = cuota(0, 1, 1, 1, 1, 1, "").reservar(7L, false, null);
        assertThat(sinNada.acciones()).extracting(AccionChat::tipo).containsExactly(AccionChat.BUSCAR);

        var mkt = cuota(0, 1, 1, 1, 1, 1, "7000-0000").reservar(null, true, null);
        assertThat(mkt.acciones()).extracting(AccionChat::url)
            .containsExactly("/productos", "https://wa.me/50670000000");
    }
}
