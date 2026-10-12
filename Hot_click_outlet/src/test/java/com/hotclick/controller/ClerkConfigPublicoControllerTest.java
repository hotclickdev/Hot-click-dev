package com.hotclick.controller;

import com.hotclick.service.ClerkTokenService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClerkConfigPublicoControllerTest {

    private static ClerkTokenService clerk(boolean configurado) {
        ClerkTokenService s = mock(ClerkTokenService.class);
        when(s.isConfigured()).thenReturn(configurado);
        return s;
    }

    @Test
    void derivaClaveLiveDelIssuerDeProduccion() {
        // base64("clerk.hotclick.lat$")
        assertThat(ClerkConfigPublicoController.derivarDeIssuer("https://clerk.hotclick.lat"))
            .isEqualTo("pk_live_Y2xlcmsuaG90Y2xpY2subGF0JA==");
    }

    @Test
    void derivaClaveTestDeInstanciaDev() {
        assertThat(ClerkConfigPublicoController.derivarDeIssuer("https://hot-spider-31.clerk.accounts.dev"))
            .startsWith("pk_test_");
    }

    @Test
    void issuerVacioOInvalidoNoDaClave() {
        assertThat(ClerkConfigPublicoController.derivarDeIssuer("")).isNull();
        assertThat(ClerkConfigPublicoController.derivarDeIssuer("no es url")).isNull();
    }

    @Test
    void claveExplicitaTienePrioridad() {
        var c = new ClerkConfigPublicoController(clerk(true), "pk_live_explicita", "https://clerk.hotclick.lat");
        assertThat(c.authConfig().getBody()).containsEntry("clerkPublishableKey", "pk_live_explicita");
    }

    @Test
    void sinJwksNoSeExponeClave() {
        var c = new ClerkConfigPublicoController(clerk(false), "", "https://clerk.hotclick.lat");
        assertThat(c.authConfig().getBody()).containsEntry("clerkPublishableKey", null);
    }
}
