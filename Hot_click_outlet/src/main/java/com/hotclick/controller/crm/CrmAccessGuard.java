package com.hotclick.controller.crm;

import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class CrmAccessGuard {

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private CompanyScope companyScope;
    @Autowired private TenantService tenantService;

    public boolean sinAccesoCrm() {
        return !companyScope.isAdminIT() && !tenantService.tieneFeature("crm");
    }

    /** ADMIN sin impersonar: único caso en que una empresa nula significa "todos". */
    public boolean esAdminGlobal() {
        return companyScope.isAdminIT();
    }

    /** Un cliente "pertenece" a la empresa si compró ahí, o si la empresa lo registró manualmente (CRM). */
    public boolean clientePerteneceAEmpresa(Usuario usuario, Long empresaId) {
        // IDOR-05: empresa nula = acceso global SOLO para ADMIN explícito, nunca para un vendedor sin negocio
        if (empresaId == null) return esAdminGlobal();
        if (usuario.getEmpresaRegistro() != null && empresaId.equals(usuario.getEmpresaRegistro().getId())) return true;
        return pedidoRepository.existsByUsuarioFinalIdAndEmpresaId(usuario.getId(), empresaId);
    }
}
