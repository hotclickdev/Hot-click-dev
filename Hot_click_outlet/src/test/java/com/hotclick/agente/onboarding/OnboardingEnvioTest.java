package com.hotclick.agente.onboarding;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.pago.AvisoUnicoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA;
import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static com.hotclick.agente.pago.PagoBotTestSupport.sesion;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@DisplayName("AG-40 / AG-34: envío de un paso y guarda de un solo aviso (H2 en modo PostgreSQL)")
class OnboardingEnvioTest {

    private JdbcTemplate jdbc;
    private AvisoUnicoRepository avisos;
    private CanalMensajeria canal;
    private ConversacionService conversaciones;
    private OnboardingEnvio envio;
    private final ConversacionSesion conversacion = sesion(UUID.fromString("00000000-0000-0000-0000-0000000000c1"), AHORA);
    private final CanalCuenta cuenta = cuenta(EstadoCanal.ACTIVA);

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
            "jdbc:h2:mem:aviso" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
        jdbc.execute("CREATE TABLE hot_click_agente_aviso_unico_tb (tipo VARCHAR(30) NOT NULL, "
            + "referencia_id BIGINT NOT NULL, creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "
            + "PRIMARY KEY (tipo, referencia_id))");
        avisos = new AvisoUnicoRepository(jdbc);
        canal = mock(CanalMensajeria.class);
        conversaciones = mock(ConversacionService.class);
        envio = new OnboardingEnvio(canal, conversaciones, avisos, "https://hotclick.example/");
    }

    @Test
    @DisplayName("la guarda deja pasar solo al primero y se puede liberar")
    void guardaDeUnSoloAviso() {
        assertThat(avisos.reclamar("COMPROBANTE", 1L)).isTrue();
        assertThat(avisos.reclamar("COMPROBANTE", 1L)).isFalse();
        assertThat(avisos.reclamar("ONB_1", 1L)).isTrue(); // otro tipo, misma referencia
        avisos.liberar("COMPROBANTE", 1L);
        assertThat(avisos.reclamar("COMPROBANTE", 1L)).isTrue();
    }

    @Test
    @DisplayName("enviados() devuelve por lote cuándo salió cada aviso del tipo pedido")
    void enviadosPorLote() {
        avisos.reclamar("ONB_1", 10L);
        avisos.reclamar("ONB_1", 11L);
        avisos.reclamar("ONB_2", 10L);

        Map<Long, Instant> r = avisos.enviados("ONB_1", List.of(10L, 11L, 12L));

        assertThat(r).containsOnlyKeys(10L, 11L);
        assertThat(avisos.enviados("ONB_1", List.of())).isEmpty();
    }

    @Test
    @DisplayName("el paso sale con botón al panel (URL del propio HotClick) y queda en el historial; repetirlo no duplica")
    void enviaUnaVez() {
        assertThat(envio.enviar(5L, OnboardingPaso.PERFIL, conversacion, cuenta)).isTrue();
        assertThat(envio.enviar(5L, OnboardingPaso.PERFIL, conversacion, cuenta)).isFalse();

        verify(canal, times(1)).enviarBotonUrl(eq(cuenta), anyString(), eq(OnboardingPaso.PERFIL.texto()),
            eq("Completar perfil"), eq("https://hotclick.example/emprendedor/opciones/perfil"));
        verify(conversaciones, times(1)).registrarSalienteBot(any(), any(), eq(OnboardingPaso.PERFIL.texto()));
    }

    @Test
    @DisplayName("si Meta falla se libera el paso para el siguiente barrido")
    void falloLiberaElPaso() {
        doThrow(new IllegalStateException("caído")).when(canal).enviarBotonUrl(any(), anyString(), anyString(), anyString(), anyString());

        assertThat(envio.enviar(5L, OnboardingPaso.PRIMER_PRODUCTO, conversacion, cuenta)).isFalse();

        assertThat(avisos.enviados("ONB_2", List.of(5L))).isEmpty();
        verify(conversaciones, never()).registrarSalienteBot(any(), any(), anyString());
    }
}
