package com.hotclick.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class S3Config {

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    /**
     * Endpoint de un almacenamiento compatible con S3 (p. ej. OCI Object Storage:
     * https://{namespace}.compat.objectstorage.{region}.oraclecloud.com).
     * Vacío = AWS S3 normal (comportamiento por defecto).
     */
    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    private boolean usaEndpointPropio() {
        return endpoint != null && !endpoint.isBlank();
    }

    @Bean
    public S3Client s3Client() {
        var builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create());
        if (usaEndpointPropio()) {
            builder.endpointOverride(URI.create(endpoint.trim()))
                    .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
        }
        return builder.build();
    }

    /** C1: URLs firmadas de corta duración para objetos privados (comprobantes SINPE). */
    @Bean(destroyMethod = "close")
    public S3Presigner s3Presigner() {
        var builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create());
        if (usaEndpointPropio()) {
            builder.endpointOverride(URI.create(endpoint.trim()))
                    .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
        }
        return builder.build();
    }
}
