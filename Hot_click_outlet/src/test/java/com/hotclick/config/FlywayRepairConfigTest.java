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
}
