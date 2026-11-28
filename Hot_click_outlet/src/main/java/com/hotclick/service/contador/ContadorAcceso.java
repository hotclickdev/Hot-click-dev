package com.hotclick.service.contador;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import org.springframework.stereotype.Component;

/** Solo un ADMIN de plataforma, y nunca desde una sesion de soporte (impersonacion): mismo patron que la verificacion fiscal. */
@Component
public class ContadorAcceso {

    private final CompanyScope companyScope;

    public ContadorAcceso(CompanyScope companyScope) { this.companyScope = companyScope; }

    public void exigirAdmin() {
        if (!companyScope.isAdminIT() || companyScope.isImpersonating()) {
            throw new TenantAccessDeniedException("Solo un administrador de plataforma usa el Contador IA");
        }
    }

    public Long adminId() { return companyScope.idActorAuditoria(); }
}
