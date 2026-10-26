package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles(value = {"dev", "production"}, inheritProfiles = false)
@DisplayName("Perfiles dev+production: sin beans de reset/seed, reset-plataforma-qa 404, TOTP con clave")
class PerfilDevMasProductionSpringBootTest extends PerfilProduccionSinResetBase {
    @Override protected String[] perfilesEsperados() { return new String[]{"dev", "production"}; }
}
