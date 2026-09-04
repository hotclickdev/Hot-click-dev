package com.hotclick.service.producto;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.stereotype.Service;

/**
 * Resuelve a qué empresa se asigna un alta de producto.
 * El vendedor usa la de su sesión; el ADMIN de plataforma debe indicar una.
 */
@Service
public class EmpresaDestinoAlta {

    public static final String MSG_ELEGIR_EMPRESA =
        "Elegí la empresa a la que se van a asignar los productos.";
    public static final String MSG_SIN_NEGOCIO_PROPIO =
        "El administrador de plataforma no opera un negocio propio";

    private final CompanyScope companyScope;
    private final EmpresaRepository empresaRepository;

    public EmpresaDestinoAlta(CompanyScope companyScope, EmpresaRepository empresaRepository) {
        this.companyScope = companyScope;
        this.empresaRepository = empresaRepository;
    }

    public Empresa resolver(Long empresaIdParam) {
        Long propia = companyScope.getCurrentEmpresaIdOrOwn();
        if (propia != null) {
            return empresaPorId(propia);
        }
        if (!companyScope.isAdminIT()) {
            throw new TenantAccessDeniedException(MSG_SIN_NEGOCIO_PROPIO);
        }
        if (empresaIdParam == null) {
            throw new IllegalArgumentException(MSG_ELEGIR_EMPRESA);
        }
        return empresaPorId(empresaIdParam);
    }

    private Empresa empresaPorId(Long id) {
        return empresaRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada."));
    }
}
