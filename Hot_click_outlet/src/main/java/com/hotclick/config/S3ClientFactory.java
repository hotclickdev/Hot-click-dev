package com.hotclick.config;

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Arma {@link S3Client} y {@link S3Presigner} con soporte opcional de endpoint S3-compatible
 * (p. ej. OCI Object Storage). Sin endpoint el resultado es idéntico al de AWS: virtual-hosted,
 * sin endpointOverride.
 */
public final class S3ClientFactory {

    private S3ClientFactory() {}

    /** Endpoint normalizado o {@code null} si está vacío (modo AWS). */
    static URI endpointUri(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) return null;
        return URI.create(endpoint.trim());
    }

    /**
     * Sin endpoint: nunca path-style. Con endpoint: path-style salvo que la variable diga
     * explícitamente "false".
     */
    static boolean pathStyle(String endpoint, String pathStyleFlag) {
        if (endpointUri(endpoint) == null) return false;
        if (pathStyleFlag == null || pathStyleFlag.isBlank()) return true;
        return Boolean.parseBoolean(pathStyleFlag.trim());
    }

    public static S3Client client(String region, String endpoint, String pathStyleFlag,
                                  AwsCredentialsProvider credentials) {
        var b = S3Client.builder().region(Region.of(region)).credentialsProvider(credentials);
        URI uri = endpointUri(endpoint);
        if (uri != null) {
            b.endpointOverride(uri)
             .serviceConfiguration(S3Configuration.builder()
                     .pathStyleAccessEnabled(pathStyle(endpoint, pathStyleFlag)).build());
        }
        return b.build();
    }

    public static S3Presigner presigner(String region, String endpoint, String pathStyleFlag,
                                        AwsCredentialsProvider credentials) {
        var b = S3Presigner.builder().region(Region.of(region)).credentialsProvider(credentials);
        URI uri = endpointUri(endpoint);
        if (uri != null) {
            b.endpointOverride(uri)
             .serviceConfiguration(S3Configuration.builder()
                     .pathStyleAccessEnabled(pathStyle(endpoint, pathStyleFlag)).build());
        }
        return b.build();
    }
}
