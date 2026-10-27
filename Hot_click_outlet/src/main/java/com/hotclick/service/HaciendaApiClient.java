package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.Empresa;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.HaciendaLogSanitizer;
import com.hotclick.service.hacienda.HaciendaTransitoriaException;
import com.hotclick.service.hacienda.ResultadoEnvioHacienda;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
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
     * <ul>
     *   <li>2xx: recibido.</li>
     *   <li>4xx: rechazo de recepción (XML o datos inválidos). No se reintenta; el motivo sale de X-Error-Cause.</li>
     *   <li>5xx, timeout o IO: {@link HaciendaTransitoriaException}, que activa Retry y CircuitBreaker.</li>
     *   <li>Sin usuario ATV, sin clave o con token vacío: {@link HaciendaConfiguracionException}, sin hacer el POST.</li>
     * </ul>
     */
    @CircuitBreaker(name = "hacienda")
    @Retry(name = "hacienda")
    public ResultadoEnvioHacienda enviar(String xmlFirmado, String clave, Empresa empresa) {
        String token   = tokenObligatorio(empresa);
        String baseUrl = baseUrl(empresa);

        // Hacienda requiere el XML en Base64
        String xmlBase64 = Base64.getEncoder().encodeToString(xmlFirmado.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        Map<String, Object> payload = Map.of(
            "clave",            clave,
            "fecha",            LocalDateTime.now(Constants.ZONA_CR).format(
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
            log.info("[hacienda-api] POST /recepcion empresa={} clave={} status={}",
                empresa.getId(), HaciendaLogSanitizer.clave(clave), resp.getStatusCode());
            return ResultadoEnvioHacienda.recibido(resp.getStatusCode().value());
        } catch (HttpClientErrorException e) {
            String causa = e.getResponseHeaders() != null ? e.getResponseHeaders().getFirst("X-Error-Cause") : null;
            String motivo = causa != null && !causa.isBlank() ? HaciendaLogSanitizer.mensaje(causa) : "Hacienda rechazó la recepción (HTTP " + e.getStatusCode().value() + ")";
            log.warn("[hacienda-api] Rechazo de recepción empresa={} clave={} status={} causa={}",
                empresa.getId(), HaciendaLogSanitizer.clave(clave), e.getStatusCode().value(), motivo);
            return ResultadoEnvioHacienda.rechazoRecepcion(e.getStatusCode().value(), motivo);
        } catch (HttpServerErrorException | ResourceAccessException e) {
            log.error("[hacienda-api] Falla transitoria enviando empresa={} clave={}: {}",
                empresa.getId(), HaciendaLogSanitizer.clave(clave), HaciendaLogSanitizer.error(e));
            throw new HaciendaTransitoriaException("Hacienda no respondió bien al envío: " + HaciendaLogSanitizer.error(e), e);
        }
    }

    /**
     * Consulta el estado de un comprobante enviado.
     *
     * @return "aceptado", "rechazado" o "procesando"/"recibido" según ind-estado.
     * @throws HaciendaTransitoriaException en 5xx, timeout o IO (se reintenta).
     * @throws HaciendaConfiguracionException sin credenciales ATV.
     */
    @CircuitBreaker(name = "hacienda")
    @Retry(name = "hacienda")
    public String consultarEstado(String clave, Empresa empresa) {
        String token   = tokenObligatorio(empresa);
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
            if (resp.getBody() != null) {
                Object estado = resp.getBody().get("ind-estado");
                return estado != null ? estado.toString() : "en_procesamiento";
            }
            return "en_procesamiento";
        } catch (HttpServerErrorException | ResourceAccessException e) {
            log.error("[hacienda-api] Falla transitoria consultando clave={}: {}", HaciendaLogSanitizer.clave(clave), HaciendaLogSanitizer.error(e));
            throw new HaciendaTransitoriaException("Hacienda no respondió la consulta: " + HaciendaLogSanitizer.error(e), e);
        }
    }

    private String tokenObligatorio(Empresa empresa) {
        if (!tieneCredenciales(empresa)) {
            throw new HaciendaConfiguracionException(
                "Falta configurar el usuario y la clave de ATV de la empresa para enviar a Hacienda.");
        }
        String token = tokenService.getToken(empresa);
        if (token == null || token.isBlank()) {
            throw new HaciendaConfiguracionException(
                "Hacienda no entregó el token de ATV. Revisá el usuario y la clave de ATV.");
        }
        return token;
    }

    private String baseUrl(Empresa empresa) {
        return "PROD".equalsIgnoreCase(empresa.getAmbienteHacienda()) ? URL_PROD : URL_STAG;
    }

    private boolean tieneCredenciales(Empresa empresa) {
        return empresa.getCedulaJuridica() != null && !empresa.getCedulaJuridica().isBlank()
            && empresa.getUsuarioHacienda() != null && !empresa.getUsuarioHacienda().isBlank()
            && empresa.getClaveHaciendaEnc() != null && !empresa.getClaveHaciendaEnc().isBlank();
    }
}
