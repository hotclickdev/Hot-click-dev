package com.hotclick.config;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Profiles;

import static org.assertj.core.api.Assertions.assertThat;

/** QaCuentasSeeder y CatalogoLocalSeeder ponen ACTIVO directo: nunca pueden correr en producción. */
class SeedersNuncaEnProduccionTest {

    private static boolean activo(Class<?> seeder, String... perfiles) {
        String[] expr = seeder.getAnnotation(Profile.class).value();
        java.util.Set<String> act = java.util.Set.of(perfiles);
        return Profiles.of(expr).matches(act::contains);
    }

    @Test
    void perfilesExcluyenProduccion() {
        for (Class<?> c : new Class<?>[]{QaCuentasSeeder.class, CatalogoLocalSeeder.class}) {
            assertThat(activo(c, "dev")).as(c.getSimpleName()).isTrue();
            assertThat(activo(c, "dev", "prod")).as(c.getSimpleName()).isFalse();
            assertThat(activo(c, "dev", "production")).as(c.getSimpleName()).isFalse();
            assertThat(activo(c, "prod")).as(c.getSimpleName()).isFalse();
        }
    }

    @Test
    void guardDeEjecucionDetectaProduccion() {
        assertThat(ClaveSemilla.esProduccion("https://hotclick.lat", new String[]{"dev"})).isTrue();
        assertThat(ClaveSemilla.esProduccion("http://localhost:3000", new String[]{"dev"})).isFalse();
    }
}
