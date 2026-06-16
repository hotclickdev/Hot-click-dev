package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class EmpresaService {

    private final EmpresaRepository empresaRepository;

    public EmpresaService(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    /**
     * Resuelve el id de empresa a partir de un slug público.
     * Aplica las mismas restricciones que SlugTenantInterceptor (ACTIVO +
     * visibilidadPublica) para que un slug de una tienda inactiva o privada
     * no pueda usarse para sondear/validar datos de esa empresa.
     */
    public Optional<Long> obtenerIdPorSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }
        return empresaRepository.findBySlug(slug.trim())
            .filter(e -> "ACTIVO".equals(e.getEstadoEmpresa()))
            .filter(e -> Boolean.TRUE.equals(e.getVisibilidadPublica()))
            .map(Empresa::getId);
    }
}
