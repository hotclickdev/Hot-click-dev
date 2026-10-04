package com.hotclick.service.storage;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;
import java.util.zip.Deflater;
import java.util.zip.DeflaterOutputStream;

/** Imágenes para los tests de FULL-01 (bomba de descompresión). */
final class ImagenesDePrueba {

    private ImagenesDePrueba() {}

    /**
     * PNG válido de {@code lado}×{@code lado} px, gris de 1 bit y todo en cero: pesa ~200 KB
     * comprimido pero decodificarlo a RGB pide ~{@code lado² × 4} bytes. Se arma a mano, fila
     * por fila, para no crear nunca el {@link BufferedImage} gigante en el test.
     */
    static byte[] pngBomba(int lado) throws IOException {
        ByteArrayOutputStream idat = new ByteArrayOutputStream();
        try (DeflaterOutputStream z = new DeflaterOutputStream(idat, new Deflater(Deflater.BEST_COMPRESSION))) {
            byte[] fila = new byte[1 + (lado + 7) / 8]; // filtro 0 + píxeles de 1 bit
            for (int y = 0; y < lado; y++) z.write(fila);
        }
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        png.write(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
        ByteBuffer ihdr = ByteBuffer.allocate(13).putInt(lado).putInt(lado)
            .put((byte) 1).put((byte) 0).put((byte) 0).put((byte) 0).put((byte) 0);
        chunk(png, "IHDR", ihdr.array());
        chunk(png, "IDAT", idat.toByteArray());
        chunk(png, "IEND", new byte[0]);
        return png.toByteArray();
    }

    /**
     * PNG con header de {@code ancho}×{@code alto}, profundidad y tipo de color dados, y un IDAT
     * mínimo: alcanza para los chequeos por header (no se decodifica).
     */
    static byte[] pngSoloCabecera(int ancho, int alto, int bitsPorCanal, int tipoColor) throws IOException {
        ByteArrayOutputStream idat = new ByteArrayOutputStream();
        try (DeflaterOutputStream z = new DeflaterOutputStream(idat)) {
            z.write(new byte[16]);
        }
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        png.write(new byte[] {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'});
        ByteBuffer ihdr = ByteBuffer.allocate(13).putInt(ancho).putInt(alto)
            .put((byte) bitsPorCanal).put((byte) tipoColor).put((byte) 0).put((byte) 0).put((byte) 0);
        chunk(png, "IHDR", ihdr.array());
        chunk(png, "IDAT", idat.toByteArray());
        chunk(png, "IEND", new byte[0]);
        return png.toByteArray();
    }

    /** Foto normal (300×200) en el formato pedido ("png" o "jpg"). */
    static byte[] fotoNormal(String formato) throws IOException {
        BufferedImage img = new BufferedImage(300, 200, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.ORANGE);
        g.fillRect(0, 0, 300, 200);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, formato, out);
        return out.toByteArray();
    }

    private static void chunk(ByteArrayOutputStream out, String tipo, byte[] datos) throws IOException {
        byte[] t = tipo.getBytes(StandardCharsets.US_ASCII);
        out.write(ByteBuffer.allocate(4).putInt(datos.length).array());
        out.write(t);
        out.write(datos);
        CRC32 crc = new CRC32();
        crc.update(t);
        crc.update(datos);
        out.write(ByteBuffer.allocate(4).putInt((int) crc.getValue()).array());
    }
}
