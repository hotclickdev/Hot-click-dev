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
 * Gestiona el token OAuth2 de Hacienda CR (ATV).
 *
 * ESTADO: STUB — retorna token vacío hasta que las credenciales estén configuradas.
 *
 * URLs de Hacienda:
 *   STAG: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token
 *   PROD: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token
 *
 * El token expira cada ~30 minutos. Se cachea por empresaId para evitar llamadas innecesarias.
 * Al expirar, se renueva automáticamente antes del siguiente envío.
 *
 * Implementación completa (F12.5):
 *   1. Descifrar empresa.claveHaciendaEnc con TotpSecretEncryptionService
 *   2. POST al endpoint de token con grant_type=password
 *   3. Cachear { token, expiry } por empresaId
 *   4. En getToken(): si expiry < now + 5min, renovar antes de retornar
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
     * @return token string, o cadena vacía si las credenciales no están configuradas (stub)
     */
    public String getToken(Empresa empresa) {
        if (!tieneCredenciales(empresa)) {
            log.warn("[hacienda-token] empresa={} sin credenciales — stub activo", empresa.getId());
            return "";
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

        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                String token      = (String) resp.getBody().get("access_token");
                int    expiresIn  = (Integer) resp.getBody().getOrDefault("expires_in", 1800);
                Instant expiry    = Instant.now().plusSeconds(expiresIn);

                tokenCache.put(empresa.getId(), new CachedToken(token, expiry));
                log.info("[hacienda-token] Token renovado para empresa={} ambiente={}",
                    empresa.getId(), empresa.getAmbienteHacienda());
                return token;
            }
        } catch (Exception e) {
            log.error("[hacienda-token] Error obteniendo token para empresa={}: {}",
                empresa.getId(), e.getMessage());
        }
        return "";
    }

    private record CachedToken(String token, Instant expiry) {}
}
