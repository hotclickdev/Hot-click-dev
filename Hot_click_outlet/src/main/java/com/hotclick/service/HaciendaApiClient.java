package com.hotclick.service;

import com.hotclick.model.Empresa;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;

/**
 * Cliente HTTP para la API de recepción de comprobantes de Hacienda CR.
 *
 * Endpoints:
 *   STAG: https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1
 *   PROD: https://api.comprobanteselectronicos.go.cr/recepcion/v1
 *
 * Flujo:
 *   1. POST /recepcion   — enviar comprobante (respuesta inmediata: 202 Accepted)
 *   2. GET  /recepcion/{clave} — consultar estado (ACEPTADO | RECHAZADO | en_procesamiento)
 *
 * Hacienda no acepta sincrónicamente; siempre retorna 202 y procesa async.
 * El estado final se obtiene haciendo polling a GET /recepcion/{clave}.
 */
@Service
public class HaciendaApiClient {

    private static final Logger log = LoggerFactory.getLogger(HaciendaApiClient.class);

    private static final String URL_STAG = "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1";
    private static final String URL_PROD = "https://api.comprobanteselectronicos.go.cr/recepcion/v1";

    private final RestTemplate restTemplate;
    private final HaciendaTokenService tokenService;

    public HaciendaApiClient(RestTemplate restTemplate, HaciendaTokenService tokenService) {
        this.restTemplate = restTemplate;
        this.tokenService  = tokenService;
    }

    /**
     * Envía el XML firmado a Hacienda.
     *
     * @param xmlFirmado  XML firmado con PKCS#12
     * @param clave       clave numérica de 50 dígitos
     * @param empresa     emisor (para obtener token y determinar ambiente)
     * @return true si Hacienda aceptó la recepción (HTTP 202), false si hubo error
     */
    @CircuitBreaker(name = "hacienda", fallbackMethod = "enviarFallback")
    @Retry(name = "hacienda")
    public boolean enviar(String xmlFirmado, String clave, Empresa empresa) {
        if (!tieneCredenciales(empresa)) {
            log.warn("[hacienda-api] empresa={} sin credenciales — envío simulado (stub)", empresa.getId());
            return true; // stub: simula envío exitoso en desarrollo
        }

        String token   = tokenService.getToken(empresa);
        String baseUrl = baseUrl(empresa);

        // Hacienda requiere el XML en Base64
        String xmlBase64 = Base64.getEncoder().encodeToString(xmlFirmado.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        Map<String, Object> payload = Map.of(
            "clave",            clave,
            "fecha",            java.time.LocalDateTime.now().format(
                                    java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            "emisor", Map.of(
                "tipoIdentificacion", empresa.getTipoCedula(),
                "numeroIdentificacion", empresa.getCedulaJuridica()
            ),
            "comprobanteXml",   xmlBase64,
            "callbackUrl",      "" // no usamos callback, haremos polling
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        try {
            ResponseEntity<String> resp = restTemplate.exchange(
                baseUrl + "/recepcion",
                HttpMethod.POST,
                new HttpEntity<>(payload, headers),
                String.class
            );
            boolean ok = resp.getStatusCode() == HttpStatus.ACCEPTED;
            log.info("[hacienda-api] POST /recepcion empresa={} clave={} status={}",
                empresa.getId(), clave, resp.getStatusCode());
            return ok;
        } catch (Exception e) {
            log.error("[hacienda-api] Error enviando empresa={} clave={}: {}",
                empresa.getId(), clave, e.getMessage());
            return false;
        }
    }

    /**
     * Consulta el estado de un comprobante enviado.
     *
     * @return "ACEPTADO", "RECHAZADO", "en_procesamiento", o "ERROR" si falla la consulta
     */
    @CircuitBreaker(name = "hacienda", fallbackMethod = "consultarEstadoFallback")
    @Retry(name = "hacienda")
    public String consultarEstado(String clave, Empresa empresa) {
        if (!tieneCredenciales(empresa)) {
            return "en_procesamiento"; // stub
        }

        String token   = tokenService.getToken(empresa);
        String baseUrl = baseUrl(empresa);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                baseUrl + "/recepcion/" + clave,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
            );
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                Object estado = resp.getBody().get("ind-estado");
                return estado != null ? estado.toString() : "en_procesamiento";
            }
        } catch (Exception e) {
            log.error("[hacienda-api] Error consultando estado clave={}: {}", clave, e.getMessage());
        }
        return "ERROR";
    }

    private String baseUrl(Empresa empresa) {
        return "PROD".equalsIgnoreCase(empresa.getAmbienteHacienda()) ? URL_PROD : URL_STAG;
    }

    private boolean tieneCredenciales(Empresa empresa) {
        return empresa.getCedulaJuridica() != null && !empresa.getCedulaJuridica().isBlank()
            && empresa.getUsuarioHacienda() != null && !empresa.getUsuarioHacienda().isBlank();
    }

    private boolean enviarFallback(String xmlFirmado, String clave, Empresa empresa, Throwable t) {
        log.error("[hacienda-circuit] OPEN empresa={} clave={}: {}", empresa.getId(), clave, t.getMessage());
        return false;
    }

    private String consultarEstadoFallback(String clave, Empresa empresa, Throwable t) {
        log.error("[hacienda-circuit] OPEN consulta clave={}: {}", clave, t.getMessage());
        return "ERROR";
    }
}
