package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * TOTP 2FA service (RFC 6238).
 *
 * Security properties:
 *  - Secrets are AES-256-GCM encrypted at rest via TotpSecretEncryptionService.
 *  - Replay protection: a used TOTP code is rejected again within the tolerance window.
 *  - Tolerance: ±1 period (30s) covers typical clock skew without being exploitable.
 *  - Recovery codes: generated with SecureRandom, hashed with BCrypt by the caller.
 */
@Service
public class TwoFactorService {

    private static final Logger log = LoggerFactory.getLogger(TwoFactorService.class);

    private static final String RECOVERY_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int    RECOVERY_COUNT = 8;

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator(32);
    private final SecureRandom    secureRandom    = new SecureRandom();
    private final CodeVerifier    codeVerifier;

    @Autowired private TotpSecretEncryptionService encryptionService;
    @Autowired private UsuarioRepository           usuarioRepository;

    public TwoFactorService() {
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, new SystemTimeProvider());
        verifier.setAllowedTimePeriodDiscrepancy(1);  // ±1 × 30s window
        this.codeVerifier = verifier;
    }

    // ── Secret lifecycle ──────────────────────────────────────────────────────

    /**
     * Generates a new TOTP secret (plaintext Base32) for QR display.
     * The caller must encrypt it before persistence using encryptForStorage().
     */
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /**
     * Encrypts a plaintext Base32 secret for DB storage.
     * Use this right before saving to Usuario.twoFactorSecret.
     */
    public String encryptForStorage(String plaintextSecret) {
        return encryptionService.encrypt(plaintextSecret);
    }

    /**
     * Decrypts a stored secret (handles legacy plaintext transparently).
     */
    public String decryptForVerification(String storedSecret) {
        return encryptionService.decrypt(storedSecret);
    }

    // ── QR / URI ──────────────────────────────────────────────────────────────

    /** Constructs an otpauth:// URI for QR provisioning. */
    public String buildQrUri(String correo, String plaintextSecret) {
        String label = "HOTCLICK:" + URLEncoder.encode(correo, StandardCharsets.UTF_8);
        return "otpauth://totp/" + label
            + "?secret=" + plaintextSecret
            + "&issuer=HOTCLICK"
            + "&algorithm=SHA1"
            + "&digits=6"
            + "&period=30";
    }

    // ── Verification ──────────────────────────────────────────────────────────

    /**
     * Verifies a TOTP code against a stored (possibly encrypted) secret.
     * Does NOT perform replay protection — use verifyCodeWithReplayProtection for login.
     */
    public boolean verifyCode(String storedSecret, String code) {
        if (storedSecret == null || code == null || code.isBlank()) return false;
        String trimmed = code.replaceAll("\\s+", "");
        if (trimmed.length() != 6 || !trimmed.matches("\\d+")) return false;
        try {
            String plaintext = encryptionService.decrypt(storedSecret);
            return codeVerifier.isValidCode(plaintext, trimmed);
        } catch (Exception e) {
            log.warn("[2FA] TOTP verify error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verifies a TOTP code AND enforces replay protection.
     *
     * Returns false if:
     *  - code is cryptographically invalid
     *  - code was already used within the replay window (90s)
     *
     * On success, persists the used code to block replays.
     * Must be called inside a transaction.
     */
    @Transactional
    public boolean verifyCodeWithReplayProtection(Usuario usuario, String code) {
        if (!verifyCode(usuario.getTwoFactorSecret(), code)) return false;

        // Replay check: same code + within tolerance window?
        String trimmed = code.replaceAll("\\s+", "");
        if (trimmed.equals(usuario.getTotpLastUsedOtp())
                && usuario.getTotpLastUsedAt() != null
                && usuario.getTotpLastUsedAt().isAfter(
                    LocalDateTime.now(Constants.ZONA_CR).minusSeconds(Constants.TOTP_REPLAY_WINDOW_SECONDS))) {
            log.warn("[2FA] TOTP replay attack detected for userId={}", usuario.getId());
            return false;
        }

        // Persist used code to block replay
        usuarioRepository.updateTotpReplayProtection(usuario.getId(), trimmed, LocalDateTime.now(Constants.ZONA_CR));
        return true;
    }

    // ── Recovery codes ────────────────────────────────────────────────────────

    /** Generates 8 single-use recovery codes in XXXXX-XXXXX format. */
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

    /** Serializes a list of hashed codes to a JSON array string for DB storage. */
    public String codesToJson(List<String> hashedCodes) {
        return "[" + hashedCodes.stream()
            .map(c -> "\"" + c.replace("\\", "\\\\").replace("\"", "\\\"") + "\"")
            .collect(Collectors.joining(",")) + "]";
    }

    /** Deserializes the JSON array of hashed codes stored in DB. */
    public List<String> jsonToCodes(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return new ArrayList<>();
        String stripped = json.trim().replaceAll("^\\[|\\]$", "").trim();
        if (stripped.isEmpty()) return new ArrayList<>();
        return Arrays.stream(stripped.split(","))
            .map(s -> s.trim().replaceAll("^\"|\"$", ""))
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());
    }

    /** Normalizes a recovery code to uppercase, stripped of separators. */
    public String normalizeRecoveryCode(String code) {
        return code.toUpperCase().replaceAll("[^A-Z0-9]", "");
    }
}
