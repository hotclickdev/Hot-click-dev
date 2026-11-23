package com.hotclick.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    /** Opcional: endpoint S3-compatible (OCI). Vacío = AWS. */
    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    /** Opcional: true/false explícito; vacío = automático (on si hay endpoint). */
    @Value("${aws.s3.path-style:}")
    private String pathStyle;

    @Bean
    public S3Client s3Client() {
        return S3ClientFactory.client(region, endpoint, pathStyle, DefaultCredentialsProvider.create());
    }

    /** C1: URLs firmadas de corta duración para objetos privados (comprobantes SINPE). */
    @Bean(destroyMethod = "close")
    public S3Presigner s3Presigner() {
        return S3ClientFactory.presigner(region, endpoint, pathStyle, DefaultCredentialsProvider.create());
    }
}
