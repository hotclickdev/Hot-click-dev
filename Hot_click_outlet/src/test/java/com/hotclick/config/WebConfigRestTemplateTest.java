package com.hotclick.config;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** ALTO-02: timeouts conservados (10 s / 30 s) y sin seguir redirecciones (no reenvía el Bearer). */
@DisplayName("[Config] RestTemplate compartido: timeouts y redirecciones")
class WebConfigRestTemplateTest {

    @Test
    @DisplayName("Connect 10 s y read 30 s, como tenía SimpleClientHttpRequestFactory")
    void timeoutsConservados() {
        RestTemplate rt = new WebConfig().restTemplate();
        assertThat(rt.getRequestFactory()).isInstanceOf(JdkClientHttpRequestFactory.class);
        HttpClient http = (HttpClient) ReflectionTestUtils.getField(rt.getRequestFactory(), "httpClient");
        assertThat(http.connectTimeout()).contains(Duration.ofSeconds(10));
        assertThat(ReflectionTestUtils.getField(rt.getRequestFactory(), "readTimeout"))
            .isEqualTo(Duration.ofSeconds(30));
        assertThat(http.followRedirects()).isEqualTo(HttpClient.Redirect.NEVER);
    }

    @Test
    @DisplayName("Un 302 no se sigue: se devuelve el 3xx y el destino nunca recibe el request")
    void noSigueRedirecciones() throws Exception {
        HttpServer srv = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        AtomicInteger destino = new AtomicInteger();
        srv.createContext("/origen", ex -> {
            ex.getResponseHeaders().add("Location", "/destino");
            ex.sendResponseHeaders(302, -1);
            ex.close();
        });
        srv.createContext("/destino", ex -> {
            destino.incrementAndGet();
            ex.sendResponseHeaders(200, -1);
            ex.close();
        });
        srv.start();
        try {
            RestTemplate rt = new WebConfig().restTemplate();
            HttpHeaders h = new HttpHeaders();
            h.setBearerAuth("token-ficticio-de-test");
            for (HttpMethod m : new HttpMethod[]{HttpMethod.GET, HttpMethod.POST, HttpMethod.PATCH}) {
                ResponseEntity<String> r = rt.exchange("http://127.0.0.1:" + srv.getAddress().getPort() + "/origen",
                    m, new HttpEntity<>("{}", h), String.class);
                assertThat(r.getStatusCode().value()).as(m.name()).isEqualTo(302);
            }
            assertThat(destino.get()).isZero();
        } finally {
            srv.stop(0);
        }
    }
}
