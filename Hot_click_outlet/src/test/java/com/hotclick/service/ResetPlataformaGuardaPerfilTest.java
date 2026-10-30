package com.hotclick.service;

import com.hotclick.controller.AdminResetController;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.security.CompanyScope;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Constructor;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * [ALTO] NO APTO #441: el vaciado global de la plataforma solo corre con perfiles dev/test/local
 * (todos) y hotclick.reset-plataforma.enabled=true. En cualquier otro caso: 0 SQL y el endpoint da 404.
 */
@DisplayName("[Seguridad] Reset plataforma: solo dev/test/local con flag; si no, 0 SQL y 404")
class ResetPlataformaGuardaPerfilTest {

    /** Registra cada sentencia; no simula errores. */
    static final class JdbcQueAnota extends JdbcTemplate {
        final List<String> sentencias = new ArrayList<>();

        @Override public void execute(String sql) { sentencias.add(sql); }
        @Override public int update(String sql, Object... args) { sentencias.add(sql); return 1; }
        @Override public <T> List<T> query(String sql, RowMapper<T> rm, Object... args) { sentencias.add(sql); return List.of(); }
        @Override public <T> T queryForObject(String sql, Class<T> type) { sentencias.add(sql); return type.cast(0L); }
        @Override public <T> T execute(ConnectionCallback<T> action) {
            try {
                Connection con = mock(Connection.class);
                when(con.getAutoCommit()).thenReturn(true);
                return action.doInConnection(con);
            } catch (SQLException e) {
                throw new IllegalStateException(e);
            }
        }
    }

    /** Construye el servicio con o sin Environment (el código previo al guard solo recibía el JdbcTemplate). */
    static ResetPlataformaKeepQaService servicio(JdbcTemplate jdbc, Environment env) throws Exception {
        for (Constructor<?> c : ResetPlataformaKeepQaService.class.getConstructors()) {
            if (c.getParameterCount() == 2) return (ResetPlataformaKeepQaService) c.newInstance(jdbc, env);
        }
        return ResetPlataformaKeepQaService.class.getConstructor(JdbcTemplate.class).newInstance(jdbc);
    }

    static MockEnvironment env(String flag, String... perfiles) {
        MockEnvironment env = new MockEnvironment();
        if (flag != null) env.setProperty("hotclick.reset-plataforma.enabled", flag);
        env.setActiveProfiles(perfiles);
        return env;
    }

    static Stream<Arguments> bloqueados() {
        return Stream.of(
            Arguments.of("prod con flag", env("true", "prod")),
            Arguments.of("production con flag", env("true", "production")),
            Arguments.of("staging con flag", env("true", "staging")),
            Arguments.of("dev+prod con flag", env("true", "dev", "prod")),
            Arguments.of("sin perfiles activos con flag", env("true")),
            Arguments.of("dev sin flag", env(null, "dev")),
            Arguments.of("dev con flag=false", env("false", "dev")),
            Arguments.of("perfil desconocido con flag", env("true", "qa")));
    }

    private static AdminResetController controlador(ResetPlataformaKeepQaService service, boolean adminSinEmpresa) {
        AdminResetController c = new AdminResetController();
        CompanyScope scope = mock(CompanyScope.class);
        Usuario admin = mock(Usuario.class);
        when(admin.getContrasenaHash()).thenReturn("hash");
        when(scope.getCurrentUser()).thenReturn(admin);
        when(scope.getCurrentEmpresaId()).thenReturn(null);
        when(scope.isAdminIT()).thenReturn(adminSinEmpresa);
        PasswordEncoder enc = mock(PasswordEncoder.class);
        when(enc.matches(anyString(), any())).thenReturn(true);
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "passwordEncoder", enc);
        ReflectionTestUtils.setField(c, "resetPlataformaKeepQaService", service);
        ReflectionTestUtils.setField(c, "jdbc", mock(JdbcTemplate.class));
        return c;
    }

    private static final Map<String, String> BODY = Map.of(
        "password", "x", "confirmacion", ResetPlataformaKeepQaService.CONFIRMACION);

    @ParameterizedTest(name = "{0}")
    @MethodSource("bloqueados")
    @DisplayName("Servicio: ejecutar() y ejecutarSiPendiente() lanzan sin correr ningún SQL")
    void servicioBloqueado(String caso, MockEnvironment env) throws Exception {
        JdbcQueAnota jdbc = new JdbcQueAnota();
        ResetPlataformaKeepQaService s = servicio(jdbc, env);
        assertThatThrownBy(s::ejecutar).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(s::ejecutarSiPendiente).isInstanceOf(RuntimeException.class);
        assertThat(jdbc.sentencias).as(caso).isEmpty();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("bloqueados")
    @DisplayName("Endpoints: /reset-plataforma-qa y la rama global de /reset-datos dan 404 sin tocar la BD")
    void endpointsBloqueados(String caso, MockEnvironment env) throws Exception {
        JdbcQueAnota jdbc = new JdbcQueAnota();
        ResetPlataformaKeepQaService s = servicio(jdbc, env);
        int qa;
        int datos;
        try {
            qa = controlador(s, true).resetearPlataformaQa(BODY).getStatusCode().value();
        } catch (RuntimeException e) {
            qa = -1;
        }
        try {
            datos = controlador(s, true).resetearDatos(Map.of("password", "x")).getStatusCode().value();
        } catch (RuntimeException e) {
            datos = -1;
        }
        assertThat(qa).as(caso + " reset-plataforma-qa").isEqualTo(404);
        assertThat(datos).as(caso + " reset-datos global").isEqualTo(404);
        assertThat(jdbc.sentencias).as(caso).isEmpty();
    }

    @Test
    @DisplayName("dev (y test/local) con flag=true: sigue funcionando por servicio y por endpoint")
    void devConFlagFunciona() throws Exception {
        for (String[] perfiles : List.of(new String[] {"dev"}, new String[] {"test"}, new String[] {"dev", "local"})) {
            JdbcQueAnota jdbc = new JdbcQueAnota();
            ResetPlataformaKeepQaService s = servicio(jdbc, env("true", perfiles));
            assertThat(s.ejecutar()).containsKey("productos");
            assertThat(jdbc.sentencias).anyMatch(q -> q.startsWith("DELETE FROM hot_click_producto_tb"));
            ResponseEntity<ResponseDTO> r = controlador(s, true).resetearPlataformaQa(BODY);
            assertThat(r.getStatusCode().value()).isEqualTo(200);
            assertThat(controlador(s, true).resetearDatos(Map.of("password", "x")).getStatusCode().value()).isEqualTo(200);
        }
    }
}
