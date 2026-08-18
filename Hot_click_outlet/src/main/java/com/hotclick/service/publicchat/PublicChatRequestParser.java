package com.hotclick.service.publicchat;

import java.util.Map;

/**
 * Lee campos opcionales del body del chat público. El id de producto no se
 * toma del string de contexto: eso lo puede falsificar el cliente.
 */
public final class PublicChatRequestParser {

    private PublicChatRequestParser() {}

    public static Long productoId(Map<String, Object> body) {
        if (body == null) return null;
        Object raw = body.get("productoId");
        if (!(raw instanceof Number n)) return null;
        long id = n.longValue();
        return id > 0 ? id : null;
    }
}
