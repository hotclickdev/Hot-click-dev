package com.hotclick.service.consola;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;

/**
 * HMAC-SHA256 de la IP con un pepper del servidor: la IP en claro nunca se guarda.
 * Pepper: {@code HOTCLICK_IP_PEPPER}; si no está, se usa el secreto JWT (ya obligatorio).
 */
@Component
public class IpConsentimientoHasher {

    private final byte[] pepper;

    public IpConsentimientoHasher(@Value("${hotclick.ip-pepper:${jwt.secret}}") String pepper) {
        if (pepper == null || pepper.isBlank()) throw new IllegalStateException("Falta el pepper de IP");
        this.pepper = ("ip-consentimiento:" + pepper).getBytes(StandardCharsets.UTF_8);
    }

    public String hash(String ip) {
        if (ip == null || ip.isBlank()) return null;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(ip.trim().getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
