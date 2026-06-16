package com.hotclick.sse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.CopyOnWriteArraySet;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * StockChangeListener despacha StockCambioEvent hacia StockSseRegistry, cuya
 * clave compuesta "empresaId:productoId" es la barrera de aislamiento
 * multi-tenant (ver StockSseRegistry.broadcast). Estas pruebas inyectan un
 * SseEmitter mockeado directamente en el mapa interno del registry —vía
 * reflection, porque register() solo entrega instancias reales— para poder
 * verificar con certeza si send() fue invocado o no.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StockChangeListener — aislamiento multi-tenant en broadcast SSE")
class StockEventListenerTest {

    private static final Long PRODUCTO_ID      = 100L;
    private static final Long EMPRESA_ID       = 1L;
    private static final Long OTRA_EMPRESA_ID  = 2L;
    private static final Integer STOCK_ACTUAL  = 42;

    @Mock
    private SseEmitter emitter;

    private StockSseRegistry registry;
    private StockChangeListener listener;

    @BeforeEach
    void setUp() {
        registry = new StockSseRegistry();
        listener = new StockChangeListener(registry);

        // El emitter mock queda suscrito únicamente al canal "EMPRESA_ID:PRODUCTO_ID".
        registrarEmitterMock(EMPRESA_ID, PRODUCTO_ID, emitter);
    }

    @Test
    @DisplayName("Caso feliz: evento con la empresaId del canal → emitter.send() se invoca")
    void onStockCambio_mismaEmpresa_enviaActualizacionAlEmitterSuscrito() throws Exception {
        StockCambioEvent evento = new StockCambioEvent(this, PRODUCTO_ID, EMPRESA_ID, STOCK_ACTUAL);

        listener.onStockCambio(evento);

        verify(emitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("Aislamiento: evento con empresaId distinta a la del canal → emitter.send() nunca se invoca")
    void onStockCambio_empresaDistinta_noFiltraHaciaOtroTenant() throws Exception {
        StockCambioEvent eventoDeOtraEmpresa =
            new StockCambioEvent(this, PRODUCTO_ID, OTRA_EMPRESA_ID, STOCK_ACTUAL);

        listener.onStockCambio(eventoDeOtraEmpresa);

        verify(emitter, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("Evento con empresaId null → se descarta antes de tocar el registry, sin llamar al emitter")
    void onStockCambio_empresaIdNull_seDescartaSinPropagar() {
        StockCambioEvent eventoSinEmpresa = new StockCambioEvent(this, PRODUCTO_ID, null, STOCK_ACTUAL);

        listener.onStockCambio(eventoSinEmpresa);

        verifyNoInteractions(emitter);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void registrarEmitterMock(Long empresaId, Long productoId, SseEmitter mockEmitter) {
        Map<String, CopyOnWriteArraySet<SseEmitter>> mapaInterno =
            (Map<String, CopyOnWriteArraySet<SseEmitter>>) ReflectionTestUtils.getField(registry, "registry");

        CopyOnWriteArraySet<SseEmitter> suscriptoresDelCanal = new CopyOnWriteArraySet<>();
        suscriptoresDelCanal.add(mockEmitter);
        mapaInterno.put(empresaId + ":" + productoId, suscriptoresDelCanal);
    }
}
