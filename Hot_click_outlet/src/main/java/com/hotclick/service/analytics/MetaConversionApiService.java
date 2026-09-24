package com.hotclick.service.analytics;

import com.hotclick.model.AtribucionPedido;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.AtribucionPedidoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Meta Conversion API — Purchase server-side con event_id para dedup con el píxel.
 */
@Service
public class MetaConversionApiService {

    private static final Logger log = LoggerFactory.getLogger(MetaConversionApiService.class);
    private static final String GRAPH_URL = "https://graph.facebook.com/v21.0/";

    private final RestTemplate restTemplate;
    private final AtribucionPedidoRepository atribucionRepo;
    private final String pixelId;
    private final String accessToken;
    private final boolean enabled;

    public MetaConversionApiService(
            RestTemplate restTemplate,
            AtribucionPedidoRepository atribucionRepo,
            @Value("${meta.pixel-id:}") String pixelId,
            @Value("${meta.capi-access-token:}") String accessToken) {
        this.restTemplate = restTemplate;
        this.atribucionRepo = atribucionRepo;
        this.pixelId = pixelId == null ? "" : pixelId.trim();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.enabled = !this.pixelId.isBlank() && !this.accessToken.isBlank();
    }

    public boolean isEnabled() {
        return enabled;
    }

    @Async
    public void enviarPurchase(Pedido pedido) {
        if (!enabled || pedido == null) return;
        try {
            AtribucionPedido atr = atribucionRepo.findByPedidoId(pedido.getId()).orElse(null);
            Map<String, Object> body = cuerpoPurchase(pedido, atr);
            String url = GRAPH_URL + pixelId + "/events?access_token=" + accessToken;
            restTemplate.postForObject(url, new HttpEntity<>(body, jsonHeaders()), String.class);
            log.info("[meta-capi] Purchase enviado pedido={}", pedido.getNumeroPedido());
        } catch (Exception e) {
            log.warn("[meta-capi] fallo Purchase: {}", e.getMessage());
        }
    }

    private Map<String, Object> cuerpoPurchase(Pedido pedido, AtribucionPedido atr) {
        Map<String, Object> userData = new LinkedHashMap<>();
        Usuario u = pedido.getUsuarioFinal();
        if (u != null) {
            if (u.getCorreo() != null) userData.put("em", List.of(sha256(u.getCorreo().trim().toLowerCase())));
            if (u.getTelefono() != null) userData.put("ph", List.of(sha256(soloDigitos(u.getTelefono()))));
            userData.put("external_id", List.of(sha256(String.valueOf(u.getId()))));
        }
        if (atr != null) {
            if (atr.getFbp() != null) userData.put("fbp", atr.getFbp());
            if (atr.getFbc() != null) userData.put("fbc", atr.getFbc());
            else if (atr.getLastFbclid() != null) {
                userData.put("fbc", "fb.1." + System.currentTimeMillis() / 1000 + "." + atr.getLastFbclid());
            }
        }

        Map<String, Object> custom = new LinkedHashMap<>();
        custom.put("currency", "CRC");
        custom.put("value", pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0);
        custom.put("content_ids", List.of(String.valueOf(pedido.getId())));
        custom.put("content_type", "product");
        if (pedido.getEmpresaId() != null) custom.put("empresa_id", pedido.getEmpresaId());

        String eventId = atr != null && atr.getEventIdPurchase() != null
            ? atr.getEventIdPurchase()
            : "purchase_" + pedido.getNumeroPedido();

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("event_name", "Purchase");
        event.put("event_time", System.currentTimeMillis() / 1000);
        event.put("event_id", eventId);
        event.put("action_source", "website");
        event.put("user_data", userData);
        event.put("custom_data", custom);
        if (atr != null && atr.getLastLandingPath() != null) {
            event.put("event_source_url", "https://hotclick.lat" + atr.getLastLandingPath());
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("data", List.of(event));
        return body;
    }

    private static HttpHeaders jsonHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private static String soloDigitos(String s) {
        return s.replaceAll("\\D", "");
    }

    private static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] dig = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(dig);
        } catch (Exception e) {
            return "";
        }
    }
}
