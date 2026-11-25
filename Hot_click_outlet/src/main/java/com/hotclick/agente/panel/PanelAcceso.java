package com.hotclick.agente.panel;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import org.springframework.stereotype.Component;

/**
 * Alcance común de los endpoints del panel del bot: la empresa sale siempre de {@link CompanyScope} (nunca de un
 * parámetro) y el plan debe incluir la feature "ai", igual que {@code /api/agente/canales}.
 */
@Component
public class PanelAcceso {

    private final CompanyScope companyScope;
    private final TenantService tenantService;

    public PanelAcceso(CompanyScope companyScope, TenantService tenantService) {
        this.companyScope = companyScope;
        this.tenantService = tenantService;
    }

    /** Empresa del negocio (ADMIN solo impersonando); sin empresa responde 403. */
    public Long empresa() {
        Long id = companyScope.requireEmpresaId();
        companyScope.assertCanAccess(id);
        exigirPlan();
        return id;
    }

    /** null = ADMIN de plataforma (conocimiento de HotClick); si no, la empresa con plan de IA. */
    public Long empresaOAdmin() {
        Long id = companyScope.requireEmpresaIdOrAdmin();
        if (id != null) exigirPlan();
        return id;
    }

    public Long usuarioId() {
        return companyScope.getCurrentUserId();
    }

    private void exigirPlan() {
        if (!tenantService.tieneFeature("ai"))
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
    }
}
