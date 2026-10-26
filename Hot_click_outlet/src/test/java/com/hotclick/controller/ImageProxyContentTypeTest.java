package com.hotclick.controller;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.InetSocketAddress;

import static org.assertj.core.api.Assertions.assertThat;

class ImageProxyContentTypeTest {

    private HttpServer server;

    @AfterEach
    void stop() { if (server != null) server.stop(0); }

    @Test
    void allowlistDeTipos() {
        assertThat(ImageProxyController.tipoImagenPermitido("image/png")).isEqualTo("image/png");
        assertThat(ImageProxyController.tipoImagenPermitido("IMAGE/JPEG; charset=x")).isEqualTo("image/jpeg");
        assertThat(ImageProxyController.tipoImagenPermitido("image/jpg")).isEqualTo("image/jpeg");
        assertThat(ImageProxyController.tipoImagenPermitido("image/gif")).isEqualTo("image/gif");
        assertThat(ImageProxyController.tipoImagenPermitido("image/webp")).isEqualTo("image/webp");
        assertThat(ImageProxyController.tipoImagenPermitido("image/svg+xml")).isNull();
        assertThat(ImageProxyController.tipoImagenPermitido("text/html")).isNull();
        assertThat(ImageProxyController.tipoImagenPermitido(null)).isNull();
    }

    private ImageProxyController proxyCon(String contentType, byte[] body) throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            ex.getResponseHeaders().add("Content-Type", contentType);
            ex.sendResponseHeaders(200, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        server.start();
        ImageProxyController c = new ImageProxyController();
        ReflectionTestUtils.setField(c, "s3PublicUrl", "http://127.0.0.1:" + server.getAddress().getPort());
        return c;
    }

    @Test
    void svgSeSirveComoDescargaOpaca() throws Exception {
        ImageProxyController c = proxyCon("image/svg+xml", "<svg onload=alert(1)/>".getBytes());
        ResponseEntity<byte[]> r = c.proxy("productos/a.svg", null, null, 82);
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getHeaders().getFirst("Content-Type")).isEqualTo("application/octet-stream");
        assertThat(r.getHeaders().getFirst("Content-Disposition")).isEqualTo("attachment");
        assertThat(r.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(r.getHeaders().getFirst("Content-Security-Policy")).isEqualTo("default-src 'none'; sandbox");
    }

    @Test
    void erroresTambienLlevanNosniffYSandbox() throws Exception {
        ImageProxyController c = new ImageProxyController();
        ReflectionTestUtils.setField(c, "s3PublicUrl", "http://127.0.0.1:1");
        ResponseEntity<byte[]> bad = c.proxy("../etc/passwd", null, null, 82);
        assertThat(bad.getStatusCode().value()).isEqualTo(400);
        assertThat(bad.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(bad.getHeaders().getFirst("Content-Security-Policy")).isEqualTo("default-src 'none'; sandbox");
        ResponseEntity<byte[]> upstream = c.proxy("productos/a.png", null, null, 82);
        assertThat(upstream.getStatusCode().value()).isEqualTo(502);
        assertThat(upstream.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(upstream.getHeaders().getFirst("Content-Security-Policy")).isEqualTo("default-src 'none'; sandbox");
    }

    @Test
    void htmlSeSirveComoDescargaOpaca() throws Exception {
        ImageProxyController c = proxyCon("text/html", "<h1>x</h1>".getBytes());
        ResponseEntity<byte[]> r = c.proxy("productos/a.png", null, null, 82);
        assertThat(r.getHeaders().getFirst("Content-Disposition")).isEqualTo("attachment");
        assertThat(r.getHeaders().getFirst("Content-Type")).isEqualTo("application/octet-stream");
    }

    @Test
    void pngPermitidoInlineConNosniff() throws Exception {
        ImageProxyController c = proxyCon("image/png", new byte[]{(byte) 0x89, 'P', 'N', 'G'});
        ResponseEntity<byte[]> r = c.proxy("productos/a.png", null, null, 82);
        assertThat(r.getHeaders().getFirst("Content-Type")).isEqualTo("image/png");
        assertThat(r.getHeaders().getFirst("Content-Disposition")).isNull();
        assertThat(r.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(r.getHeaders().getFirst("Content-Security-Policy")).isEqualTo("default-src 'none'; sandbox");
    }
}
