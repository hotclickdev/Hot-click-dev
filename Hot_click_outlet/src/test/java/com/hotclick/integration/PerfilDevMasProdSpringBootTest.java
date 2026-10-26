package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles(value = {"dev", "prod"}, inheritProfiles = false)
@DisplayName("Perfiles dev+prod: sin beans de reset/seed, reset-plataforma-qa 404, TOTP con clave")
class PerfilDevMasProdSpringBootTest extends PerfilProduccionSinResetBase {
    @Override protected String[] perfilesEsperados() { return new String[]{"dev", "prod"}; }
}
