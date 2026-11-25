package com.hotclick.service.storage;

import com.hotclick.service.SupabaseStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DisplayName("Almacenamiento: bucket privado aparte (OCI) para certificados, D-105 y comprobantes SINPE")
class AlmacenamientoBucketPrivadoTest {

    private static final String PUBLICO = "hotclick-media";
    private static final String PRIVADO = "hotclick-privado";

    private SupabaseStorageService servicio(S3Client s3, String privateBucket, String publicObjectAcl) {
        SupabaseStorageService s = new SupabaseStorageService(s3, publicObjectAcl);
        ReflectionTestUtils.setField(s, "bucket", PUBLICO);
        ReflectionTestUtils.setField(s, "privateBucket", privateBucket);
        ReflectionTestUtils.setField(s, "publicUrl", "https://cdn.ejemplo/o");
        return s;
    }

    private PutObjectRequest ultimoPut(S3Client s3) {
        ArgumentCaptor<PutObjectRequest> req = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3).putObject(req.capture(), any(RequestBody.class));
        return req.getValue();
    }

    @Test
    void xmlPrivadoVaAlBucketPrivadoSinAcl() {
        S3Client s3 = mock(S3Client.class);
        servicio(s3, PRIVADO, "false").subirXmlPrivado("<a/>".getBytes(), "d105/1.xml");
        PutObjectRequest put = ultimoPut(s3);
        assertThat(put.bucket()).isEqualTo(PRIVADO);
        assertThat(put.acl()).isNull();
    }

    @Test
    void sinBucketPrivadoSeUsaElGeneral() {
        S3Client s3 = mock(S3Client.class);
        servicio(s3, "", "").subirXmlPrivado("<a/>".getBytes(), "d105/1.xml");
        assertThat(ultimoPut(s3).bucket()).isEqualTo(PUBLICO);
    }

    @Test
    void bucketPrivadoEnBlancoSeUsaElGeneral() {
        S3Client s3 = mock(S3Client.class);
        servicio(s3, "   ", "").subirXmlPrivado("<a/>".getBytes(), "d105/1.xml");
        assertThat(ultimoPut(s3).bucket()).isEqualTo(PUBLICO);
    }

    @Test
    void imagenPublicaSigueEnElBucketPublico() {
        S3Client s3 = mock(S3Client.class);
        String url = servicio(s3, PRIVADO, "false").subirImagenBytes(new byte[]{1, 2, 3}, "png", "productos");
        assertThat(ultimoPut(s3).bucket()).isEqualTo(PUBLICO);
        assertThat(url).startsWith("https://cdn.ejemplo/o/productos/");
    }

    @Test
    void urlFirmadaApuntaAlBucketPrivado() {
        SupabaseStorageService s = servicio(mock(S3Client.class), PRIVADO, "false");
        try (S3Presigner presigner = S3Presigner.builder()
                .region(Region.of("us-ashburn-1"))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("prueba", "prueba")))
                .endpointOverride(URI.create("https://ns.compat.objectstorage.us-ashburn-1.oraclecloud.com"))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build()) {
            ReflectionTestUtils.setField(s, "s3Presigner", presigner);
            String url = s.urlFirmada("privado/comprobantes-sinpe/a.png", Duration.ofMinutes(5));
            assertThat(url).startsWith("https://ns.compat.objectstorage.us-ashburn-1.oraclecloud.com/"
                    + PRIVADO + "/privado/comprobantes-sinpe/a.png?");
        }
    }
}
