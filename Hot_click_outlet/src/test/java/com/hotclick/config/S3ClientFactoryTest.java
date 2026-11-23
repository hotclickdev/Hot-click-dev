package com.hotclick.config;

import org.junit.jupiter.api.Test;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URI;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class S3ClientFactoryTest {

    private static final AwsCredentialsProvider CREDS =
            StaticCredentialsProvider.create(AwsBasicCredentials.create("AKIAFAKE", "fake"));
    private static final String OCI = "https://ejemplo.compat.objectstorage.us-ashburn-1.oraclecloud.com";

    private static URI presign(S3Presigner p) {
        try (p) {
            return URI.create(p.presignGetObject(GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(1))
                    .getObjectRequest(GetObjectRequest.builder().bucket("bkt").key("a/b.jpg").build())
                    .build()).url().toString());
        }
    }

    private static URI clientUrl(S3Client c) {
        try (c) {
            return URI.create(c.utilities().getUrl(b -> b.bucket("bkt").key("a/b.jpg")).toString());
        }
    }

    @Test
    void sinEndpointEsAwsVirtualHosted() {
        for (String ep : new String[]{null, "", "  "}) {
            URI c = clientUrl(S3ClientFactory.client("us-east-2", ep, null, CREDS));
            assertThat(c.getHost()).isEqualTo("bkt.s3.us-east-2.amazonaws.com");
            URI p = presign(S3ClientFactory.presigner("us-east-2", ep, null, CREDS));
            assertThat(p.getHost()).isEqualTo("bkt.s3.us-east-2.amazonaws.com");
            assertThat(p.getPath()).isEqualTo("/a/b.jpg");
        }
    }

    @Test
    void sinEndpointIgnoraPathStyleTrue() {
        URI c = clientUrl(S3ClientFactory.client("us-east-2", "", "true", CREDS));
        assertThat(c.getHost()).isEqualTo("bkt.s3.us-east-2.amazonaws.com");
        assertThat(S3ClientFactory.pathStyle("", "true")).isFalse();
    }

    @Test
    void conEndpointUsaOverrideYPathStyleAutomatico() {
        S3Client client = S3ClientFactory.client("us-ashburn-1", " " + OCI + " ", "", CREDS);
        assertThat(client.serviceClientConfiguration().endpointOverride()).contains(URI.create(OCI));
        URI c = clientUrl(client);
        assertThat(c.getHost()).isEqualTo("ejemplo.compat.objectstorage.us-ashburn-1.oraclecloud.com");
        assertThat(c.getPath()).isEqualTo("/bkt/a/b.jpg");

        URI p = presign(S3ClientFactory.presigner("us-ashburn-1", OCI, null, CREDS));
        assertThat(p.getHost()).isEqualTo("ejemplo.compat.objectstorage.us-ashburn-1.oraclecloud.com");
        assertThat(p.getPath()).isEqualTo("/bkt/a/b.jpg");
    }

    @Test
    void conEndpointYPathStyleFalseSoloOverride() {
        S3Client client = S3ClientFactory.client("us-ashburn-1", OCI, "false", CREDS);
        assertThat(client.serviceClientConfiguration().endpointOverride()).contains(URI.create(OCI));
        assertThat(clientUrl(client).getHost()).startsWith("bkt.");

        URI p = presign(S3ClientFactory.presigner("us-ashburn-1", OCI, "false", CREDS));
        assertThat(p.getHost()).startsWith("bkt.");
        assertThat(p.getPath()).isEqualTo("/a/b.jpg");
    }

    @Test
    void sinEndpointClientNoTieneOverride() {
        try (S3Client c = S3ClientFactory.client("us-east-2", "", null, CREDS)) {
            assertThat(c.serviceClientConfiguration().endpointOverride()).isEmpty();
        }
    }

    @Test
    void endpointHttpsValidoPasa() {
        assertThat(S3ClientFactory.endpointUri("HTTPS://host.example.com:8443/base")).isNotNull();
        assertThat(S3ClientFactory.endpointUri(OCI)).isEqualTo(URI.create(OCI));
    }

    @Test
    void endpointInvalidoFallaSinRepetirElValor() {
        String[] malos = {
                "http://ejemplo.example.com",
                "ftp://ejemplo.example.com",
                "https://",
                "https:///ruta",
                "https://usuario:SECRETO@ejemplo.example.com",
                "https://usuario@ejemplo.example.com",
                "https://ejemplo.example.com?x=1",
                "https://ejemplo.example.com/#frag",
                "ejemplo.example.com",
                "/ruta/relativa",
                "https://eje mplo.example.com"
        };
        for (String ep : malos) {
            assertThatThrownBy(() -> S3ClientFactory.endpointUri(ep))
                    .as(ep).isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("AWS_S3_ENDPOINT")
                    .hasMessageNotContaining("SECRETO");
            assertThatThrownBy(() -> S3ClientFactory.client("us-east-1", ep, null, CREDS))
                    .as(ep).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> S3ClientFactory.presigner("us-east-1", ep, null, CREDS))
                    .as(ep).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void endpointVacioSigueSiendoAws() {
        for (String ep : new String[]{null, "", "   "}) {
            assertThat(S3ClientFactory.endpointUri(ep)).isNull();
        }
    }

    @Test
    void pathStyleValidoSeRespetaConYSinEndpoint() {
        assertThat(S3ClientFactory.pathStyle(OCI, " TRUE ")).isTrue();
        assertThat(S3ClientFactory.pathStyle(OCI, "False")).isFalse();
        assertThat(S3ClientFactory.pathStyle(OCI, null)).isTrue();
        assertThat(S3ClientFactory.pathStyle(OCI, "  ")).isTrue();
        assertThat(S3ClientFactory.pathStyle("", "true")).isFalse();
        assertThat(S3ClientFactory.pathStyle("", "false")).isFalse();
        assertThat(S3ClientFactory.pathStyle(null, null)).isFalse();
    }

    @Test
    void pathStyleInvalidoFallaConYSinEndpoint() {
        for (String flag : new String[]{"yes", "1", "foo", "tru"}) {
            for (String ep : new String[]{OCI, "", null}) {
                assertThatThrownBy(() -> S3ClientFactory.pathStyle(ep, flag))
                        .as(flag + "/" + ep).isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("AWS_S3_PATH_STYLE");
                assertThatThrownBy(() -> S3ClientFactory.client("us-east-1", ep, flag, CREDS))
                        .isInstanceOf(IllegalArgumentException.class);
                assertThatThrownBy(() -> S3ClientFactory.presigner("us-east-1", ep, flag, CREDS))
                        .isInstanceOf(IllegalArgumentException.class);
            }
        }
    }

    @Test
    void publicObjectAclVacioOUnsetEsTrue() {
        for (String v : new String[]{null, "", "  ", "true", "TRUE", " True "}) {
            assertThat(S3ClientFactory.publicObjectAcl(v)).as("[" + v + "]").isTrue();
        }
    }

    @Test
    void publicObjectAclFalseExplicitoEsFalse() {
        assertThat(S3ClientFactory.publicObjectAcl("false")).isFalse();
        assertThat(S3ClientFactory.publicObjectAcl("FALSE")).isFalse();
        assertThat(S3ClientFactory.publicObjectAcl(" False ")).isFalse();
    }

    @Test
    void publicObjectAclInvalidoFalla() {
        for (String v : new String[]{"yes", "1", "foo", "0"}) {
            assertThatThrownBy(() -> S3ClientFactory.publicObjectAcl(v))
                    .as(v).isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("AWS_S3_PUBLIC_OBJECT_ACL");
        }
    }
}
