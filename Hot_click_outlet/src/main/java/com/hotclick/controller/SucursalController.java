package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.SucursalService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/sucursales")
public class SucursalController {

    private static final Logger log = LoggerFactory.getLogger(SucursalController.class);

    private final SucursalService sucursalService;
    private final CompanyScope companyScope;

    public SucursalController(SucursalService sucursalService, CompanyScope companyScope) {
        this.sucursalService = sucursalService;
        this.companyScope = companyScope;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        try {
            return ResponseEntity.ok(ResponseDTO.success(
                "Sucursales obtenidas",
                sucursalService.listar(companyScope.getCurrentEmpresaId())
            ));
        } catch (Exception e) {
            log.error("[sucursales] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("Error al obtener sucursales: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@RequestBody Map<String, String> body) {
        try {
            Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
            Map<String, Object> creada = sucursalService.crear(body.get("nombre"), empresaId);
            return ResponseEntity.ok(ResponseDTO.success("Sucursal creada", creada));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[sucursales POST] {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
