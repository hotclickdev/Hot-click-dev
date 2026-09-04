package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class SolicitudAdminGuard {

    private final CompanyScope companyScope;

    public SolicitudAdminGuard(CompanyScope companyScope) {
        this.companyScope = companyScope;
    }

    /** ADMIN (todos los global.*) o TRUST ({@code global.approvals}). */
    public ResponseEntity<ResponseDTO> denyIfNotAdmin() {
        if (companyScope.isAdminIT() || companyScope.hasAuthority(Constants.PERM_GLOBAL_APPROVALS)) {
            return null;
        }
        return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
    }
}
