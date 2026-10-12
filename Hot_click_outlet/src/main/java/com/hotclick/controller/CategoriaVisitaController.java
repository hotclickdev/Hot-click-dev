package com.hotclick.controller;

import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.categoria.CategoriaVisitaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Contador público de visitas por categoría (barra "categorías top" del header).
 * No guarda IP, usuario ni cookie: solo suma 1 al día de la categoría raíz. El frontend solo llama
 * con consentimiento de análisis. La IP solo se usa en memoria/tabla de rate limit, como /api/public/embudo.
 */
@RestController
public class CategoriaVisitaController {

    private static final int VENTANA_HORA = 3600;

    private final CategoriaVisitaService service;
    private final RateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;
    private final int maxPorHora;

    public CategoriaVisitaController(CategoriaVisitaService service, RateLimiter rateLimiter,
                                     ClientIpResolver clientIpResolver,
                                     @Value("${categorias.visitas.max-por-hora:120}") int maxPorHora) {
        this.service = service;
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver;
        this.maxPorHora = maxPorHora;
    }

    @PostMapping("/api/public/categorias/{id}/visita")
    public ResponseEntity<Void> registrar(@PathVariable Long id, HttpServletRequest request) {
        String ip = clientIpResolver.resolve(request);
        if (!rateLimiter.tryAcquire("catvisita:ip:" + ip + ":hora", maxPorHora, VENTANA_HORA)) {
            return ResponseEntity.status(429).build();
        }
        // 204 aunque la categoría no exista o no sea pública: no se filtra información.
        service.registrar(id);
        return ResponseEntity.noContent().build();
    }
}
