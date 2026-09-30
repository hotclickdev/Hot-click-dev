package com.hotclick.controller;

import com.hotclick.dto.EmbudoRegistroRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.analytics.EmbudoSesionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EmbudoController {

    private static final int VENTANA_HORA = 3600;

    private final EmbudoSesionService service;
    private final RateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;
    private final int maxPorHora;

    public EmbudoController(
            EmbudoSesionService service,
            RateLimiter rateLimiter,
            ClientIpResolver clientIpResolver,
            @Value("${embudo.publico.max-por-hora:120}") int maxPorHora) {
        this.service = service;
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver;
        this.maxPorHora = maxPorHora;
    }

    @PostMapping("/api/public/embudo")
    public ResponseEntity<ResponseDTO> registrar(
            @Valid @RequestBody EmbudoRegistroRequest body,
            HttpServletRequest request) {
        if (!permitido(request)) {
            return ResponseEntity.status(429).body(ResponseDTO.error("Demasiados eventos de embudo"));
        }
        service.registrar(body);
        return ResponseEntity.ok(ResponseDTO.success("ok", null));
    }

    @GetMapping("/api/admin/embudo")
    public ResponseDTO resumen(@RequestParam(defaultValue = "7") int dias) {
        return ResponseDTO.success("ok", service.resumen(dias));
    }

    private boolean permitido(HttpServletRequest request) {
        String ip = clientIpResolver.resolve(request);
        return rateLimiter.tryAcquire("embudo:ip:" + ip + ":hora", maxPorHora, VENTANA_HORA);
    }
}
