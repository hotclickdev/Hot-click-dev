package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;

import java.time.Clock;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Puerta de la excepción QA PYME TEST: off, prod, ambiguo y sin bypass por correo")
class QaAltaPymeTestPuertaTest {

    private static final String FICTICIA = "onvo_test_ficticia";
    private static final String PUBLICA = "pk_test_ficticia";
    private static final Clock RELOJ = Clock.fixed(Instant.parse("2026-11-08T18:00:00Z"), Constants.ZONA_CR);

    @ParameterizedTest
    @ValueSource(strings = {"dev", "test", "DEV", "Test"})
    @DisplayName("Solo dev o test, uno o los dos, es un perfil local")
    void perfilLocal(String perfil) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfil);
        assertThat(QaAltaPymeTestService.perfilLocalNoAmbiguo(env)).isTrue();
        MockEnvironment ambos = new MockEnvironment();
        ambos.setActiveProfiles("dev", "test");
        assertThat(QaAltaPymeTestService.perfilLocalNoAmbiguo(ambos)).isTrue();
    }

    @ParameterizedTest
    @CsvSource({"prod", "production", "PROD", "staging", "qa", "default"})
    @DisplayName("Prod, staging y cualquier otro perfil se rechazan, también mezclados con dev")
    void perfilRechazado(String perfil) {
        MockEnvironment solo = new MockEnvironment();
        solo.setActiveProfiles(perfil);
        assertThat(QaAltaPymeTestService.perfilLocalNoAmbiguo(solo)).isFalse();
        MockEnvironment mezcla = new MockEnvironment();
        mezcla.setActiveProfiles("dev", perfil);
        assertThat(QaAltaPymeTestService.perfilLocalNoAmbiguo(mezcla)).isFalse();
    }

    @Test
    @DisplayName("Sin entorno o sin perfil activo es ambiguo")
    void sinPerfil() {
        assertThat(QaAltaPymeTestService.perfilLocalNoAmbiguo(null)).isFalse();
        assertThat(QaAltaPymeTestService.perfilLocalNoAmbiguo(new MockEnvironment())).isFalse();
    }

    @Test
    @DisplayName("ONVO TEST exige secret onvo_test_ con cuerpo y publishable de prueba")
    void onvoTestClaro() {
        assertThat(QaAltaPymeTestService.onvoTestSinAmbiguedad(FICTICIA, PUBLICA)).isTrue();
        assertThat(QaAltaPymeTestService.onvoTestSinAmbiguedad(FICTICIA, "onvo_test_publica_ficticia")).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"onvo_test_", "onvo_live_ficticia", "onvo_test_ficticia_onvo_live_x", "sk_test_otra", " "})
    @DisplayName("Secret vacío, live, mezclado o de otro prefijo no es TEST")
    void secretNoTest(String secret) {
        assertThat(QaAltaPymeTestService.onvoTestSinAmbiguedad(secret, PUBLICA)).isFalse();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"pk_live_ficticia", "onvo_live_publica", "clave-publica"})
    @DisplayName("Publishable vacía, live o ambigua no es TEST")
    void publishableNoTest(String publishable) {
        assertThat(QaAltaPymeTestService.onvoTestSinAmbiguedad(FICTICIA, publishable)).isFalse();
    }

    @Test
    @DisplayName("El correo del fixture se reconoce solo exacto, sin alias")
    void correoExacto() {
        QaAltaPymeTestService s = servicio(true, env("dev"), FICTICIA, PUBLICA, mock(JdbcTemplate.class));
        assertThat(s.esCorreoDelFixture("  QA.SIM.ALTA20261108@HotClick.Test ")).isTrue();
        assertThat(s.esCorreoDelFixture("qa.sim.alta20261108+otro@hotclick.test")).isFalse();
        assertThat(s.esCorreoDelFixture("qa.pyme.demo@hotclick.test")).isFalse();
        assertThat(s.esCorreoDelFixture("otra@tienda.test")).isFalse();
        assertThat(s.esCorreoDelFixture(null)).isFalse();
    }

    @Test
    @DisplayName("Flag apagado no escribe, aunque el perfil y ONVO sean TEST")
    void flagApagadoNoEscribe() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        QaAltaPymeTestService s = servicio(false, env("dev"), FICTICIA, PUBLICA, jdbc);
        assertThat(s.consumirSiAplica(QaAltaPymeTestService.CORREO_FIXTURE)).isFalse();
        verify(jdbc, never()).update(anyString(), any(), any(), any());
    }

    @Test
    @DisplayName("Prod con flag y llave de prueba no escribe")
    void prodNoEscribe() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        QaAltaPymeTestService s = servicio(true, env("prod"), FICTICIA, PUBLICA, jdbc);
        assertThat(s.consumirSiAplica(QaAltaPymeTestService.CORREO_FIXTURE)).isFalse();
        verify(jdbc, never()).update(anyString(), any(), any(), any());
    }

    @Test
    @DisplayName("Otro correo no consulta la fila")
    void otraTiendaNoTocaLaFila() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        QaAltaPymeTestService s = servicio(true, env("test"), FICTICIA, PUBLICA, jdbc);
        assertThat(s.consumirSiAplica("qa.pyme.demo@hotclick.test")).isFalse();
        verify(jdbc, never()).update(anyString(), any(), any(), any());
    }

    @Test
    @DisplayName("Si la tabla no responde, el error sale y no se sigue el alta")
    void tablaCaidaNoSeTraga() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(anyString(), any(), eq(QaAltaPymeTestService.CORREO_FIXTURE), any()))
            .thenThrow(new DataAccessResourceFailureException("detalle interno con " + QaAltaPymeTestService.CORREO_FIXTURE));
        QaAltaPymeTestService s = servicio(true, env("test"), FICTICIA, PUBLICA, jdbc);
        assertThatThrownBy(() -> s.consumirSiAplica(QaAltaPymeTestService.CORREO_FIXTURE))
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("No se pudo aplicar la excepción QA")
            .hasMessageNotContaining(QaAltaPymeTestService.CORREO_FIXTURE);
    }

    @Test
    @DisplayName("Leer la concesión por id con la tabla caída no sigue a ciegas")
    void lecturaCaidaNoSigue() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(8L)))
            .thenThrow(new DataAccessResourceFailureException("bd"));
        QaAltaPymeTestService s = servicio(true, env("test"), FICTICIA, PUBLICA, jdbc);
        Empresa e = new Empresa();
        e.setId(8L);
        e.setCorreoEmpresa(QaAltaPymeTestService.CORREO_FIXTURE);
        assertThatThrownBy(() -> s.empresaConCobroPymeTest(e))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageNotContaining(QaAltaPymeTestService.CORREO_FIXTURE);
    }

    @Test
    @DisplayName("Puerta cerrada no lee la fila: flag off o prod no heredan el cobro")
    void puertaCerradaNoLee() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Empresa e = new Empresa();
        e.setId(8L);
        e.setCorreoEmpresa(QaAltaPymeTestService.CORREO_FIXTURE);
        assertThat(servicio(false, env("dev"), FICTICIA, PUBLICA, jdbc).empresaConCobroPymeTest(e)).isFalse();
        assertThat(servicio(true, env("prod"), FICTICIA, PUBLICA, jdbc).empresaConCobroPymeTest(e)).isFalse();
        assertThat(servicio(true, env("staging"), FICTICIA, PUBLICA, jdbc).empresaConCobroPymeTest(e)).isFalse();
        verify(jdbc, never()).queryForObject(anyString(), eq(Integer.class), any());
    }

    @Test
    @DisplayName("Un negocio que no es el fixture no lee la concesión")
    void otraEmpresaNoLee() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        QaAltaPymeTestService s = servicio(true, env("dev"), FICTICIA, PUBLICA, jdbc);
        Empresa e = new Empresa();
        e.setCorreoEmpresa("qa.pyme.demo@hotclick.test");
        assertThat(s.empresaConCobroPymeTest(e)).isFalse();
        verify(jdbc, never()).queryForObject(anyString(), eq(Integer.class), any());
    }

    private static QaAltaPymeTestService servicio(boolean flag, MockEnvironment env, String secret, String publica,
                                                  JdbcTemplate jdbc) {
        return new QaAltaPymeTestService(jdbc, env, flag, secret, publica, RELOJ);
    }

    private static MockEnvironment env(String... perfiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfiles);
        return env;
    }
}
