package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.SucursalService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
            String ubicacion = body.get("ubicacion");
            if (ubicacion == null || ubicacion.isBlank()) {
                ubicacion = body.get("direccion");
            }
            Map<String, Object> creada = sucursalService.crear(
                body.get("nombre"),
                ubicacion,
                empresaId
            );
            return ResponseEntity.ok(ResponseDTO.success("Sucursal creada", creada));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[sucursales POST] {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> renombrar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Map<String, Object> actualizada = sucursalService.renombrar(id, body.get("nombre"));
            return ResponseEntity.ok(ResponseDTO.success("Sucursal actualizada", actualizada));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[sucursales PUT {}] {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> desactivar(@PathVariable Long id) {
        try {
            Map<String, Object> desactivada = sucursalService.desactivar(id);
            return ResponseEntity.ok(ResponseDTO.success("Sucursal desactivada", desactivada));
        } catch (Exception e) {
            log.error("[sucursales DELETE {}] {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
