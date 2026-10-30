package com.hotclick.service;

import com.hotclick.model.Empresa;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Token OAuth2 de Hacienda CR (ATV), grant_type=password.
 * Si la empresa no tiene usuario y clave cifrados, lanza HaciendaConfiguracionException y no llama al IdP.
 * Si el IdP falla, lanza la excepción (nunca devuelve un token vacío).
 * El token no se escribe en el log.
 *
 * URLs:
 *   STAG: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token
 *   PROD: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token
 *
 * El token expira cada ~30 minutos. Se cachea por empresa y se renueva si faltan menos de 5 minutos.
 */
@Service
public class HaciendaTokenService {

    private static final Logger log = LoggerFactory.getLogger(HaciendaTokenService.class);

    private static final String URL_TOKEN_STAG =
        "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token";
    private static final String URL_TOKEN_PROD =
        "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token";
    private static final String CLIENT_ID = "api-stag";
    private static final String CLIENT_ID_PROD = "api";

    private final RestTemplate restTemplate;
    private final TotpSecretEncryptionService encryptionService;

    private final ConcurrentHashMap<Long, CachedToken> tokenCache  = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Object>      renewLocks  = new ConcurrentHashMap<>();

    public HaciendaTokenService(RestTemplate restTemplate,
                                 TotpSecretEncryptionService encryptionService) {
        this.restTemplate      = restTemplate;
        this.encryptionService = encryptionService;
    }

    /**
     * Retorna el Bearer token para la empresa dada.
     * Usa el cache y renueva automáticamente si está por expirar.
     *
     * @return token no vacío
     * @throws HaciendaConfiguracionException si faltan credenciales o el IdP no entrega token
     * @throws HaciendaTransitoriaException si el IdP no responde
     */
    public String getToken(Empresa empresa) {
        if (!tieneCredenciales(empresa)) {
            log.warn("[hacienda-token] empresa={} sin credenciales de ATV", empresa.getId());
            throw new com.hotclick.service.hacienda.HaciendaConfiguracionException(
                "Falta configurar el usuario y la clave de ATV de la empresa.");
        }

        CachedToken cached = tokenCache.get(empresa.getId());
        if (isValid(cached)) return cached.token;

        // Per-empresa lock: evita que dos threads llamen renovarToken() simultáneamente
        Object lock = renewLocks.computeIfAbsent(empresa.getId(), k -> new Object());
        synchronized (lock) {
            cached = tokenCache.get(empresa.getId()); // double-check dentro del lock
            if (isValid(cached)) return cached.token;
            return renovarToken(empresa);
        }
    }

    public void invalidarCache(Long empresaId) {
        tokenCache.remove(empresaId);
    }

    // ── privados ─────────────────────────────────────────────────────────────

    private boolean isValid(CachedToken t) {
        return t != null && t.expiry().isAfter(Instant.now().plusSeconds(300));
    }

    private boolean tieneCredenciales(Empresa empresa) {
        return empresa.getUsuarioHacienda() != null && !empresa.getUsuarioHacienda().isBlank()
            && empresa.getClaveHaciendaEnc() != null && !empresa.getClaveHaciendaEnc().isBlank();
    }

    @SuppressWarnings("unchecked")
    private String renovarToken(Empresa empresa) {
        boolean esProd = "PROD".equalsIgnoreCase(empresa.getAmbienteHacienda());
        String url      = esProd ? URL_TOKEN_PROD : URL_TOKEN_STAG;
        String clientId = esProd ? CLIENT_ID_PROD : CLIENT_ID;

        String clave = encryptionService.decrypt(empresa.getClaveHaciendaEnc());

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id",  clientId);
        body.add("username",   empresa.getUsuarioHacienda());
        body.add("password",   clave);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<Map> resp;
        try {
            resp = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[hacienda-token] ATV rechazó las credenciales de empresa={}: {}",
                empresa.getId(), com.hotclick.service.hacienda.HaciendaLogSanitizer.error(e));
            throw new com.hotclick.service.hacienda.HaciendaConfiguracionException(
                "Hacienda rechazó el usuario o la clave de ATV.");
        } catch (Exception e) {
            log.error("[hacienda-token] Error obteniendo token para empresa={}: {}",
                empresa.getId(), com.hotclick.service.hacienda.HaciendaLogSanitizer.error(e));
            throw new com.hotclick.service.hacienda.HaciendaTransitoriaException(
                "Hacienda no entregó el token de ATV: " + com.hotclick.service.hacienda.HaciendaLogSanitizer.error(e), e);
        }
        Map<?, ?> cuerpo = resp != null && resp.getStatusCode().is2xxSuccessful() ? resp.getBody() : null;
        if (cuerpo != null && cuerpo.get("access_token") instanceof String token && !token.isBlank()) {
            int    expiresIn  = cuerpo.get("expires_in") instanceof Number n ? n.intValue() : 1800;
            Instant expiry    = Instant.now().plusSeconds(expiresIn);

            tokenCache.put(empresa.getId(), new CachedToken(token, expiry));
            log.info("[hacienda-token] Token renovado para empresa={} ambiente={}",
                empresa.getId(), empresa.getAmbienteHacienda());
            return token;
        }
        log.error("[hacienda-token] ATV no entregó token para empresa={}", empresa.getId());
        throw new com.hotclick.service.hacienda.HaciendaConfiguracionException(
            "Hacienda no entregó el token de ATV. Revisá el usuario y la clave de ATV.");
    }

    private record CachedToken(String token, Instant expiry) {}
}
