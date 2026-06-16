package com.hotclick.service;

import com.hotclick.security.TenantContext;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Cliente HTTP centralizado para el scraping de páginas externas (Amazon, eBay,
 * Walmart, Newegg, DuckDuckGo) que usa ExtraccionService para enriquecer productos
 * con precio/descripción. Aislado en su propio bean porque @CircuitBreaker y @Retry
 * se aplican vía proxy de Spring AOP: una llamada interna (this.metodo(...)) dentro
 * de la misma clase nunca pasa por el proxy y la anotación no tendría efecto.
 *
 * Si una fuente está caída o bloqueando scraping, el circuito se abre y el fallback
 * devuelve null de inmediato en vez de agotar el timeout en cada producto creado.
 */
@Service
public class ScrapingClient {

    private static final Logger log = LoggerFactory.getLogger(ScrapingClient.class);

    @CircuitBreaker(name = "scraping", fallbackMethod = "fetchDocumentFallback")
    @Retry(name = "scraping")
    public Document fetchDocument(String url, String userAgent, Map<String, String> headers, int timeoutMs) {
        try {
            Connection conn = Jsoup.connect(url).userAgent(userAgent).timeout(timeoutMs);
            for (Map.Entry<String, String> h : headers.entrySet()) conn.header(h.getKey(), h.getValue());
            return conn.get();
        } catch (java.io.IOException e) {
            throw new ScrapingException(e);
        }
    }

    @CircuitBreaker(name = "scraping", fallbackMethod = "fetchBodyFallback")
    @Retry(name = "scraping")
    public String fetchBody(String url, String userAgent, int timeoutMs) {
        try {
            return Jsoup.connect(url)
                .userAgent(userAgent)
                .ignoreContentType(true)
                .timeout(timeoutMs)
                .execute()
                .body();
        } catch (java.io.IOException e) {
            throw new ScrapingException(e);
        }
    }

    private Document fetchDocumentFallback(String url, String userAgent, Map<String, String> headers, int timeoutMs, Throwable t) {
        log.warn("[scraping-circuit] empresaId={} fuente no disponible, se omite enriquecimiento url={}: {}",
            TenantContext.get(), url, t.toString());
        return null;
    }

    private String fetchBodyFallback(String url, String userAgent, int timeoutMs, Throwable t) {
        log.warn("[scraping-circuit] empresaId={} fuente no disponible, se omite enriquecimiento url={}: {}",
            TenantContext.get(), url, t.toString());
        return null;
    }

    /** Envuelve IOException de Jsoup como unchecked para que Resilience4j la cuente como fallo. */
    static class ScrapingException extends RuntimeException {
        ScrapingException(Throwable cause) { super(cause); }
    }
}
