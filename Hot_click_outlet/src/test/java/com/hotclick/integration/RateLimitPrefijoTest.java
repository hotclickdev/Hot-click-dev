package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * PUB-08: el tope por prefijo cuenta por IP + prefijo, no por path completo (cambiar el token/id no abre otro bucket).
 * PUB-09: GET /api/public/tienda-rapida/{token} tiene su propio tope (20/min por IP).
 * Cada test usa una IP publica distinta (peer no confiable: X-Forwarded-For se ignora).
 */
@DisplayName("[PUB-08/09] Rate limit por IP + prefijo")
class RateLimitPrefijoTest extends BaseIntegrationTest {

    private static RequestPostProcessor desde(String ip) {
        return req -> { req.setRemoteAddr(ip); return req; };
    }

    private int status(MockHttpServletRequestBuilder b) throws Exception {
        return mockMvc.perform(b).andReturn().getResponse().getStatus();
    }

    private void topePorPrefijo(String ip, int max, java.util.function.IntFunction<String> url) throws Exception {
        for (int i = 0; i < max; i++) {
            int s = status(post(url.apply(i)).with(desde(ip)).contentType(MediaType.APPLICATION_JSON).content("{}"));
            assertThat(s).as("intento %d", i + 1).isNotEqualTo(429);
        }
        int s = status(post(url.apply(max)).with(desde(ip)).contentType(MediaType.APPLICATION_JSON).content("{}"));
        assertThat(s).as("intento %d con otro token/id", max + 1).isEqualTo(429);
    }

    @Test
    @DisplayName("POST tienda-rapida: 5 tokens distintos agotan el tope, el 6 da 429")
    void tiendaRapida_tokensDistintos() throws Exception {
        topePorPrefijo("203.0.113.11", 5, i -> "/api/public/tienda-rapida/tokenInexistente_" + i + "_abcdefghijklmnop");
    }

    @Test
    @DisplayName("POST /api/qr/{token}/pedido: tokens distintos comparten bucket")
    void qrPedido_tokensDistintos() throws Exception {
        topePorPrefijo("203.0.113.12", 10, i -> "/api/qr/tokenMesa" + i + "/pedido");
    }

    @Test
    @DisplayName("POST /api/productos/{id}/avisar-reposicion: ids distintos comparten bucket")
    void avisarReposicion_idsDistintos() throws Exception {
        topePorPrefijo("203.0.113.13", 5, i -> "/api/productos/" + (900000 + i) + "/avisar-reposicion");
    }

    @Test
    @DisplayName("X-Forwarded-For falso desde un peer no confiable no rota el bucket")
    void xffFalsoNoRota() throws Exception {
        String ip = "203.0.113.14";
        for (int i = 0; i < 5; i++) {
            int s = status(post("/api/public/tienda-rapida/t" + i + "_abcdefghijklmnopqrs").with(desde(ip))
                .header("X-Forwarded-For", "198.51.100." + i).contentType(MediaType.APPLICATION_JSON).content("{}"));
            assertThat(s).isNotEqualTo(429);
        }
        int s = status(post("/api/public/tienda-rapida/tX_abcdefghijklmnopqrs").with(desde(ip))
            .header("X-Forwarded-For", "198.51.100.99").contentType(MediaType.APPLICATION_JSON).content("{}"));
        assertThat(s).isEqualTo(429);
    }

    @Test
    @DisplayName("PUB-09: GET tienda-rapida/{token} -> 429 al intento 21")
    void getTiendaRapida_20() throws Exception {
        String ip = "203.0.113.15";
        for (int i = 0; i < 20; i++) {
            assertThat(status(get("/api/public/tienda-rapida/tok" + i + "_abcdefghijklmnopqr").with(desde(ip))))
                .as("GET %d", i + 1).isNotEqualTo(429);
        }
        assertThat(status(get("/api/public/tienda-rapida/tokZ_abcdefghijklmnopqr").with(desde(ip)))).isEqualTo(429);
    }

    /** Reglas porRecurso: cada pedido/pago tiene su propio cupo por IP; el mismo recurso pasado el tope da 429. */
    private void cupoPorRecurso(String ip, int max, String urlA, String urlB) throws Exception {
        for (int i = 0; i < max; i++) {
            assertThat(status(post(urlA).with(desde(ip)).contentType(MediaType.APPLICATION_JSON).content("{}")))
                .as("A intento %d", i + 1).isNotEqualTo(429);
        }
        // Otro pedido desde la misma IP: cupo propio, no 429.
        for (int i = 0; i < max; i++) {
            assertThat(status(post(urlB).with(desde(ip)).contentType(MediaType.APPLICATION_JSON).content("{}")))
                .as("B intento %d", i + 1).isNotEqualTo(429);
        }
        assertThat(status(post(urlA).with(desde(ip)).contentType(MediaType.APPLICATION_JSON).content("{}")))
            .as("A pasado el tope").isEqualTo(429);
        assertThat(status(post(urlB).with(desde(ip)).contentType(MediaType.APPLICATION_JSON).content("{}")))
            .as("B pasado el tope").isEqualTo(429);
    }

    @Test
    @DisplayName("/api/pedidos/{id}/notificar: cupo por pedido + IP (5)")
    void notificar_porPedido() throws Exception {
        cupoPorRecurso("203.0.113.21", 5, "/api/pedidos/910001/notificar", "/api/pedidos/910002/notificar");
    }

    @Test
    @DisplayName("Tilopay confirmar: cupo por pedido + IP (10)")
    void tilopayConfirmar_porPedido() throws Exception {
        cupoPorRecurso("203.0.113.22", 10, "/api/payments/tilopay/confirmar/910001", "/api/payments/tilopay/confirmar/910002");
    }

    @Test
    @DisplayName("Tilopay reintentar: cupo por pedido + IP (10)")
    void tilopayReintentar_porPedido() throws Exception {
        cupoPorRecurso("203.0.113.23", 10, "/api/payments/tilopay/reintentar/910001", "/api/payments/tilopay/reintentar/910002");
    }

    @Test
    @DisplayName("Pago QR POS: cupo por sesion de pago + IP (10)")
    void qrPago_porSesion() throws Exception {
        cupoPorRecurso("203.0.113.24", 10, "/api/pos/qr/pago/tokA_abcdefghijkl/intent", "/api/pos/qr/pago/tokB_abcdefghijkl/intent");
    }
}
