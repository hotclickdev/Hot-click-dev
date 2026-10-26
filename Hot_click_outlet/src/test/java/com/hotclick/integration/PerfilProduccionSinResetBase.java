package com.hotclick.integration;

import com.hotclick.config.H2TablasNativasSeeder;
import com.hotclick.config.ResetPlataformaKeepQaRunner;
import com.hotclick.service.ResetPlataformaKeepQaService;
import com.hotclick.service.TotpSecretEncryptionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base: contexto Spring Boot completo con perfiles de producción (las subclases fijan los perfiles):
 * los beans destructivos de dev/test no existen, el endpoint de vaciado de plataforma responde 404
 * y TOTP exige clave (aquí se provee una válida; sin clave el arranque falla, ver PerfilesEstrictosTest).
 * La base es la H2 de application-test.properties (cargada como TestPropertySource, sin activar "test").
 */
@TestPropertySource(locations = "classpath:application-test.properties", properties =
    "totp.encryption.key=0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20")
abstract class PerfilProduccionSinResetBase extends BaseIntegrationTest {

    /** Perfiles exactos que activa la subclase. */
    protected abstract String[] perfilesEsperados();

    @Autowired private ApplicationContext ctx;

    @Test
    void beansDeResetYSeedAusentes() {
        assertThat(ctx.getEnvironment().getActiveProfiles()).containsExactlyInAnyOrder(perfilesEsperados());
        assertThat(ctx.getBeansOfType(ResetPlataformaKeepQaService.class)).isEmpty();
        assertThat(ctx.getBeansOfType(ResetPlataformaKeepQaRunner.class)).isEmpty();
        assertThat(ctx.getBeansOfType(H2TablasNativasSeeder.class)).isEmpty();
    }

    @Test
    void totpArrancaConClaveYCifra() {
        TotpSecretEncryptionService totp = ctx.getBean(TotpSecretEncryptionService.class);
        String cifrado = totp.encrypt("JBSWY3DPEHPK3PXP");
        assertThat(totp.isEncrypted(cifrado)).isTrue();
        assertThat(totp.decrypt(cifrado)).isEqualTo("JBSWY3DPEHPK3PXP");
    }

    @Test
    void resetPlataformaQaResponde404() throws Exception {
        mockMvc.perform(post("/api/admin/reset-plataforma-qa")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"x\",\"confirmacion\":\"ELIMINAR PLATAFORMA\"}"))
            .andExpect(status().isNotFound());
    }
}
