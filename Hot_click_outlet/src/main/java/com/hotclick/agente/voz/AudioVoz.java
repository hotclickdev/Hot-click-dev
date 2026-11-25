package com.hotclick.agente.voz;

/**
 * Audio descargado, solo en memoria (nunca se escribe a disco). {@code toString} no imprime los bytes.
 *
 * @param bytes contenido del audio
 * @param mime  tipo MIME normalizado, sin parámetros (p. ej. {@code audio/ogg})
 */
public record AudioVoz(byte[] bytes, String mime) {
    @Override
    public boolean equals(Object o) {
        return o instanceof AudioVoz(byte[] otrosBytes, String otroMime) && java.util.Arrays.equals(bytes, otrosBytes)
            && java.util.Objects.equals(mime, otroMime);
    }

    @Override
    public int hashCode() {
        return 31 * java.util.Arrays.hashCode(bytes) + java.util.Objects.hashCode(mime);
    }

    @Override
    public String toString() {
        return "AudioVoz[" + mime + "," + (bytes == null ? 0 : bytes.length) + " bytes]";
    }
}
