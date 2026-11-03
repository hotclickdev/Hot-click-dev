package com.hotclick.config;

import com.hotclick.HotclickApplication;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.OtpService;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

/**
 * HC-CICD-002: en una base creada con Flyway desde V1 (camino base-vacia) forgot-password daba
 * "tipo de OTP no configurado: RESET_PASSWORD" y no mandaba correo, porque V1 sembró REGISTRO y
 * RESET_PASSWORD solo en la tabla vieja "HOT_CLICK_TIPO_OTP_TB". V222 los siembra en la tabla JPA.
 * Contexto Spring real sobre Postgres vacío (Testcontainers pgvector:pg17) con el mailer mockeado.
 * En CI (CI=true) exige Docker. Local sin Docker: se salta, salvo -Dhotclick.it.pg.url=...
 */
class FlywayBaseVaciaOtpPostgresTest {

    private static final String CORREO = "qa-otp@hotclick.lat";

    @Test
    void forgotPassword_y_registro_resuelven_el_tipo_OTP_y_mandan_correo() throws Exception {
        String adminUrl;
        String user;
        String pass;
        PostgreSQLContainer<?> pg = null;
        String externo = System.getProperty("hotclick.it.pg.url");
        if (externo != null && !externo.isBlank()) {
            adminUrl = externo;
            user = System.getProperty("hotclick.it.pg.user", "postgres");
            pass = System.getProperty("hotclick.it.pg.password", "");
        } else {
            boolean docker = DockerClientFactory.instance().isDockerAvailable();
            if (!docker && "true".equalsIgnoreCase(System.getenv("CI"))) {
                throw new IllegalStateException("CI sin Docker: FlywayBaseVaciaOtpPostgresTest no puede correr");
            }
            assumeTrue(docker, "Docker no disponible: OTP sobre base vacía no corrido");
            pg = new PostgreSQLContainer<>(DockerImageName.parse("pgvector/pgvector:pg17")
                .asCompatibleSubstituteFor("postgres"));
            pg.start();
            adminUrl = pg.getJdbcUrl();
            user = pg.getUsername();
            pass = pg.getPassword();
        }
        try {
            String nombre = "hc_otp_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            new JdbcTemplate(new DriverManagerDataSource(adminUrl, user, pass)).execute("CREATE DATABASE " + nombre);
            String url = adminUrl.replaceFirst("/[^/?]+(\\?|$)", "/" + nombre + "$1");
            new JdbcTemplate(new DriverManagerDataSource(url, user, pass)).execute("CREATE EXTENSION IF NOT EXISTS vector");

            Map<String, Object> props = new HashMap<>();
            props.put("spring.datasource.url", url);
            props.put("spring.datasource.username", user);
            props.put("spring.datasource.password", pass);
            props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
            props.put("spring.flyway.enabled", "true");
            props.put(FlywayRepairConfig.PROP_BASE_VACIA, "true");
            props.put("spring.jpa.hibernate.ddl-auto", "validate");
            props.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
            props.put("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
            props.put("spring.jpa.defer-datasource-initialization", "false");
            props.put("spring.sql.init.mode", "never");

            ResendEmailService mailer = Mockito.mock(ResendEmailService.class);
            try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(HotclickApplication.class)
                    .profiles("test")
                    .web(WebApplicationType.NONE)
                    // Mailer mockeado como @Primary (registrado aquí, fuera del component scan).
                    .initializers(c -> ((GenericApplicationContext) c).registerBean("mailerMockOtp",
                        ResendEmailService.class, () -> mailer, bd -> bd.setPrimary(true)))
                    .run(props.entrySet().stream().map(e -> "--" + e.getKey() + "=" + e.getValue())
                        .toArray(String[]::new))) {
                JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
                for (String tipo : new String[] {"REGISTRO", "RESET_PASSWORD", "2FA_LOGIN", "RESET_DATOS"}) {
                    assertEquals(1, jdbc.queryForObject(
                        "SELECT COUNT(*) FROM hot_click_tipo_otp_tb WHERE nombre = ?", Integer.class, tipo), tipo);
                }
                assertEquals(300, jdbc.queryForObject(
                    "SELECT tiempo_expiracion_seg FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_PASSWORD'", Integer.class));

                // V222 es no-op si las filas ya existen (caso prod).
                jdbc.execute(Files.readString(Path.of(
                    "src/main/resources/db/migration/V222__tipos_otp_registro_reset_en_tabla_jpa.sql")));
                assertEquals(2, jdbc.queryForObject(
                    "SELECT COUNT(*) FROM hot_click_tipo_otp_tb WHERE nombre IN ('REGISTRO','RESET_PASSWORD')", Integer.class));

                jdbc.update("INSERT INTO hot_click_usuario_tb (identificacion, nombre, apellido_paterno, correo, telefono, "
                    + "contrasena_hash, fk_id_estado, correo_verificado, puntos_fidelidad, limite_credito, saldo_credito, "
                    + "total_compras_hist, num_pedidos_hist, intentos_fallidos, two_factor_enabled, fecha_registro) "
                    + "VALUES ('900000001', 'QA', 'Otp', ?, '80000000', 'x', 1, true, 0, 0, 0, 0, 0, 0, false, now())", CORREO);

                // forgot-password: resuelve RESET_PASSWORD, guarda el OTP y llama al mailer.
                ctx.getBean(PasswordResetService.class).enviarCodigo(CORREO);
                Mockito.verify(mailer, Mockito.times(1)).send(eq(CORREO), anyString(), anyString());
                assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_codigo_otp_tb o "
                    + "JOIN hot_click_tipo_otp_tb t ON t.id_tipo_otp = o.fk_id_tipo_otp WHERE t.nombre = 'RESET_PASSWORD'",
                    Integer.class));

                // OTP de registro (REGISTRO).
                Usuario usuario = ctx.getBean(UsuarioRepository.class).findByCorreo(CORREO).orElseThrow();
                ctx.getBean(OtpService.class).enviarOtp(usuario, Constants.OTP_TIPO_REGISTRO);
                Mockito.verify(mailer, Mockito.times(2)).send(eq(CORREO), anyString(), anyString());
                assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_codigo_otp_tb o "
                    + "JOIN hot_click_tipo_otp_tb t ON t.id_tipo_otp = o.fk_id_tipo_otp WHERE t.nombre = 'REGISTRO' "
                    + "AND o.active_flag", Integer.class));
            }
        } finally {
            if (pg != null) {
                pg.stop();
            }
        }
    }
}
