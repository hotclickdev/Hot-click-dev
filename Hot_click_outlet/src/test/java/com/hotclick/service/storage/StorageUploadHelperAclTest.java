package com.hotclick.service.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class StorageUploadHelperAclTest {

    private static final String PUB_OCI =
            "https://objectstorage.us-ashburn-1.oraclecloud.com/n/ejemplo/b/hotclick-media/o";
    private static final byte[] PNG = png();

    private static byte[] png() {
        try {
            return ImagenesDePrueba.fotoNormal("png");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static PutObjectRequest capturar(S3Client s3) {
        ArgumentCaptor<PutObjectRequest> cap = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3).putObject(cap.capture(), any(RequestBody.class));
        return cap.getValue();
    }

    @Test
    void porDefectoImagenPublicaLlevaPublicRead() {
        S3Client s3 = mock(S3Client.class);
        var h = new StorageUploadHelper(s3, new StorageImageValidator());
        h.subirImagenBytes(PNG, "png", "productos", "bkt", "https://x.example");
        assertThat(capturar(s3).acl()).isEqualTo(ObjectCannedACL.PUBLIC_READ);
    }

    @Test
    void conAclApagadaNoLlevaAclYUrlUsaPublicUrl() {
        S3Client s3 = mock(S3Client.class);
        var h = new StorageUploadHelper(s3, new StorageImageValidator(), false);
        String url = h.subirImagenBytes(PNG, "png", "productos", "bkt", PUB_OCI);
        PutObjectRequest req = capturar(s3);
        assertThat(req.acl()).isNull();
        assertThat(req.aclAsString()).isNull();
        assertThat(url).isEqualTo(PUB_OCI + "/" + req.key()).startsWith(PUB_OCI + "/productos/");
    }

    @Test
    void subirImagenYDescargadaRespetanElFlag() throws IOException {
        for (boolean acl : new boolean[]{true, false}) {
            S3Client s3 = mock(S3Client.class);
            var h = new StorageUploadHelper(s3, new StorageImageValidator(), acl);
            h.subirImagen(new MockMultipartFile("f", "a.png", "image/png", PNG), "productos", "bkt", PUB_OCI);
            assertThat(capturar(s3).acl()).isEqualTo(acl ? ObjectCannedACL.PUBLIC_READ : null);

            S3Client s3b = mock(S3Client.class);
            var h2 = new StorageUploadHelper(s3b, new StorageImageValidator(), acl);
            h2.subirImagenDescargada(PNG, "https://o.example/a.png", "image/png", "productos", "bkt", PUB_OCI);
            assertThat(capturar(s3b).acl()).isEqualTo(acl ? ObjectCannedACL.PUBLIC_READ : null);
        }
    }

    @Test
    void uploadsPrivadosNuncaLlevanAcl() throws IOException {
        for (boolean acl : new boolean[]{true, false}) {
            S3Client s3 = mock(S3Client.class);
            var h = new StorageUploadHelper(s3, new StorageImageValidator(), acl);
            h.subirXmlPrivado("<a/>".getBytes(), "xml/a.xml", "bkt");
            assertThat(capturar(s3).acl()).isNull();

            S3Client s3b = mock(S3Client.class);
            var h2 = new StorageUploadHelper(s3b, new StorageImageValidator(), acl);
            h2.subirImagenPrivada(new MockMultipartFile("f", "a.png", "image/png", PNG), "priv/a.png", "bkt");
            assertThat(capturar(s3b).acl()).isNull();
        }
    }
}
