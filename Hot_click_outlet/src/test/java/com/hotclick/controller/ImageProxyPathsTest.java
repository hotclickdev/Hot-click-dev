package com.hotclick.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Path del proxy /api/img")
class ImageProxyPathsTest {

    @Test
    @DisplayName("Acepta keys relativas de S3")
    void pathRelativoOk() {
        assertThat(ImageProxyPaths.esSeguro("productos/abc.jpg")).isTrue();
        assertThat(ImageProxyPaths.esSeguro("HOT_CLICK/productos/abc.jpg")).isTrue();
    }

    @Test
    @DisplayName("Rechaza traversal, scheme, query y fragment")
    void pathHostilRechazado() {
        assertThat(ImageProxyPaths.esSeguro("../secret")).isFalse();
        assertThat(ImageProxyPaths.esSeguro("/etc/passwd")).isFalse();
        assertThat(ImageProxyPaths.esSeguro("https://evil.example/x")).isFalse();
        assertThat(ImageProxyPaths.esSeguro("foo?x=1")).isFalse();
        assertThat(ImageProxyPaths.esSeguro("foo#x")).isFalse();
        assertThat(ImageProxyPaths.esSeguro("foo@evil")).isFalse();
        assertThat(ImageProxyPaths.esSeguro(null)).isFalse();
    }

    @Test
    @DisplayName("El host del fetch debe coincidir con el bucket público")
    void hostDebeSerElDeS3() {
        String s3 = "https://hotclick-media.s3.amazonaws.com";
        assertThat(ImageProxyPaths.hostPermitido(s3 + "/productos/a.jpg", s3)).isTrue();
        assertThat(ImageProxyPaths.hostPermitido("https://evil.example/a.jpg", s3)).isFalse();
    }
}
