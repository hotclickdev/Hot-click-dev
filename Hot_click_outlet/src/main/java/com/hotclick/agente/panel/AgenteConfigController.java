package com.hotclick.agente.panel;

import com.hotclick.security.PermiteLector;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Configuración del bot de ventas del negocio (AG-19). LECTOR solo lee (el interceptor frena el PUT). */
@RestController
@RequestMapping("/api/agente/config")
public class AgenteConfigController {

    private final AgenteConfigService service;
    private final PanelAcceso acceso;

    public AgenteConfigController(AgenteConfigService service, PanelAcceso acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    @PermiteLector
    @GetMapping
    public ResponseEntity<AgenteConfigDto> obtener() {
        return ResponseEntity.ok(service.obtener(acceso.empresa()));
    }

    @PutMapping
    public ResponseEntity<AgenteConfigDto> guardar(@RequestBody AgenteConfigDto.Pedido body) {
        return ResponseEntity.ok(service.guardar(acceso.empresa(), body));
    }
}
