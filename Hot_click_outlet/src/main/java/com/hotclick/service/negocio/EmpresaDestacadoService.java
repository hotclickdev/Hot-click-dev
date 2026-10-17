package com.hotclick.service.negocio;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.exception.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Carrusel del inicio: el superadmin destaca o quita un negocio. Solo se destacan negocios activos y visibles
 * al público; {@code orden} es opcional (menor primero, 0–999). Quitar el destacado limpia orden y fecha.
 */
@Service
public class EmpresaDestacadoService {

    static final int ORDEN_MAXIMO = 999;

    private final EmpresaRepository empresaRepository;

    public EmpresaDestacadoService(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    @Transactional
    public Map<String, Object> cambiar(Long id, Object val, Object orden) {
        if (val == null) throw new IllegalArgumentException("Campo destacado requerido");
        Empresa empresa = empresaRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        boolean destacar = Boolean.parseBoolean(val.toString());
        Integer posicion = parsearOrden(orden);
        if (destacar && (!"ACTIVO".equals(empresa.getEstadoEmpresa()) || !Boolean.TRUE.equals(empresa.getVisibilidadPublica()))) {
            throw new IllegalArgumentException("Solo se pueden destacar negocios activos y visibles al público.");
        }
        if (destacar && !Boolean.TRUE.equals(empresa.getDestacado())) empresa.setDestacadoDesde(LocalDateTime.now());
        if (!destacar) empresa.setDestacadoDesde(null);
        empresa.setDestacado(destacar);
        empresa.setDestacadoOrden(destacar ? posicion : null);
        empresaRepository.save(empresa);
        Map<String, Object> r = new HashMap<>();
        r.put("destacado", destacar);
        r.put("destacadoOrden", empresa.getDestacadoOrden());
        return r;
    }

    private static Integer parsearOrden(Object orden) {
        if (orden == null || orden.toString().isBlank()) return null;
        int valor;
        try {
            valor = Integer.parseInt(orden.toString().trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("El orden tiene que ser un número");
        }
        if (valor < 0 || valor > ORDEN_MAXIMO) throw new IllegalArgumentException("El orden va de 0 a " + ORDEN_MAXIMO);
        return valor;
    }
}
