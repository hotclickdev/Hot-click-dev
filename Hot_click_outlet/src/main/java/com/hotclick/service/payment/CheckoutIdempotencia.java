package com.hotclick.service.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * QA-CONC-2: doble clic en «Pagar» creaba N pedidos y N reservas. El mismo checkout (misma identidad,
 * misma ruta, mismo cuerpo, o el mismo encabezado Idempotency-Key) dentro de la ventana devuelve la
 * respuesta del primero; una petición simultánea espera a la primera en vez de crear otro pedido.
 * Los errores no se guardan: reintentar después de un 4xx/5xx vuelve a ejecutar.
 */
@Component
public class CheckoutIdempotencia {

    static final long VENTANA_MS = 60_000;
    private static final int MAX_ENTRADAS = 10_000;

    private record Entrada(long creada, CompletableFuture<ResponseEntity<?>> futuro) {}

    private final Map<String, Entrada> entradas = new ConcurrentHashMap<>();
    private final ObjectMapper mapper;

    public CheckoutIdempotencia(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String clave(String ruta, String identidad, String encabezado, Object cuerpo) {
        try {
            // Con encabezado, la clave es encabezado + cuerpo: la misma clave con otro carrito es otro pago.
            String base = (encabezado != null && !encabezado.isBlank() ? "k:" + encabezado.trim() + "|" : "")
                + "b:" + mapper.writeValueAsString(cuerpo);
            byte[] h = MessageDigest.getInstance("SHA-256")
                .digest((ruta + "|" + identidad + "|" + base).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h);
        } catch (Exception e) {
            return null; // sin clave → se ejecuta normal
        }
    }

    @SuppressWarnings("unchecked")
    public <T> ResponseEntity<T> ejecutar(String clave, Supplier<ResponseEntity<T>> accion) {
        if (clave == null) return accion.get();
        long ahora = System.currentTimeMillis();
        limpiar(ahora);
        CompletableFuture<ResponseEntity<?>> mio = new CompletableFuture<>();
        Entrada previa = entradas.compute(clave, (k, e) ->
            (e == null || ahora - e.creada() > VENTANA_MS) ? new Entrada(ahora, mio) : e);
        if (previa.futuro() != mio) {
            return (ResponseEntity<T>) previa.futuro().join();
        }
        try {
            ResponseEntity<T> r = accion.get();
            mio.complete(r);
            if (!r.getStatusCode().is2xxSuccessful()) entradas.remove(clave, previa);
            return r;
        } catch (RuntimeException e) {
            entradas.remove(clave, previa);
            mio.completeExceptionally(e);
            throw e;
        }
    }

    private void limpiar(long ahora) {
        if (entradas.size() < MAX_ENTRADAS / 2) {
            entradas.values().removeIf(e -> e.futuro().isDone() && ahora - e.creada() > VENTANA_MS);
            return;
        }
        entradas.values().removeIf(e -> e.futuro().isDone());
    }
}
