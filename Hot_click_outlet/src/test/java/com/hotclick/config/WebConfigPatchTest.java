package com.hotclick.config;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/** ALTO-02: el RestTemplate compartido debe poder enviar PATCH (ONVO lo exige para items). */
@DisplayName("[Config] RestTemplate soporta PATCH")
class WebConfigPatchTest {

    @Test
    void restTemplateEnviaPatch() throws Exception {
        HttpServer srv = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        AtomicReference<String> metodo = new AtomicReference<>();
        srv.createContext("/x", ex -> {
            metodo.set(ex.getRequestMethod());
            byte[] b = "ok".getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(200, b.length);
            ex.getResponseBody().write(b);
            ex.close();
        });
        srv.start();
        try {
            RestTemplate rt = new WebConfig().restTemplate();
            ResponseEntity<String> r = rt.exchange(
                "http://127.0.0.1:" + srv.getAddress().getPort() + "/x",
                HttpMethod.PATCH, new HttpEntity<>("{}"), String.class);
            assertThat(r.getStatusCode().value()).isEqualTo(200);
            assertThat(metodo.get()).isEqualTo("PATCH");
        } finally {
            srv.stop(0);
        }
    }
}
