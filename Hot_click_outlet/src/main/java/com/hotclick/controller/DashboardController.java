package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class DashboardController {

    @Autowired private DashboardService dashboardService;
    @Autowired private CompanyScope companyScope;

    @GetMapping("/dashboard")
    public ResponseEntity<ResponseDTO> getDashboard() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        return ResponseEntity.ok(
            ResponseDTO.success("Dashboard", dashboardService.obtenerMetricas(empresaId))
        );
    }
}
