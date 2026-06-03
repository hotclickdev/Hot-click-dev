package com.hotclick.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

/**
 * AES-256-GCM encryption for TOTP secrets at rest.
 *
 * Format: ENC:<base64(12-byte-IV + ciphertext + 16-byte-GCM-tag)>
 *
 * Backward compat: if a stored value does NOT start with "ENC:",
 * it is treated as a legacy plaintext secret and returned as-is.
 * This allows transparent migration without downtime.
 *
 * Key: 64-char hex string (32 bytes) from ${TOTP_ENCRYPTION_KEY} env var.
 * If the key is not configured, secrets are stored unencrypted
 * and a WARN is logged — acceptable for local dev, NOT for production.
 */
@Service
public class TotpSecretEncryptionService {

    private static final Logger log = LoggerFactory.getLogger(TotpSecretEncryptionService.class);

    private static final String  PREFIX    = "ENC:";
    private static final String  ALGORITHM = "AES/GCM/NoPadding";
    private static final int     IV_LEN    = 12;   // 96-bit IV recommended for GCM
    private static final int     TAG_BITS  = 128;  // 128-bit authentication tag

    @Value("${totp.encryption.key:}")
    private String encryptionKeyHex;

    @PostConstruct
    void validate() {
        String profile = System.getProperty("spring.profiles.active", "");
        if (!profile.contains("dev") && !profile.contains("test")
                && (encryptionKeyHex == null || encryptionKeyHex.isBlank())) {
            throw new IllegalStateException(
                "TOTP_ENCRYPTION_KEY debe configurarse en producción (totp.encryption.key)");
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Encrypts a plaintext TOTP secret.
     * Returns ENC:... if a key is configured; plaintext with a warning otherwise.
     */
    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        SecretKey key = resolveKey();
        if (key == null) {
            log.warn("[2FA] TOTP_ENCRYPTION_KEY not set — storing secret UNENCRYPTED. Set the key in production.");
            return plaintext;
        }
        try {
            byte[] iv         = generateIv();
            Cipher cipher     = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Combine IV + ciphertext-with-tag into a single blob
            byte[] combined = new byte[IV_LEN + ciphertext.length];
            System.arraycopy(iv,         0, combined, 0,      IV_LEN);
            System.arraycopy(ciphertext, 0, combined, IV_LEN, ciphertext.length);
            return PREFIX + Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("[2FA] Encryption failed: {}", e.getMessage());
            throw new IllegalStateException("Failed to encrypt TOTP secret", e);
        }
    }

    /**
     * Decrypts a stored TOTP secret.
     * If the value is plaintext (no ENC: prefix), returns it unchanged — legacy support.
     * Throws if the key is required but not configured.
     */
    public String decrypt(String stored) {
        if (stored == null) return null;
        if (!stored.startsWith(PREFIX)) {
            // Legacy plaintext — return as-is
            return stored;
        }
        SecretKey key = resolveKey();
        if (key == null) {
            throw new IllegalStateException(
                "TOTP_ENCRYPTION_KEY is not configured but an encrypted secret was found. " +
                "Set the env var to decrypt.");
        }
        try {
            byte[] combined   = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            byte[] iv         = Arrays.copyOf(combined, IV_LEN);
            byte[] ciphertext = Arrays.copyOfRange(combined, IV_LEN, combined.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("[2FA] Decryption failed — key mismatch or corrupt ciphertext: {}", e.getMessage());
            throw new IllegalStateException("Failed to decrypt TOTP secret", e);
        }
    }

    /** Returns true if the stored value is encrypted with the current key. */
    public boolean isEncrypted(String stored) {
        return stored != null && stored.startsWith(PREFIX);
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private SecretKey resolveKey() {
        if (encryptionKeyHex == null || encryptionKeyHex.isBlank()) return null;
        try {
            byte[] keyBytes = HexFormat.of().parseHex(encryptionKeyHex.trim());
            if (keyBytes.length != 32)
                throw new IllegalArgumentException("TOTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes / 256 bits)");
            return new SecretKeySpec(keyBytes, "AES");
        } catch (IllegalArgumentException e) {
            log.error("[2FA] Invalid TOTP_ENCRYPTION_KEY: {}", e.getMessage());
            throw new IllegalStateException("Invalid TOTP encryption key configuration", e);
        }
    }

    private byte[] generateIv() {
        byte[] iv = new byte[IV_LEN];
        new SecureRandom().nextBytes(iv);
        return iv;
    }
}
