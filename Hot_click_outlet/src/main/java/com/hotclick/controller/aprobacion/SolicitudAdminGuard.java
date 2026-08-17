package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class SolicitudAdminGuard {

    private final CompanyScope companyScope;

    public SolicitudAdminGuard(CompanyScope companyScope) {
        this.companyScope = companyScope;
    }

    public ResponseEntity<ResponseDTO> denyIfNotAdmin() {
        if (!companyScope.isAdminIT()) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        }
        return null;
    }
}
