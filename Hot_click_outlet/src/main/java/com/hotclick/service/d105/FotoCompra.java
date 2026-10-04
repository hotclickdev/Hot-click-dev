package com.hotclick.service.d105;

/** Bytes de la foto ya guardada. El content type sale de la extensión, no del cliente. */
public record FotoCompra(byte[] bytes, String contentType) {}
