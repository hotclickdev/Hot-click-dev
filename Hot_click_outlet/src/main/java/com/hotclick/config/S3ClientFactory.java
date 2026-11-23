package com.hotclick.config;

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * Arma {@link S3Client} y {@link S3Presigner} con soporte opcional de endpoint S3-compatible
 * (p. ej. OCI Object Storage). Sin endpoint el resultado es idéntico al de AWS: virtual-hosted,
 * sin endpointOverride.
 */
public final class S3ClientFactory {

    private S3ClientFactory() {}

    /**
     * Endpoint normalizado o {@code null} si está vacío (modo AWS). Si está definido debe ser una
     * URL https absoluta con host, sin userinfo, query ni fragment; si no, falla el arranque.
     * El mensaje no repite el valor configurado.
     */
    static URI endpointUri(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) return null;
        URI uri;
        try {
            uri = new URI(endpoint.trim());
        } catch (URISyntaxException e) {
            throw invalido("AWS_S3_ENDPOINT", "no es una URI válida");
        }
        if (uri.getScheme() == null || !"https".equalsIgnoreCase(uri.getScheme())) {
            throw invalido("AWS_S3_ENDPOINT", "debe ser una URL absoluta https:// (http no está permitido)");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw invalido("AWS_S3_ENDPOINT", "debe tener un host");
        }
        if (uri.getRawUserInfo() != null) {
            throw invalido("AWS_S3_ENDPOINT", "no debe incluir usuario ni contraseña (userinfo)");
        }
        if (uri.getRawQuery() != null) {
            throw invalido("AWS_S3_ENDPOINT", "no debe incluir query");
        }
        if (uri.getRawFragment() != null) {
            throw invalido("AWS_S3_ENDPOINT", "no debe incluir fragment");
        }
        return uri;
    }

    private static IllegalArgumentException invalido(String variable, String motivo) {
        return new IllegalArgumentException("Configuración inválida: " + variable + " " + motivo);
    }

    /** Parsea un flag booleano estricto: null/blank = {@code porDefecto}; otro valor distinto de true/false falla. */
    private static boolean flagBooleano(String variable, String valor, Boolean porDefecto) {
        if (valor == null || valor.isBlank()) return porDefecto == null ? false : porDefecto;
        String v = valor.trim();
        if ("true".equalsIgnoreCase(v)) return true;
        if ("false".equalsIgnoreCase(v)) return false;
        throw invalido(variable, "debe ser true o false (o quedar vacía)");
    }

    /**
     * AWS_S3_PUBLIC_OBJECT_ACL: vacío/sin definir = true (comportamiento AWS previo, ACL PUBLIC_READ);
     * "false" lo apaga explícitamente; cualquier otro valor falla el arranque.
     */
    public static boolean publicObjectAcl(String flag) {
        return flagBooleano("AWS_S3_PUBLIC_OBJECT_ACL", flag, true);
    }

    /**
     * Sin endpoint: nunca path-style. Con endpoint: path-style salvo que la variable diga
     * explícitamente "false". El flag se valida siempre (también sin endpoint).
     */
    static boolean pathStyle(String endpoint, String pathStyleFlag) {
        URI uri = endpointUri(endpoint);
        boolean explicito = flagBooleano("AWS_S3_PATH_STYLE", pathStyleFlag, true);
        return uri != null && explicito;
    }

    public static S3Client client(String region, String endpoint, String pathStyleFlag,
                                  AwsCredentialsProvider credentials) {
        var b = S3Client.builder().region(Region.of(region)).credentialsProvider(credentials);
        URI uri = endpointUri(endpoint);
        boolean pathStyle = pathStyle(endpoint, pathStyleFlag);
        if (uri != null) {
            b.endpointOverride(uri)
             .serviceConfiguration(S3Configuration.builder()
                     .pathStyleAccessEnabled(pathStyle).build());
        }
        return b.build();
    }

    public static S3Presigner presigner(String region, String endpoint, String pathStyleFlag,
                                        AwsCredentialsProvider credentials) {
        var b = S3Presigner.builder().region(Region.of(region)).credentialsProvider(credentials);
        URI uri = endpointUri(endpoint);
        boolean pathStyle = pathStyle(endpoint, pathStyleFlag);
        if (uri != null) {
            b.endpointOverride(uri)
             .serviceConfiguration(S3Configuration.builder()
                     .pathStyleAccessEnabled(pathStyle).build());
        }
        return b.build();
    }
}
