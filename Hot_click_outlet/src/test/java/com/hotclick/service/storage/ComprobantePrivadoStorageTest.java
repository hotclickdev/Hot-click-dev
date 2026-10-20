package com.hotclick.service.storage;

import com.hotclick.service.SupabaseStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ComprobantePrivadoStorageTest {

    private final S3Presigner presigner = S3Presigner.builder().region(Region.US_EAST_2)
        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("AKIAFICTICIO", "ficticio")))
        .build();
    private final MockMultipartFile foto = new MockMultipartFile("f", "c.png", "image/png", new byte[] {1});

    @Test
    void sinBucketPrivadoFallaCerradoYNoSube() throws Exception {
        SupabaseStorageService storage = mock(SupabaseStorageService.class);
        var s = new ComprobantePrivadoStorage(storage, presigner, "", 5);
        assertThatThrownBy(() -> s.subir(foto, "comprobantes-sinpe")).isInstanceOf(IllegalStateException.class);
        verify(storage, never()).subirImagenPrivadaEn(any(), any(), any());
    }

    @Test
    void subeAlBucketPrivadoYGuardaReferenciaNoUrl() throws Exception {
        SupabaseStorageService storage = mock(SupabaseStorageService.class);
        when(storage.subirImagenPrivadaEn(any(), startsWith("comprobantes-sinpe/"), eq("priv-bucket")))
            .thenAnswer(inv -> inv.getArgument(1));
        var s = new ComprobantePrivadoStorage(storage, presigner, "priv-bucket", 5);
        String ref = s.subir(foto, "comprobantes-sinpe");
        assertThat(ref).startsWith("s3-privado:comprobantes-sinpe/").endsWith(".png").doesNotContain("http");
    }

    @Test
    void urlFirmadaCortaYUrlsViejasSinCambio() {
        var s = new ComprobantePrivadoStorage(mock(SupabaseStorageService.class), presigner, "priv-bucket", 5);
        String url = s.urlParaVer("s3-privado:comprobantes-sinpe/abc.png");
        assertThat(url).contains("priv-bucket").contains("X-Amz-Signature").contains("X-Amz-Expires=300");
        assertThat(s.urlParaVer("https://viejo/x.png")).isEqualTo("https://viejo/x.png");
    }
}
