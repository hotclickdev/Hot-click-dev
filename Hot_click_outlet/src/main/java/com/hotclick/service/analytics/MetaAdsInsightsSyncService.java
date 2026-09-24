package com.hotclick.service.analytics;

import com.hotclick.model.AdsInsightDiario;
import com.hotclick.repository.AdsInsightDiarioRepository;
import com.hotclick.utils.Constants;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Iterator;

/**
 * Sincroniza insights diarios desde Meta Marketing API (si hay token + ad account).
 * Sin credenciales no hace nada — el gasto manual sigue siendo la fuente de ROAS.
 */
@Service
public class MetaAdsInsightsSyncService {

    private static final Logger log = LoggerFactory.getLogger(MetaAdsInsightsSyncService.class);

    private final RestTemplate restTemplate;
    private final AdsInsightDiarioRepository insightRepo;
    private final AdsMetricasService adsMetricasService;
    private final ObjectMapper objectMapper;
    private final String accessToken;
    private final String adAccountId;
    private final boolean enabled;

    public MetaAdsInsightsSyncService(
            RestTemplate restTemplate,
            AdsInsightDiarioRepository insightRepo,
            AdsMetricasService adsMetricasService,
            ObjectMapper objectMapper,
            @Value("${meta.capi-access-token:}") String accessToken,
            @Value("${meta.ad-account-id:}") String adAccountId) {
        this.restTemplate = restTemplate;
        this.insightRepo = insightRepo;
        this.adsMetricasService = adsMetricasService;
        this.objectMapper = objectMapper;
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.adAccountId = normalizeAccount(adAccountId);
        this.enabled = !this.accessToken.isBlank() && !this.adAccountId.isBlank();
    }

    public boolean isEnabled() {
        return enabled;
    }

    @Transactional
    public int syncAyer() {
        if (!enabled) {
            log.debug("[meta-insights] sync omitido: sin META_AD_ACCOUNT_ID / token");
            return 0;
        }
        LocalDate ayer = LocalDate.now(Constants.ZONA_CR).minusDays(1);
        return syncFecha(ayer);
    }

    @Transactional
    public int syncFecha(LocalDate fecha) {
        if (!enabled) return 0;
        try {
            String url = UriComponentsBuilder
                .fromUriString("https://graph.facebook.com/v21.0/" + adAccountId + "/insights")
                .queryParam("level", "ad")
                .queryParam("fields", "campaign_name,ad_id,ad_name,spend,impressions,clicks,frequency,ctr")
                .queryParam("time_range", "{\"since\":\"" + fecha + "\",\"until\":\"" + fecha + "\"}")
                .queryParam("access_token", accessToken)
                .toUriString();

            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            JsonNode root = objectMapper.readTree(resp.getBody());
            JsonNode data = root.path("data");
            if (!data.isArray()) return 0;

            int n = 0;
            for (Iterator<JsonNode> it = data.elements(); it.hasNext();) {
                JsonNode row = it.next();
                String campana = text(row, "campaign_name", "sin_campana");
                String anuncioId = text(row, "ad_id", "unknown");
                String anuncioNombre = text(row, "ad_name", anuncioId);
                int gastoCrc = (int) Math.round(row.path("spend").asDouble(0));
                long impresiones = row.path("impressions").asLong(0);
                long clics = row.path("clicks").asLong(0);
                BigDecimal frecuencia = decimal(row, "frequency");
                BigDecimal ctr = decimal(row, "ctr");

                upsertInsight(fecha, campana, anuncioId, anuncioNombre, gastoCrc, impresiones, clics, frecuencia, ctr);
                adsMetricasService.upsertGasto(null, fecha, "meta", campana, gastoCrc, "sync Meta", "meta_api");
                n++;
            }
            log.info("[meta-insights] sync {} filas fecha={}", n, fecha);
            return n;
        } catch (Exception e) {
            log.warn("[meta-insights] sync falló: {}", e.getMessage());
            return 0;
        }
    }

    private void upsertInsight(LocalDate fecha, String campana, String anuncioId, String anuncioNombre,
                               int gastoCrc, long impresiones, long clics,
                               BigDecimal frecuencia, BigDecimal ctr) {
        AdsInsightDiario i = insightRepo
            .findPlataforma(fecha, "meta", campana, anuncioId)
            .orElseGet(AdsInsightDiario::new);
        if (i.getId() == null) {
            i.setFecha(fecha);
            i.setCanal("meta");
            i.setCampana(campana);
            i.setAnuncioId(anuncioId);
            i.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        }
        i.setAnuncioNombre(anuncioNombre);
        i.setGastoCrc(gastoCrc);
        i.setImpresiones(impresiones);
        i.setClics(clics);
        i.setFrecuencia(frecuencia);
        i.setCtr(ctr);
        insightRepo.save(i);
    }

    private static String normalizeAccount(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String t = raw.trim();
        return t.startsWith("act_") ? t : "act_" + t;
    }

    private static String text(JsonNode row, String field, String fallback) {
        String v = row.path(field).asText(null);
        return v == null || v.isBlank() ? fallback : v;
    }

    private static BigDecimal decimal(JsonNode row, String field) {
        if (!row.has(field) || row.path(field).isNull()) return null;
        try {
            return new BigDecimal(row.path(field).asText("0"));
        } catch (Exception e) {
            return null;
        }
    }
}
