package com.hotclick.config.onvo;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Propiedades de tiempo para ONVO (diseño: docs/diseno-onvo-expires-timeout.md).
 *
 * PREPARADO, SIN CONECTAR: no está registrado con @EnableConfigurationProperties ni
 * @ConfigurationPropertiesScan, así que Spring no lo crea. Se conecta después de fusionar #240.
 *
 * @param connectTimeout tiempo máximo para abrir la conexión a api.onvopay.com
 * @param readTimeout    tiempo máximo esperando respuesta; vencido = resultado desconocido (fail-closed)
 * @param sesionTtl      vida de la checkout session y del pago PENDIENTE; única fuente del "30 min"
 */
@ConfigurationProperties(prefix = "onvo.http")
public record OnvoHttpProperties(Duration connectTimeout, Duration readTimeout, Duration sesionTtl) {

    public static final Duration CONNECT_POR_DEFECTO = Duration.ofSeconds(5);
    public static final Duration READ_POR_DEFECTO = Duration.ofSeconds(15);
    public static final Duration TTL_POR_DEFECTO = Duration.ofMinutes(30);

    public OnvoHttpProperties {
        connectTimeout = positivo(connectTimeout, CONNECT_POR_DEFECTO);
        readTimeout = positivo(readTimeout, READ_POR_DEFECTO);
        sesionTtl = positivo(sesionTtl, TTL_POR_DEFECTO);
    }

    private static Duration positivo(Duration valor, Duration porDefecto) {
        return (valor == null || valor.isZero() || valor.isNegative()) ? porDefecto : valor;
    }
}
