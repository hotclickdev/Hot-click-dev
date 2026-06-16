package com.hotclick.controller;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.sse.StockSseRegistry;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

/**
 * Stream SSE público de stock por producto, para la tienda web.
 * El tenant se infiere del producto (no del caller, que no tiene JWT en
 * EventSource) — evita que una conexión reciba actualizaciones de otra empresa.
 */
@RestController
@RequestMapping("/api/marketplace")
public class StockNotificationController {

    private final ProductoRepository productoRepository;
    private final StockSseRegistry   registry;

    public StockNotificationController(ProductoRepository productoRepository, StockSseRegistry registry) {
        this.productoRepository = productoRepository;
        this.registry = registry;
    }

    @GetMapping(value = "/productos/{productoId}/stock-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stockStream(@PathVariable Long productoId) {
        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));

        Long empresaId = producto.getEmpresaId();
        if (empresaId == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Producto sin empresa asociada");
        }

        SseEmitter emitter = registry.register(empresaId, productoId);

        try {
            String snapshot = "{\"id_producto\":" + productoId + ",\"stock_actual\":" + producto.getStockActual() + "}";
            emitter.send(SseEmitter.event().name("stock").data(snapshot));
        } catch (IOException ex) {
            emitter.completeWithError(ex);
        }

        return emitter;
    }
}
