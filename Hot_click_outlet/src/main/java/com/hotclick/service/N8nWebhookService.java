package com.hotclick.service;

import com.hotclick.config.N8nProperties;
import com.hotclick.model.CarritoAbandonado;
import com.hotclick.model.Pedido;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class N8nWebhookService {

    private static final Logger log = LoggerFactory.getLogger(N8nWebhookService.class);

    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    private N8nProperties props;

    @Async
    public void notificarPedidoNuevo(Pedido pedido) {
        String url = props.getPedidoNuevo();
        if (url.isBlank()) return;
        try {
            restTemplate.postForObject(url, buildPedidoPayload(pedido), Void.class);
        } catch (Exception e) {
            log.warn("n8n pedido-nuevo falló (no crítico): {}", e.getMessage());
        }
    }

    @Async
    public void notificarPedidoEntregado(Pedido pedido) {
        String url = props.getPedidoEntregado();
        if (url.isBlank()) return;
        try {
            restTemplate.postForObject(url, buildPedidoPayload(pedido), Void.class);
        } catch (Exception e) {
            log.warn("n8n pedido-entregado falló (no crítico): {}", e.getMessage());
        }
    }

    @Async
    public void notificarCarritoAbandonado(CarritoAbandonado carrito, List<Map<String, Object>> items) {
        String url = props.getCarritoAbandonado();
        if (url.isBlank()) return;
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("carritoId", carrito.getId());
            payload.put("email", carrito.getEmail());
            payload.put("sessionId", carrito.getSessionId());
            payload.put("items", items);
            payload.put("createdAt", carrito.getCreatedAt() != null ? carrito.getCreatedAt().toString() : null);
            restTemplate.postForObject(url, payload, Void.class);
        } catch (Exception e) {
            log.warn("n8n carrito-abandonado falló (no crítico): {}", e.getMessage());
        }
    }

    @Async
    public void notificarUsuarioRegistrado(String nombre, String correo, String telefono) {
        String url = props.getUsuarioRegistrado();
        if (url.isBlank()) return;
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("nombre", nombre);
            payload.put("correo", correo);
            payload.put("telefono", telefono);
            restTemplate.postForObject(url, payload, Void.class);
        } catch (Exception e) {
            log.warn("n8n usuario-registrado falló (no crítico): {}", e.getMessage());
        }
    }

    private Map<String, Object> buildPedidoPayload(Pedido pedido) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("numeroPedido", pedido.getNumeroPedido());
        payload.put("total", pedido.getTotalPedido());
        payload.put("estado", pedido.getEstadoPedido());
        payload.put("metodoPago", pedido.getMetodoPago());
        payload.put("fecha", pedido.getFechaPedido() != null ? pedido.getFechaPedido().toString() : null);

        if (pedido.getUsuarioFinal() != null) {
            payload.put("clienteNombre", pedido.getUsuarioFinal().getNombre());
            payload.put("clienteCorreo", pedido.getUsuarioFinal().getCorreo());
            payload.put("clienteTelefono", pedido.getUsuarioFinal().getTelefono());
        }

        if (pedido.getItems() != null) {
            List<String> nombres = pedido.getItems().stream()
                .map(item -> item.getProducto() != null ? item.getProducto().getNombreProducto() : "?")
                .collect(Collectors.toList());
            payload.put("productos", nombres);
            payload.put("cantidadItems", pedido.getItems().size());
        }

        return payload;
    }
}
