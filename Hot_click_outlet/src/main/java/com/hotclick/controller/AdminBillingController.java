package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.billing.AdminBillingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consola de billing de plataforma (super-admin).
 * Distinta de {@code /api/billing/**} (self-serve del tenant).
 */
@RestController
@RequestMapping("/api/admin/billing")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBillingController {

    private final AdminBillingService billingService;
    private final CompanyScope companyScope;

    public AdminBillingController(AdminBillingService billingService, CompanyScope companyScope) {
        this.billingService = billingService;
        this.companyScope = companyScope;
    }

    @GetMapping("/empresas")
    public ResponseDTO listar(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "50") int size) {
        return ResponseDTO.success("Billing de plataforma", billingService.listarConsola(page, size));
    }

    @GetMapping("/empresas/{id}")
    public ResponseDTO detalle(@PathVariable Long id) {
        companyScope.assertCanAccess(id);
        return ResponseDTO.success("Billing empresa", billingService.detalleEmpresa(id));
    }
}
