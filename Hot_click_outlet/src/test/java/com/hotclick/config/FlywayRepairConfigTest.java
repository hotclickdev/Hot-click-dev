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

    @Test
    void versionBootstrap_leeLaVersionDeclarada() {
        org.junit.jupiter.api.Assertions.assertEquals(200,
            FlywayRepairConfig.versionBootstrap("-- x\n-- hotclick.bootstrap.version=200\nCREATE TABLE t();"));
    }

    @Test
    void versionBootstrap_sinMarca_falla() {
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class,
            () -> FlywayRepairConfig.versionBootstrap("CREATE TABLE t();"));
    }

    @Test
    void esquemaBaseVersionado_noSuperaLaUltimaMigracion() throws Exception {
        String sql = new String(new org.springframework.core.io.ClassPathResource(
            FlywayRepairConfig.BOOTSTRAP_SQL).getInputStream().readAllBytes(),
            java.nio.charset.StandardCharsets.UTF_8);
        int declarada = FlywayRepairConfig.versionBootstrap(sql);
        org.springframework.core.io.Resource[] rs =
            new org.springframework.core.io.support.PathMatchingResourcePatternResolver()
                .getResources("classpath*:db/migration/V*.sql");
        java.util.List<String> nombres = java.util.Arrays.stream(rs)
            .map(org.springframework.core.io.Resource::getFilename).toList();
        org.junit.jupiter.api.Assertions.assertTrue(
            declarada <= FlywayRepairConfig.ultimaVersionMigracion(nombres));
    }
}
