package com.hotclick.service;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class TwoFactorService {

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator(32);
    private final CodeVerifier    codeVerifier;

    public TwoFactorService() {
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, new SystemTimeProvider());
        // Tolerancia de ±1 periodo (30s): cubre desfases de reloj normales
        verifier.setAllowedTimePeriodDiscrepancy(1);
        this.codeVerifier = verifier;
    }

    /** Genera un secret Base32 aleatorio de 32 caracteres. */
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /**
     * Construye la URI otpauth:// compatible con Google Authenticator.
     * Formato: otpauth://totp/<label>?secret=<secret>&issuer=<issuer>
     */
    public String buildQrUri(String correo, String secret) {
        String label = "HOTCLICK:" + URLEncoder.encode(correo, StandardCharsets.UTF_8);
        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=HOTCLICK"
                + "&algorithm=SHA1"
                + "&digits=6"
                + "&period=30";
    }

    /**
     * Verifica el código TOTP de 6 dígitos contra el secret del usuario.
     * Retorna false si el código es nulo, tiene longitud incorrecta o no coincide.
     */
    public boolean verifyCode(String secret, String code) {
        if (secret == null || code == null || code.isBlank()) return false;
        String trimmed = code.replaceAll("\\s+", "");
        if (trimmed.length() != 6 || !trimmed.matches("\\d+")) return false;
        try {
            return codeVerifier.isValidCode(secret, trimmed);
        } catch (Exception e) {
            return false;
        }
    }
}
