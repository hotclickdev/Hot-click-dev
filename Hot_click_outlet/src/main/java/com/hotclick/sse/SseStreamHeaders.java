package com.hotclick.sse;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Cabeceras para que Nginx/proxies no buffericen ni compriman un SSE.
 * Sin {@code X-Accel-Buffering: no} el cliente ve
 * {@code net::ERR_INCOMPLETE_CHUNKED_ENCODING} al cortarse el chunked.
 */
public final class SseStreamHeaders {

    private SseStreamHeaders() {
    }

    public static void aplicar(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Connection", "keep-alive");
    }
}
