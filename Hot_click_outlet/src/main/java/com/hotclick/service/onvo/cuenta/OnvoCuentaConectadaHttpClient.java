package com.hotclick.service.onvo.cuenta;

import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/** Cliente real. Sin llave lanza {@link OnvoNoConfiguradoException}: fail-closed, sin ids inventados. */
public class OnvoCuentaConectadaHttpClient implements OnvoCuentaConectadaClient {

    static final String API_BASE = "https://api.onvopay.com/v1";

    private final RestTemplate restTemplate;
    private final String secretKey;

    public OnvoCuentaConectadaHttpClient(RestTemplate restTemplate, String secretKey) {
        this.restTemplate = restTemplate;
        this.secretKey = secretKey;
    }

    @Override
    public CuentaCreada crear(String businessName) {
        Map<?, ?> r = exchange("/connected-accounts", HttpMethod.POST, Map.of("businessName", businessName));
        String id = texto(r, "id");
        String url = texto(r, "onboardingUrl");
        if (id == null) throw new IllegalStateException("ONVO no devolvió id de cuenta conectada");
        return new CuentaCreada(id, texto(r, "status"), url);
    }

    @Override
    public CuentaEstado consultar(String accountId) {
        Map<?, ?> r = exchange("/connected-accounts/" + accountId, HttpMethod.GET, null);
        return new CuentaEstado(texto(r, "id"), texto(r, "status"));
    }

    @Override
    public String regenerarOnboarding(String accountId) {
        try {
            Map<?, ?> r = exchange("/connected-accounts/" + accountId + "/onboarding-link", HttpMethod.POST, Map.of());
            return texto(r, "onboardingUrl");
        } catch (HttpClientErrorException.Conflict e) {
            throw new OnboardingCompletadoException("Onboarding ya completado");
        }
    }

    @Override
    public boolean isSimulado() { return false; }

    private Map<?, ?> exchange(String path, HttpMethod metodo, Object body) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new OnvoNoConfiguradoException("ONVO sin ONVO_SECRET_KEY");
        }
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(secretKey);
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        ResponseEntity<Map> resp = restTemplate.exchange(API_BASE + path, metodo, new HttpEntity<>(body, h), Map.class);
        return resp.getBody() != null ? resp.getBody() : Map.of();
    }

    private static String texto(Map<?, ?> m, String k) {
        Object v = m.get(k);
        return v == null || String.valueOf(v).isBlank() ? null : String.valueOf(v);
    }
}
