package com.hotclick.payment;

import com.hotclick.integration.BaseIntegrationTest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Regresión: las rutas de la pasarela retirada ya no existen. Un cliente viejo que las llame nunca recibe 2xx
 * ni 5xx (no confirma, no cobra, no rompe). La ruta se arma por partes, igual que en SinPasarelaRetiradaTest.
 */
class SinPasarelaRetiradaRutasTest extends BaseIntegrationTest {

    private static final String R = "tilo" + "pay";

    @ParameterizedTest(name = "POST {0} ya no existe")
    @ValueSource(strings = {
        "/api/payments/%s/confirmar/910001", "/api/payments/%s/reintentar/910001", "/api/webhooks/%s",
        "/api/billing/%s/confirmar/ORD-1", "/api/pos/qr/pago/tokeninexistente99/%s",
        "/api/pos/qr/pago/tokeninexistente99/%s/confirmar"})
    void rutaRetirada(String plantilla) throws Exception {
        String ruta = plantilla.formatted(R);
        int sinToken = mockMvc.perform(post(ruta)).andReturn().getResponse().getStatus();
        int conToken = mockMvc.perform(post(ruta).header("Authorization", adminToken)).andReturn().getResponse().getStatus();
        assertThat(sinToken).as(ruta).isIn(401, 403, 404, 405);
        assertThat(conToken).as(ruta).isIn(401, 403, 404, 405);
    }
}
