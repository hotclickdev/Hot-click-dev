package com.hotclick.service.shoppingassistant;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.ClientIpResolver;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Cupo del asistente: topes por IP, subred y subred × negocio, y alerta del tope global")
class AsistenteCuotaDiariaRedTest {

    private final JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
        "jdbc:h2:mem:cupored" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
    private final EmpresaRepository empresas = mock(EmpresaRepository.class);
    private final ClientIpResolver ips = mock(ClientIpResolver.class);
    private final Clock reloj = Clock.fixed(Instant.parse("2026-10-26T18:00:00Z"), ZoneId.of("America/Costa_Rica"));
    private String ip = "203.0.113.9";

    @BeforeEach
    void setUp() {
        jdbc.execute("CREATE TABLE hot_click_asistente_cuota_dia_tb (clave VARCHAR(120) NOT NULL, dia DATE NOT NULL, "
            + "usos INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (clave, dia))");
        when(ips.resolve(any())).thenAnswer(inv -> ip);
        when(empresas.findNombrePlanEfectivo(any())).thenReturn(Optional.empty());
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(new MockHttpServletRequest()));
    }

    @AfterEach
    void limpiar() {
        RequestContextHolder.resetRequestAttributes();
    }

    private AsistenteCuotaDiaria cuota(int cliente, int negocio, int global, AsistenteCuotaDiaria.TopesRed red) {
        return new AsistenteCuotaDiaria(jdbc, empresas, ips, reloj, cliente, negocio, negocio, negocio, negocio, global,
            new AsistenteLimiteMensaje(empresas, "", "límite cliente", "límite agotado"), red);
    }

    private static String visitor(int i) {
        return new UUID(0xBEEFL, i).toString();
    }

    private int usos(String clave) {
        List<Integer> r = jdbc.queryForList("SELECT usos FROM hot_click_asistente_cuota_dia_tb WHERE clave = ?", Integer.class, clave);
        return r.isEmpty() ? 0 : r.get(0);
    }

    @Test
    @DisplayName("Rotar visitorId desde la misma IP no pasa del tope por IP (ítem 3)")
    void rotarVisitorIdChocaConTopeIp() {
        AsistenteCuotaDiaria c = cuota(20, 1000, 3000, new AsistenteCuotaDiaria.TopesRed(30, 0, 0, true));
        int permitidas = 0;
        for (int i = 0; i < 100; i++) if (c.reservar(7L, false, visitor(i)).permitida()) permitidas++;
        assertThat(permitidas).isEqualTo(30);
        var r = c.reservar(7L, false, visitor(999));
        assertThat(r.permitida()).isFalse();
        assertThat(r.motivo()).isEqualTo(AsistenteCuotaDiaria.Motivo.CLIENTE);
        // Los rechazos devuelven lo tomado: el negocio solo cuenta las 30 permitidas.
        assertThat(usos("n:7")).isEqualTo(30);
        assertThat(usos("r:203.0.113.9")).isEqualTo(30);
    }

    @Test
    @DisplayName("Rotar IPs dentro de la misma /24 choca con el tope de subred")
    void rotarIpsMismaSubred() {
        AsistenteCuotaDiaria c = cuota(20, 1000, 3000, new AsistenteCuotaDiaria.TopesRed(30, 50, 0, true));
        int permitidas = 0;
        for (int i = 1; i <= 100; i++) {
            ip = "198.51.100." + i;
            if (c.reservar(null, true, visitor(i)).permitida()) permitidas++;
        }
        assertThat(permitidas).isEqualTo(50);
        assertThat(usos("s:198.51.100.0/24")).isEqualTo(50);
        assertThat(usos("g")).isEqualTo(50);
    }

    @Test
    @DisplayName("Un tercero no vacía el cupo de un negocio por su slug: tope subred × negocio; otro negocio sigue")
    void subredNoAgotaUnNegocio() {
        AsistenteCuotaDiaria c = cuota(20, 100, 3000, new AsistenteCuotaDiaria.TopesRed(0, 0, 40, true));
        int permitidas = 0;
        for (int i = 1; i <= 100; i++) {
            ip = "192.0.2." + i;
            if (c.reservar(7L, false, visitor(i)).permitida()) permitidas++;
        }
        assertThat(permitidas).isEqualTo(40);
        assertThat(usos("n:7")).isEqualTo(40);
        // Clientes de otra red siguen teniendo cupo en ese negocio.
        ip = "203.0.113.50";
        assertThat(c.reservar(7L, false, visitor(500)).permitida()).isTrue();
        // Y la misma red puede seguir usando otro negocio.
        ip = "192.0.2.77";
        assertThat(c.reservar(8L, false, visitor(501)).permitida()).isTrue();
    }

    @Test
    @DisplayName("IPv6: rotar dentro del mismo /64 cuenta como la misma IP")
    void ipv6MismoSlash64() {
        AsistenteCuotaDiaria c = cuota(20, 1000, 3000, new AsistenteCuotaDiaria.TopesRed(5, 0, 0, true));
        int permitidas = 0;
        for (int i = 1; i <= 10; i++) {
            ip = "2001:db8:1:2::" + Integer.toHexString(i);
            if (c.reservar(null, true, visitor(i)).permitida()) permitidas++;
        }
        assertThat(permitidas).isEqualTo(5);
        assertThat(AsistenteCuotaDiaria.redes("2001:db8:1:2::9")).containsExactly("2001:db8:1:2::/64", "2001:db8:1::/48");
        assertThat(AsistenteCuotaDiaria.redes("10.1.2.3")).containsExactly("10.1.2.3", "10.1.2.0/24");
        assertThat(AsistenteCuotaDiaria.redes("no-es-ip")).isNull();
        assertThat(AsistenteCuotaDiaria.redes("999.1.1.1")).isNull();
    }

    @Test
    @DisplayName("Sin IP conocida (fuera de un pedido HTTP) no se aplican topes de red")
    void sinIpNoAplicaRed() {
        RequestContextHolder.resetRequestAttributes();
        AsistenteCuotaDiaria c = cuota(20, 1000, 3000, new AsistenteCuotaDiaria.TopesRed(2, 2, 2, true));
        for (int i = 0; i < 5; i++) assertThat(c.reservar(7L, false, visitor(i)).permitida()).isTrue();
    }

    @Test
    @DisplayName("Al llegar al tope global se registra la alerta (una por día) y se niega con motivo GLOBAL")
    void alertaTopeGlobal() {
        AsistenteCuotaDiaria c = cuota(20, 1000, 3, new AsistenteCuotaDiaria.TopesRed(0, 0, 0, true));
        for (int i = 0; i < 3; i++) assertThat(c.reservar(null, true, visitor(i)).permitida()).isTrue();
        assertThat(c.alertaGlobalEnviadaHoy()).isFalse();
        var r = c.reservar(null, true, visitor(10));
        assertThat(r.permitida()).isFalse();
        assertThat(r.motivo()).isEqualTo(AsistenteCuotaDiaria.Motivo.GLOBAL);
        assertThat(c.alertaGlobalEnviadaHoy()).isTrue();
        assertThat(usos("n:marketplace")).isEqualTo(3);
    }
}
