package com.hotclick.rag.controller.shoppingassistant;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Resolución de tenant para ShoppingAssistantController.
 * Extraído bit-idéntico de ShoppingAssistantController — no cambia comportamiento.
 */
@Component
public class ShoppingAssistantTenantGuard {

    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantTenantGuard.class);

    private final EmpresaRepository empresaRepository;

    public ShoppingAssistantTenantGuard(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    public Empresa requireEmpresaActiva(String empresaSlug) {
        return buscarPorSlug(empresaSlug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()))
            .orElseThrow(() -> {
                log.warn("[rag-ctrl] Slug no encontrado o inactivo (len={})", empresaSlug == null ? 0 : empresaSlug.length());
                return new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Tienda no encontrada o inactiva");
            });
    }

    public Empresa requireEmpresaActivaForImageSearch(String empresaSlug) {
        return buscarPorSlug(empresaSlug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tienda no encontrada"));
    }

    /**
     * El slug es UNIQUE (V8), pero si la BD devolviera más de una fila no elegimos una al azar:
     * fail-closed con 404 limpio en lugar de 500.
     */
    private java.util.Optional<Empresa> buscarPorSlug(String empresaSlug) {
        try {
            return empresaRepository.findBySlug(empresaSlug);
        } catch (org.springframework.dao.IncorrectResultSizeDataAccessException e) {
            // B1: sin e.getMessage() ni stacktrace (DataAccessException).
            log.error("[rag-ctrl] Slug duplicado ref={} paso=tenant '{}': {}",
                java.util.UUID.randomUUID().toString().substring(0, 8), empresaSlug, e.getClass().getName());
            return java.util.Optional.empty();
        }
    }

    public static String nombreComercial(Empresa empresa) {
        return com.hotclick.utils.EmpresaNombre.mostrar(empresa, null);
    }
}
