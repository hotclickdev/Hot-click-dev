package com.hotclick.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.mock.env.MockEnvironment;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** Regresión MEDIO Seguridad: repair() corría sin condición en cada arranque, prod incluido. */
class FlywayRepairOnStartTest {

    private static Flyway correr(MockEnvironment env) {
        Flyway flyway = mock(Flyway.class);
        new FlywayRepairConfig(env).repairSiCorrespondeYMigrate(flyway);
        return flyway;
    }

    @Test
    void perfilProdSinFlag_noRepara_siMigra() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        Flyway flyway = correr(env);
        verify(flyway, never()).repair();
        verify(flyway).migrate();
    }

    @Test
    void perfilProductionSinFlag_noRepara() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");
        Flyway flyway = correr(env);
        verify(flyway, never()).repair();
        verify(flyway).migrate();
    }

    @Test
    void sinPerfilSinFlag_noRepara() {
        Flyway flyway = correr(new MockEnvironment());
        verify(flyway, never()).repair();
        verify(flyway).migrate();
    }

    @Test
    void perfilDesconocidoSinFlag_noRepara() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("staging");
        Flyway flyway = correr(env);
        verify(flyway, never()).repair();
        verify(flyway).migrate();
    }

    @Test
    void flagEnFalseExplicito_noRepara() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        env.setProperty(FlywayRepairConfig.PROP_REPAIR_ON_START, "false");
        Flyway flyway = correr(env);
        verify(flyway, never()).repair();
        verify(flyway).migrate();
    }

    @Test
    void flagEnTrue_reparaAntesDeMigrar() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        env.setProperty(FlywayRepairConfig.PROP_REPAIR_ON_START, "true");
        Flyway flyway = correr(env);
        InOrder orden = inOrder(flyway);
        orden.verify(flyway).repair();
        orden.verify(flyway).migrate();
    }

    @Test
    void perfilDev_repara() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        Flyway flyway = correr(env);
        InOrder orden = inOrder(flyway);
        orden.verify(flyway).repair();
        orden.verify(flyway).migrate();
    }
}
