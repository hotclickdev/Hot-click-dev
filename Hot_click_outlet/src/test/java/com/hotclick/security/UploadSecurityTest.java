package com.hotclick.security;

import com.hotclick.service.SupabaseStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;

/**
 * OWASP A04 / A08 — Insecure File Upload.
 *
 * Verifica que la lógica de validación de SupabaseStorageService:
 *  - Rechaza extensiones peligrosas (SVG, PHP, EXE).
 *  - Rechaza archivos cuyo contenido no coincide con su extensión (MIME spoofing).
 *  - Acepta imágenes reales (JPEG, PNG, WebP, GIF) con magic bytes válidos.
 *  - Acepta application/octet-stream (iOS Safari / navegadores móviles).
 *  - Rechaza archivos que exceden 10 MB.
 *
 * La validación se prueba directamente sin llamar a Supabase real,
 * invocando el método privado `validarArchivo` vía reflexión.
 */
@DisplayName("[OWASP A04/A08] File upload security — SupabaseStorageService")
class UploadSecurityTest {

    private SupabaseStorageService service;

    // Minimal real-image headers for each allowed format
    private static final byte[] JPEG_MAGIC  = { (byte)0xFF, (byte)0xD8, (byte)0xFF, (byte)0xE0, 0x00, 0x10 };
    private static final byte[] PNG_MAGIC   = { (byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
    private static final byte[] GIF_MAGIC   = { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61 }; // GIF89a
    private static final byte[] WEBP_MAGIC;

    static {
        // RIFF....WEBP (12-byte header)
        byte[] riff = { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00 };
        byte[] webp = { 0x57, 0x45, 0x42, 0x50 };
        WEBP_MAGIC = new byte[12];
        System.arraycopy(riff, 0, WEBP_MAGIC, 0, 8);
        System.arraycopy(webp, 0, WEBP_MAGIC, 8, 4);
    }

    private static final byte[] EXE_MAGIC  = { 0x4D, 0x5A, 0x00, 0x00 }; // MZ — Windows EXE
    private static final byte[] PHP_BYTES  = "<?php system($_GET['cmd']); ?>".getBytes();
    private static final byte[] WAV_MAGIC  = { 0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
                                               0x57, 0x41, 0x56, 0x45 }; // RIFF....WAVE

    @BeforeEach
    void setUp() {
        service = new SupabaseStorageService(mock(S3Client.class));
        ReflectionTestUtils.setField(service, "bucket",    "fake-bucket");
        ReflectionTestUtils.setField(service, "publicUrl", "https://fake.s3.amazonaws.com");
    }

    // ── Extension allowlist ──────────────────────────────────────────────────

    @Test
    @DisplayName("SVG upload → rejected (not in extension allowlist)")
    void svgUpload_rejected() {
        var file = new MockMultipartFile("file", "payload.svg", "image/svg+xml",
            "<svg><script>alert(1)</script></svg>".getBytes());
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Formato no permitido");
    }

    @Test
    @DisplayName("PHP file with non-image MIME → rejected by MIME check")
    void phpMimeType_rejected() {
        // Tests MIME validation path — application/x-php is clearly non-image
        var file = new MockMultipartFile("file", "shell.php", "application/x-php", PHP_BYTES);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("imágenes");
    }

    @Test
    @DisplayName("PHP with octet-stream MIME (bypass attempt) + .php extension → rejected by extension allowlist")
    void phpExtension_withOctetStream_rejected() {
        // Attacker sends octet-stream to bypass MIME check; extension allowlist catches it
        var file = new MockMultipartFile("file", "shell.php", "application/octet-stream", PHP_BYTES);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Formato no permitido");
    }

    @Test
    @DisplayName("EXE file with .exe extension + octet-stream → rejected by extension allowlist")
    void exeExtension_rejected() {
        var file = new MockMultipartFile("file", "malware.exe", "application/octet-stream", EXE_MAGIC);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Formato no permitido");
    }

    @Test
    @DisplayName("File with no extension → rejected (no fallback to jpg)")
    void noExtension_rejected() {
        var file = new MockMultipartFile("file", "noextension", "application/octet-stream", JPEG_MAGIC);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Formato no permitido");
    }

    // ── MIME type spoofing (magic bytes) ─────────────────────────────────────

    @Test
    @DisplayName("EXE bytes disguised as JPEG → rejected by magic bytes check")
    void exeAsJpeg_magicBytesMismatch_rejected() {
        var file = new MockMultipartFile("file", "not-image.jpg", "image/jpeg", EXE_MAGIC);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no coincide");
    }

    @Test
    @DisplayName("PHP bytes disguised as PNG → rejected by magic bytes check")
    void phpAsPng_magicBytesMismatch_rejected() {
        var file = new MockMultipartFile("file", "xss.png", "image/png", PHP_BYTES);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no coincide");
    }

    @Test
    @DisplayName("WAV audio (RIFF) disguised as WebP → rejected: RIFF ok but WEBP marker missing")
    void wavAsWebp_rejected() {
        var file = new MockMultipartFile("file", "audio.webp", "image/webp", WAV_MAGIC);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("no coincide");
    }

    @Test
    @DisplayName("Empty file → rejected")
    void emptyFile_rejected() {
        var file = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class);
    }

    // ── Valid files accepted ─────────────────────────────────────────────────

    @Test
    @DisplayName("Valid JPEG file → accepted")
    void validJpeg_accepted() {
        var file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", JPEG_MAGIC);
        assertThatNoException().isThrownBy(() -> invokeValidar(file));
    }

    @Test
    @DisplayName("Valid PNG file → accepted")
    void validPng_accepted() {
        var file = new MockMultipartFile("file", "logo.png", "image/png", PNG_MAGIC);
        assertThatNoException().isThrownBy(() -> invokeValidar(file));
    }

    @Test
    @DisplayName("Valid GIF file → accepted")
    void validGif_accepted() {
        var file = new MockMultipartFile("file", "anim.gif", "image/gif", GIF_MAGIC);
        assertThatNoException().isThrownBy(() -> invokeValidar(file));
    }

    @Test
    @DisplayName("Valid WebP file → accepted")
    void validWebp_accepted() {
        var file = new MockMultipartFile("file", "img.webp", "image/webp", WEBP_MAGIC);
        assertThatNoException().isThrownBy(() -> invokeValidar(file));
    }

    @Test
    @DisplayName("JPEG with application/octet-stream (iOS Safari) → accepted by magic bytes")
    void jpegAsOctetStream_accepted() {
        var file = new MockMultipartFile("file", "photo.jpg", "application/octet-stream", JPEG_MAGIC);
        assertThatNoException().isThrownBy(() -> invokeValidar(file));
    }

    // ── Size limit ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("File over 10 MB → rejected")
    void oversizedFile_rejected() {
        byte[] big = new byte[10 * 1024 * 1024 + 1];
        // Copy JPEG header to avoid magic bytes rejection
        System.arraycopy(JPEG_MAGIC, 0, big, 0, JPEG_MAGIC.length);
        var file = new MockMultipartFile("file", "huge.jpg", "image/jpeg", big);
        assertThatThrownBy(() -> invokeValidar(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("10 MB");
    }

    // ── Helper — calls the private validarArchivo method ────────────────────

    private byte[] invokeValidar(MockMultipartFile file) throws Exception {
        try {
            return (byte[]) ReflectionTestUtils.invokeMethod(service, "validarArchivo", file);
        } catch (IllegalStateException e) {
            // ReflectionTestUtils wraps the real exception; unwrap it
            if (e.getCause() instanceof IllegalArgumentException iae) throw iae;
            throw e;
        }
    }
}
