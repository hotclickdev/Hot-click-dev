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
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TwoFactorService {

    private static final String   RECOVERY_CHARS  = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int      RECOVERY_COUNT  = 8;
    private final SecretGenerator secretGenerator = new DefaultSecretGenerator(32);
    private final SecureRandom    secureRandom    = new SecureRandom();
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

    // ── Recovery codes ────────────────────────────────────────────────────────

    /** Genera 8 códigos de recuperación en formato XXXXX-XXXXX. */
    public List<String> generateRecoveryCodes() {
        List<String> codes = new ArrayList<>(RECOVERY_COUNT);
        for (int i = 0; i < RECOVERY_COUNT; i++) {
            StringBuilder sb = new StringBuilder(11);
            for (int j = 0; j < 5; j++) sb.append(RECOVERY_CHARS.charAt(secureRandom.nextInt(RECOVERY_CHARS.length())));
            sb.append('-');
            for (int j = 0; j < 5; j++) sb.append(RECOVERY_CHARS.charAt(secureRandom.nextInt(RECOVERY_CHARS.length())));
            codes.add(sb.toString());
        }
        return codes;
    }

    /** Serializa una lista de hashes a JSON array plano. */
    public String codesToJson(List<String> hashedCodes) {
        return "[" + hashedCodes.stream()
                .map(c -> "\"" + c.replace("\\", "\\\\").replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",")) + "]";
    }

    /** Deserializa el JSON array de hashes almacenado en BD. */
    public List<String> jsonToCodes(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return new ArrayList<>();
        String stripped = json.trim().replaceAll("^\\[|\\]$", "").trim();
        if (stripped.isEmpty()) return new ArrayList<>();
        return Arrays.stream(stripped.split(","))
                .map(s -> s.trim().replaceAll("^\"|\"$", ""))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    /** Normaliza un código de recuperación: mayúsculas, sin guiones ni espacios. */
    public String normalizeRecoveryCode(String code) {
        return code.toUpperCase().replaceAll("[^A-Z0-9]", "");
    }
}
