package com.hotclick.service.storage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Magic bytes de imagen")
class StorageImageValidatorTest {

    private final StorageImageValidator validator = new StorageImageValidator();

    @Test
    @DisplayName("JPEG por contenido, no por Content-Type")
    void jpegValido() {
        byte[] jpeg = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};
        assertThat(validator.esImagenPorContenido(jpeg)).isTrue();
        assertThat(validator.esImagenPorContenido("not-an-image".getBytes())).isFalse();
        assertThat(validator.esImagenPorContenido(new byte[] {0x00, 0x01})).isFalse();
    }
}
