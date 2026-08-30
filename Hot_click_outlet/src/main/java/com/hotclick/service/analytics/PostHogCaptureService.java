package com.hotclick.service.analytics;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Captura server-side de eventos de dinero. El navegador pierde pedido_pagado
 * por adblockers y cierres de pestaña; el webhook no.
 */
@Service
public class PostHogCaptureService {

    private static final Logger log = LoggerFactory.getLogger(PostHogCaptureService.class);
    private static final String EVENTO_PEDIDO_PAGADO = "pedido_pagado";

    private final RestTemplate restTemplate;
    private final String token;
    private final String host;

    public PostHogCaptureService(
            RestTemplate restTemplate,
            @Value("${posthog.project-token:}") String token,
            @Value("${posthog.host:https://us.i.posthog.com}") String host) {
        this.restTemplate = restTemplate;
        this.token = token == null ? "" : token;
        this.host = host == null || host.isBlank() ? "https://us.i.posthog.com" : host;
    }

    @Async
    public void capturarPedidoPagado(Pedido pedido, Pago pago) {
        if (token.isBlank() || pedido == null) return;
        try {
            restTemplate.postForObject(urlCapture(), new HttpEntity<>(cuerpo(pedido, pago), jsonHeaders()), String.class);
        } catch (Exception e) {
            log.warn("[posthog] no se pudo enviar pedido_pagado: {}", e.getMessage());
        }
    }

    private Map<String, Object> cuerpo(Pedido pedido, Pago pago) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("api_key", token);
        body.put("event", EVENTO_PEDIDO_PAGADO);
        body.put("distinct_id", distinctIdDe(pedido));
        body.put("properties", propiedades(pedido, pago));
        return body;
    }

    private static Map<String, Object> propiedades(Pedido pedido, Pago pago) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("monto", pedido.getTotalPedido());
        properties.put("pedido_id", pedido.getNumeroPedido());
        properties.put("origen", pedido.getOrigen());
        if (pedido.getEmpresaId() != null) {
            properties.put("empresa_id", pedido.getEmpresaId());
        }
        if (pago != null && pago.getProveedor() != null) {
            properties.put("proveedor", pago.getProveedor());
        }
        return properties;
    }

    private static HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String urlCapture() {
        return host.replaceAll("/$", "") + "/capture/";
    }

    private static String distinctIdDe(Pedido pedido) {
        Usuario u = pedido.getUsuarioFinal();
        if (u != null && u.getId() != null) return String.valueOf(u.getId());
        String numero = pedido.getNumeroPedido();
        return numero != null ? "pedido:" + numero : "anonimo";
    }
}
