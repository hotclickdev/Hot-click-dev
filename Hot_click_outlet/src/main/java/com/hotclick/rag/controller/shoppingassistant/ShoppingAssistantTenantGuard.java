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
        return empresaRepository.findBySlug(empresaSlug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()))
            .orElseThrow(() -> {
                log.warn("[rag-ctrl] Slug no encontrado o inactivo: '{}'", empresaSlug);
                return new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Tienda no encontrada o inactiva");
            });
    }

    public Empresa requireEmpresaActivaForImageSearch(String empresaSlug) {
        return empresaRepository.findBySlug(empresaSlug)
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tienda no encontrada"));
    }

    public static String nombreComercial(Empresa empresa) {
        return empresa.getNombreComercial() != null
            ? empresa.getNombreComercial()
            : empresa.getNombreEmpresa();
    }
}
