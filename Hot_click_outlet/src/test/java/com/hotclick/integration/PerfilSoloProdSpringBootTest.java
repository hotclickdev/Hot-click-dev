package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles(value = {"prod"}, inheritProfiles = false)
@DisplayName("Perfiles prod: sin beans de reset/seed, reset-plataforma-qa 404, TOTP con clave")
class PerfilSoloProdSpringBootTest extends PerfilProduccionSinResetBase {
    @Override protected String[] perfilesEsperados() { return new String[]{"prod"}; }
}
