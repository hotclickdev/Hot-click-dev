package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.suscripcion.SolicitudCambioPlanService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Admin de plataforma: solicitudes de bajar de plan. Solo ADMIN; cualquier otro rol recibe 403. */
@RestController
@RequestMapping("/api/admin/solicitudes-cambio-plan")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSolicitudCambioPlanController {

    private final SolicitudCambioPlanService service;
    private final CompanyScope companyScope;

    public AdminSolicitudCambioPlanController(SolicitudCambioPlanService service, CompanyScope companyScope) {
        this.service = service;
        this.companyScope = companyScope;
    }

    @GetMapping
    public ResponseDTO listar(@RequestParam(defaultValue = "200") int limit) {
        return ResponseDTO.success("Solicitudes de cambio de plan", service.listar(limit));
    }

    @PostMapping("/{id}/revisar")
    public ResponseDTO revisar(@PathVariable Long id) {
        return ResponseDTO.success("Solicitud revisada", service.marcarRevisada(id, companyScope.getCurrentUserId()));
    }
}
