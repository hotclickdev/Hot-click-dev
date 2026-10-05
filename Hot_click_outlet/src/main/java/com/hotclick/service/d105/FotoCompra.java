package com.hotclick.service.d105;

/** Bytes de la foto ya guardada. El content type sale de la extensión, no del cliente. */
public final class FotoCompra {

    private final byte[] bytes;
    private final String contentType;

    public FotoCompra(byte[] bytes, String contentType) {
        this.bytes = bytes;
        this.contentType = contentType;
    }

    public byte[] bytes() {
        return bytes;
    }

    public String contentType() {
        return contentType;
    }
}
