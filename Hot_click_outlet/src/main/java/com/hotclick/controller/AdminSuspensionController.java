package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.suscripcion.AdminSuspensionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Admin de plataforma: impago (#333). Solo ADMIN; cualquier otro rol recibe 403. */
@RestController
@RequestMapping("/api/admin/suspensiones")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSuspensionController {

    private final AdminSuspensionService service;

    public AdminSuspensionController(AdminSuspensionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseDTO listar(@RequestParam(defaultValue = "200") int limit) {
        return ResponseDTO.success("Tiendas en gracia y suspendidas", service.listar(limit));
    }

    @PostMapping("/{empresaId}/suspender")
    public ResponseDTO suspender(@PathVariable Long empresaId, @RequestBody(required = false) Map<String, String> body) {
        return ResponseDTO.success("Tienda suspendida", service.suspender(empresaId, body == null ? null : body.get("motivo")));
    }

    @PostMapping("/{empresaId}/extension")
    public ResponseDTO extension(@PathVariable Long empresaId, @RequestBody(required = false) Map<String, String> body) {
        return ResponseDTO.success("Extensión otorgada", service.darExtension(empresaId, body == null ? null : body.get("motivo")));
    }
}
