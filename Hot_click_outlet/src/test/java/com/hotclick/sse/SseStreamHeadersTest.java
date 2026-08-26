package com.hotclick.sse;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DisplayName("Cabeceras SSE para proxies")
class SseStreamHeadersTest {

    @Test
    @DisplayName("Nginx no debe bufferizar el stream")
    void aplicaCabecerasAntiBuffer() {
        HttpServletResponse response = mock(HttpServletResponse.class);

        SseStreamHeaders.aplicar(response);

        verify(response).setHeader("Cache-Control", "no-cache, no-transform");
        verify(response).setHeader("X-Accel-Buffering", "no");
        verify(response).setHeader("Connection", "keep-alive");
    }
}
