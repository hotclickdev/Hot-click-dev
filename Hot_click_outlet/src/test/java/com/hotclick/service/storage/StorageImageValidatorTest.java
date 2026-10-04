package com.hotclick.service.storage;

import com.hotclick.exception.ImagenOcupadaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    @DisplayName("FULL-01: PNG bomba de 20000×20000 se rechaza por header, sin decodificar")
    void pngBombaSeRechazaSinDecodificar() throws Exception {
        byte[] bomba = ImagenesDePrueba.pngBomba(20_000);
        assertThat(bomba.length).isLessThan(10 * 1024 * 1024); // pasa el tope de 10 MB
        assertThat(validator.tienesMagicBytesValidos("png", bomba)).isTrue();

        assertThatThrownBy(() -> validator.sanitizarImagen(bomba, "png"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(StorageImageValidator.MSG_DEMASIADO_GRANDE);
    }

    @Test
    @DisplayName("FULL-01: el tope también aplica a formatos que no se re-encodean (GIF)")
    void gifGrandeSeRechaza() throws Exception {
        // GIF89a con pantalla lógica e imagen de 20000×20000 (el lector usa el descriptor de imagen).
        byte[] gif = new byte[] {
            'G', 'I', 'F', '8', '9', 'a', 0x20, 0x4E, 0x20, 0x4E, 0x00, 0x00, 0x00,
            0x2C, 0x00, 0x00, 0x00, 0x00, 0x20, 0x4E, 0x20, 0x4E, 0x00,
            0x02, 0x02, 0x44, 0x01, 0x00, 0x3B };
        assertThatThrownBy(() -> validator.sanitizarImagen(gif, "gif"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(StorageImageValidator.MSG_DEMASIADO_GRANDE);
    }

    @Test
    @DisplayName("FULL-01: foto normal PNG y JPG sigue pasando y se re-encodea")
    void fotoNormalSiguePasando() throws Exception {
        for (String ext : new String[] {"png", "jpg"}) {
            byte[] original = ImagenesDePrueba.fotoNormal(ext);
            byte[] limpia = validator.sanitizarImagen(original, ext);
            BufferedImage leida = ImageIO.read(new ByteArrayInputStream(limpia));
            assertThat(leida).as(ext).isNotNull();
            assertThat(leida.getWidth()).isEqualTo(300);
            assertThat(leida.getHeight()).isEqualTo(200);
        }
    }

    @Test
    @DisplayName("FULL-01: imagen no decodificable se rechaza (sin fail-open)")
    void imagenCorruptaSinFailOpen() {
        byte[] jpegFalso = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x01, 0x02, 0x03, 0x04};
        assertThatThrownBy(() -> validator.sanitizarImagen(jpegFalso, "jpg"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(StorageImageValidator.MSG_NO_PROCESABLE);
    }

    @Test
    @DisplayName("R1: PNG RGBA de 16 bits de 30 MP (≈240 MB de raster) se rechaza por memoria estimada")
    void pngRgba16BitsSuperaPresupuestoDeBytes() throws Exception {
        byte[] png = ImagenesDePrueba.pngSoloCabecera(6_000, 5_000, 16, 6);
        assertThatThrownBy(() -> validator.verificarDimensiones(png))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(StorageImageValidator.MSG_DEMASIADO_GRANDE);
        // La misma geometría en gris de 8 bits (30 MB) entra en el presupuesto.
        validator.verificarDimensiones(ImagenesDePrueba.pngSoloCabecera(6_000, 5_000, 8, 0));
    }

    @Test
    @DisplayName("R1: sin permiso de decodificación libre → ImagenOcupadaException, y el permiso siempre se libera")
    void semaforoOcupadoNoDecodifica() throws Exception {
        byte[] foto = ImagenesDePrueba.fotoNormal("png");
        StorageImageValidator.DECODIFICACIONES.acquire(StorageImageValidator.PERMISOS_DECODIFICACION);
        try {
            assertThatThrownBy(() -> validator.sanitizarImagen(foto, "png"))
                .isInstanceOf(ImagenOcupadaException.class);
        } finally {
            StorageImageValidator.DECODIFICACIONES.release(StorageImageValidator.PERMISOS_DECODIFICACION);
        }
        // Una falla de decodificación también devuelve el permiso.
        byte[] jpegFalso = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x01, 0x02, 0x03, 0x04};
        assertThatThrownBy(() -> validator.sanitizarImagen(jpegFalso, "jpg"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(validator.sanitizarImagen(foto, "png")).isNotEmpty();
        assertThat(StorageImageValidator.DECODIFICACIONES.availablePermits())
            .isEqualTo(StorageImageValidator.PERMISOS_DECODIFICACION);
    }
}
