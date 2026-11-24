package com.hotclick.agente.interno;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * HMAC-SHA256 para el teléfono y el código de vinculación: ni uno ni otro se guardan en claro. La llave sale de
 * {@code agente.interno.pepper} (variable AGENTE_INTERNO_PEPPER); sin ella se usa una llave fija de desarrollo.
 */
@Component
public class HasherInterno {

    private static final byte[] LLAVE_DEV = "hotclick-dev-agente-interno".getBytes(StandardCharsets.UTF_8);

    private final byte[] llave;

    public HasherInterno(@Value("${agente.interno.pepper:}") String pepper) {
        this.llave = pepper == null || pepper.isBlank() ? LLAVE_DEV : pepper.getBytes(StandardCharsets.UTF_8);
    }

    public String contacto(Long empresaId, String canal, String contacto) {
        return hmac("c|" + empresaId + "|" + canal + "|" + soloDigitos(contacto));
    }

    public String codigo(Long empresaId, String codigo) {
        return hmac("k|" + empresaId + "|" + (codigo == null ? "" : codigo.trim().toUpperCase(java.util.Locale.ROOT)));
    }

    public static String ultimos4(String contacto) {
        String d = soloDigitos(contacto);
        return d.length() <= 4 ? d : d.substring(d.length() - 4);
    }

    private static String soloDigitos(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }

    /** Comparación en tiempo constante. */
    public static boolean iguales(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private String hmac(String dato) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(llave, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(dato.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 no disponible", e);
        }
    }
}
