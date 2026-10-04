package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.legal.CuentaTitularService;
import com.hotclick.model.Usuario;
import com.hotclick.service.auth.AuthSupport;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Acceso y cierre de la propia cuenta (Ley 8968, derechos ARCO).
 */
@RestController
@RequestMapping("/api/cuenta")
public class CuentaTitularController {

    private final CuentaTitularService cuentaTitularService;
    private final AuthSupport authSupport;

    public CuentaTitularController(CuentaTitularService cuentaTitularService, AuthSupport authSupport) {
        this.cuentaTitularService = cuentaTitularService;
        this.authSupport = authSupport;
    }

    @GetMapping("/mis-datos")
    public ResponseEntity<ResponseDTO> misDatos(HttpServletRequest request) {
        Usuario yo = authSupport.usuarioFromRequest(request);
        return ResponseEntity.ok(ResponseDTO.success("ok", cuentaTitularService.exportar(yo)));
    }

    @PostMapping("/cierre")
    public ResponseEntity<ResponseDTO> cierre(HttpServletRequest request) {
        Usuario yo = authSupport.usuarioFromRequest(request);
        cuentaTitularService.cerrar(yo);
        return ResponseEntity.ok(ResponseDTO.success("Cuenta cerrada. Los pedidos se conservan por obligación fiscal.", null));
    }
}
