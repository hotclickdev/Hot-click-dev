package com.hotclick.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlywayRepairConfigTest {

    @Test
    void extraerHost_jdbcPostgresLocal() {
        assertEquals("localhost",
            FlywayRepairConfig.extraerHost("jdbc:postgresql://localhost:5432/hotclick_dev"));
        assertEquals("127.0.0.1",
            FlywayRepairConfig.extraerHost("jdbc:postgresql://127.0.0.1:5432/hotclick_dev"));
        assertEquals("postgres",
            FlywayRepairConfig.extraerHost("jdbc:postgresql://postgres:5432/hotclick"));
    }

    @Test
    void extraerHost_supabaseORds() {
        assertEquals("db.abcdefgh.supabase.co",
            FlywayRepairConfig.extraerHost(
                "jdbc:postgresql://db.abcdefgh.supabase.co:5432/postgres?sslmode=require"));
        assertEquals("hotclick-db.xxxxx.us-east-2.rds.amazonaws.com",
            FlywayRepairConfig.extraerHost(
                "jdbc:postgresql://hotclick-db.xxxxx.us-east-2.rds.amazonaws.com:5432/postgres"));
    }

    @Test
    void extraerHost_invalido() {
        assertNull(FlywayRepairConfig.extraerHost(null));
        assertNull(FlywayRepairConfig.extraerHost(""));
        assertNull(FlywayRepairConfig.extraerHost("not-a-jdbc-url"));
    }

    @Test
    void assertDevHostIsLocal_sinPerfilDev_noHaceNada() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("default");
        env.setProperty("spring.datasource.url",
            "jdbc:postgresql://db.prod.supabase.co:5432/postgres");
        FlywayRepairConfig config = new FlywayRepairConfig(env);
        assertDoesNotThrow(config::assertDevHostIsLocal);
    }

    @Test
    void assertDevHostIsLocal_perfilDevYHostLocal_ok() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        env.setProperty("spring.datasource.url",
            "jdbc:postgresql://localhost:5432/hotclick_dev");
        FlywayRepairConfig config = new FlywayRepairConfig(env);
        assertDoesNotThrow(config::assertDevHostIsLocal);
    }

    @Test
    void assertDevHostIsLocal_perfilDevYHostRemoto_aborta() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        env.setProperty("spring.datasource.url",
            "jdbc:postgresql://db.abcdefgh.supabase.co:5432/postgres?sslmode=require");
        FlywayRepairConfig config = new FlywayRepairConfig(env);
        IllegalStateException ex = assertThrows(IllegalStateException.class, config::assertDevHostIsLocal);
        assertTrue(ex.getMessage().contains("Abortando"));
        assertTrue(ex.getMessage().contains("db.abcdefgh.supabase.co"));
    }

    @Test
    void ultimaVersionMigracion_comparaComoEntero() {
        assertEquals(140, FlywayRepairConfig.ultimaVersionMigracion(List.of(
            "V13__solicitud_garantia.sql",
            "V136__comision_tilopay_empresa.sql",
            "V140__correo_verificado_usuario.sql"
        )));
    }

    @Test
    void ultimaVersionMigracion_ignoraNombresQueNoSonMigracion() {
        assertEquals(137, FlywayRepairConfig.ultimaVersionMigracion(List.of(
            "README.md",
            "db/migration/V137__refresh_token_sha256.sql",
            "nativas.sql"
        )));
    }

    @Test
    void ultimaVersionMigracion_sinMigraciones_falla() {
        IllegalStateException ex = assertThrows(
            IllegalStateException.class,
            () -> FlywayRepairConfig.ultimaVersionMigracion(List.of("nativas.sql", "README.md"))
        );
        assertTrue(ex.getMessage().contains("No hay migraciones"));
    }

    @Test
    void versionDesdeNombre_rutaYBasename() {
        assertEquals(140, FlywayRepairConfig.versionDesdeNombre("V140__correo_verificado_usuario.sql"));
        assertEquals(13, FlywayRepairConfig.versionDesdeNombre("db/migration/V13__solicitud_garantia.sql"));
        assertNull(FlywayRepairConfig.versionDesdeNombre("nativas.sql"));
        assertNull(FlywayRepairConfig.versionDesdeNombre(null));
    }

    @Test
    void abortarProdVacio_mensajeClaro() {
        IllegalStateException ex = org.junit.jupiter.api.Assertions.assertThrows(
            IllegalStateException.class, FlywayRepairConfig::abortarProdVacio);
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("base VACÍA"));
    }

    // ── Bootstrap dev en base vacía: catálogo de tipos de OTP ─────────────────

    private static org.springframework.jdbc.datasource.DriverManagerDataSource baseVaciaH2(String nombre) {
        return new org.springframework.jdbc.datasource.DriverManagerDataSource(
            "jdbc:h2:mem:" + nombre + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
    }

    private static List<String> tiposOtp(javax.sql.DataSource ds) throws Exception {
        try (var c = ds.getConnection();
             var s = c.createStatement();
             var rs = s.executeQuery("SELECT nombre FROM hot_click_tipo_otp_tb ORDER BY nombre")) {
            var out = new java.util.ArrayList<String>();
            while (rs.next()) {
                out.add(rs.getString(1));
            }
            return out;
        }
    }

    @Test
    void bootstrapDev_baseVacia_siembraTiposOtp_incluidoRegistro() throws Exception {
        var ds = baseVaciaH2("nativas_otp_vacia");
        // Base realmente vacía: la tabla no existe antes del bootstrap.
        assertThrows(Exception.class, () -> tiposOtp(ds));

        FlywayRepairConfig.ejecutarSqlClasspath(ds, "db/dev-bootstrap/nativas.sql");

        List<String> tipos = tiposOtp(ds);
        assertTrue(tipos.contains("REGISTRO"), "falta REGISTRO: " + tipos);
        assertEquals(List.of("2FA_LOGIN", "REGISTRO", "RESET_DATOS", "RESET_PASSWORD"), tipos);
    }

    @Test
    void bootstrapDev_idempotente_noDuplicaTiposOtp() throws Exception {
        var ds = baseVaciaH2("nativas_otp_idem");
        FlywayRepairConfig.ejecutarSqlClasspath(ds, "db/dev-bootstrap/nativas.sql");
        FlywayRepairConfig.ejecutarSqlClasspath(ds, "db/dev-bootstrap/nativas.sql");
        assertEquals(4, tiposOtp(ds).size());
    }

    @Test
    void bootstrapDev_tipoRegistro_tieneValoresDeV1() throws Exception {
        var ds = baseVaciaH2("nativas_otp_valores");
        FlywayRepairConfig.ejecutarSqlClasspath(ds, "db/dev-bootstrap/nativas.sql");
        try (var c = ds.getConnection();
             var s = c.createStatement();
             var rs = s.executeQuery(
                 "SELECT tiempo_expiracion_seg, longitud_codigo, fk_id_estado "
                     + "FROM hot_click_tipo_otp_tb WHERE nombre = 'REGISTRO'")) {
            assertTrue(rs.next());
            assertEquals(300, rs.getInt(1));
            assertEquals(6, rs.getInt(2));
            assertEquals(1, rs.getInt(3));
        }
    }

    // ── Bootstrap dev en base vacía: cupo Emprendedor (V127) ──────────────────

    private static int[] cupo(javax.sql.DataSource ds) throws Exception {
        try (var c = ds.getConnection();
             var s = c.createStatement();
             var rs = s.executeQuery("SELECT usados, limite FROM hot_click_cupo_emprendedor_tb WHERE id = 1")) {
            assertTrue(rs.next(), "falta la fila id=1 del cupo");
            return new int[] {rs.getInt(1), rs.getInt(2)};
        }
    }

    @Test
    void bootstrapDev_baseVacia_creaCupoEmprendedor_conFilaUnica() throws Exception {
        var ds = baseVaciaH2("nativas_cupo_vacia");
        assertThrows(Exception.class, () -> cupo(ds));

        FlywayRepairConfig.ejecutarSqlClasspath(ds, "db/dev-bootstrap/nativas.sql");

        assertEquals(0, cupo(ds)[0]);
        assertEquals(70, cupo(ds)[1]);
    }

    @Test
    void bootstrapDev_idempotente_noPisaUsadosDelCupo() throws Exception {
        var ds = baseVaciaH2("nativas_cupo_idem");
        FlywayRepairConfig.ejecutarSqlClasspath(ds, "db/dev-bootstrap/nativas.sql");
        try (var c = ds.getConnection(); var s = c.createStatement()) {
            s.executeUpdate("UPDATE hot_click_cupo_emprendedor_tb SET usados = 5 WHERE id = 1");
        }
        FlywayRepairConfig.ejecutarSqlClasspath(ds, "db/dev-bootstrap/nativas.sql");
        assertEquals(5, cupo(ds)[0]);
    }
}
