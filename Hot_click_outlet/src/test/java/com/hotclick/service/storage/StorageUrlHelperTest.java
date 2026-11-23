package com.hotclick.service.storage;

import com.hotclick.controller.ImageProxyPaths;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StorageUrlHelperTest {

    private static final String OCI = "https://objectstorage.us-ashburn-1.oraclecloud.com/n/ejemplo/b/hotclick-media/o";
    private static final String AWS = "https://hotclick-media.s3.us-east-2.amazonaws.com";

    @Test
    void urlPublicaConcatenaConUnaBarra() {
        assertThat(StorageUrlHelper.urlPublica(OCI, "productos/a.jpg")).isEqualTo(OCI + "/productos/a.jpg");
        assertThat(StorageUrlHelper.urlPublica(AWS, "productos/a.jpg")).isEqualTo(AWS + "/productos/a.jpg");
    }

    @Test
    void hostPermitidoConUrlEstiloOci() {
        String url = StorageUrlHelper.urlPublica(OCI, "productos/a.jpg");
        assertThat(ImageProxyPaths.hostPermitido(url, OCI)).isTrue();
        assertThat(ImageProxyPaths.hostPermitido("https://evil.example/n/x/b/y/o/a.jpg", OCI)).isFalse();
        assertThat(ImageProxyPaths.hostPermitido(StorageUrlHelper.urlPublica(AWS, "a.jpg"), OCI)).isFalse();
    }

    @Test
    void hostPermitidoConUrlAws() {
        assertThat(ImageProxyPaths.hostPermitido(AWS + "/productos/a.jpg", AWS)).isTrue();
        assertThat(ImageProxyPaths.hostPermitido(OCI + "/a.jpg", AWS)).isFalse();
    }

    @Test
    void barraFinalDeLaUrlPublicaSeNormaliza() {
        for (String base : new String[]{AWS, OCI}) {
            String esperado = base + "/productos/a.jpg";
            assertThat(StorageUrlHelper.urlPublica(base, "productos/a.jpg")).isEqualTo(esperado);
            assertThat(StorageUrlHelper.urlPublica(base + "/", "productos/a.jpg")).isEqualTo(esperado);
            assertThat(StorageUrlHelper.urlPublica(base + "///", "/productos/a.jpg")).isEqualTo(esperado);
            assertThat(StorageUrlHelper.sinBarraFinal(base + "//")).isEqualTo(base);
            assertThat(ImageProxyPaths.hostPermitido(
                    StorageUrlHelper.urlPublica(base + "/", "a.jpg"), base + "/")).isTrue();
        }
        assertThat(StorageUrlHelper.sinBarraFinal(null)).isEmpty();
    }
}
