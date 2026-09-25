package com.hotclick.service.analytics;

import com.hotclick.model.Pedido;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * GA4 Measurement Protocol — purchase server-side (adblock-resistant).
 */
@Service
public class Ga4MeasurementProtocolService {

    private static final Logger log = LoggerFactory.getLogger(Ga4MeasurementProtocolService.class);
    private static final String MP_URL = "https://www.google-analytics.com/mp/collect";

    private final RestTemplate restTemplate;
    private final String measurementId;
    private final String apiSecret;
    private final boolean enabled;

    public Ga4MeasurementProtocolService(
            RestTemplate restTemplate,
            @Value("${ga4.measurement-id:}") String measurementId,
            @Value("${ga4.mp-api-secret:}") String apiSecret) {
        this.restTemplate = restTemplate;
        this.measurementId = measurementId == null ? "" : measurementId.trim();
        this.apiSecret = apiSecret == null ? "" : apiSecret.trim();
        this.enabled = !this.measurementId.isBlank() && !this.apiSecret.isBlank();
    }

    @Async
    public void enviarPurchase(Pedido pedido) {
        if (!enabled || pedido == null) return;
        try {
            String url = MP_URL + "?measurement_id=" + measurementId + "&api_secret=" + apiSecret;
            restTemplate.postForObject(url, new HttpEntity<>(cuerpo(pedido), jsonHeaders()), String.class);
            log.info("[ga4-mp] purchase enviado pedido={}", pedido.getNumeroPedido());
        } catch (Exception e) {
            log.warn("[ga4-mp] fallo purchase: {}", e.getMessage());
        }
    }

    private Map<String, Object> cuerpo(Pedido pedido) {
        String clientId = pedido.getUsuarioFinal() != null && pedido.getUsuarioFinal().getId() != null
            ? "uid." + pedido.getUsuarioFinal().getId()
            : UUID.randomUUID().toString();

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("currency", "CRC");
        params.put("value", pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0);
        params.put("transaction_id", pedido.getNumeroPedido());
        if (pedido.getEmpresaId() != null) {
            params.put("empresa_id", pedido.getEmpresaId());
        }

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("name", "purchase");
        event.put("params", params);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("client_id", clientId);
        body.put("events", List.of(event));
        return body;
    }

    private static HttpHeaders jsonHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }
}
