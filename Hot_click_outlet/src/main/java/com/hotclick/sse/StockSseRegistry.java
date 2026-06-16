package com.hotclick.sse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Registro thread-safe de conexiones SSE agrupadas por "empresaId:productoId".
 * La clave compuesta garantiza que un broadcast de un tenant nunca llegue a
 * una conexión registrada bajo otro tenant, aunque el productoId coincida.
 */
@Component
public class StockSseRegistry {

    private static final Logger log = LoggerFactory.getLogger(StockSseRegistry.class);

    private final ConcurrentHashMap<String, CopyOnWriteArraySet<SseEmitter>> registry =
        new ConcurrentHashMap<>();

    private final AtomicInteger activeConnections = new AtomicInteger(0);

    public SseEmitter register(Long empresaId, Long productoId) {
        SseEmitter emitter = new SseEmitter(0L); // sin timeout — el heartbeat mantiene viva la conexión
        String key = key(empresaId, productoId);
        registry.computeIfAbsent(key, k -> new CopyOnWriteArraySet<>()).add(emitter);
        activeConnections.incrementAndGet();

        Runnable cleanup = () -> {
            CopyOnWriteArraySet<SseEmitter> set = registry.get(key);
            if (set != null) {
                set.remove(emitter);
                if (set.isEmpty()) registry.remove(key, set);
            }
            activeConnections.decrementAndGet();
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(ex -> cleanup.run());

        log.debug("SSE suscrito — key={} conexionesActivas={}", key, activeConnections.get());
        return emitter;
    }

    public void broadcast(Long empresaId, Long productoId, Integer stockActual) {
        String key = key(empresaId, productoId);
        Set<SseEmitter> emitters = registry.get(key);
        if (emitters == null || emitters.isEmpty()) return;

        String payload = "{\"id_producto\":" + productoId + ",\"stock_actual\":" + stockActual + "}";

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("stock").data(payload));
            } catch (IOException | IllegalStateException ex) {
                emitter.completeWithError(ex);
            }
        }
        log.debug("SSE broadcast — key={} suscriptores={} stockActual={}", key, emitters.size(), stockActual);
    }

    /** Comentario SSE cada 25s — evita que proxies/Render cierren la conexión por inactividad. */
    @Scheduled(fixedDelay = 25_000)
    public void heartbeat() {
        if (registry.isEmpty()) return;
        registry.forEach((key, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (IOException | IllegalStateException ex) {
                    emitter.completeWithError(ex);
                }
            }
        });
    }

    private String key(Long empresaId, Long productoId) {
        return empresaId + ":" + productoId;
    }
}
