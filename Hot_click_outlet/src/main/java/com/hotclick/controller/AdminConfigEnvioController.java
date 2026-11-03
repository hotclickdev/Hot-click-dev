package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.envio.ConfiguracionEnvioService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A-2: montos de envío de la plataforma. Escritura y lectura de admin solo ADMIN (cae en el resto de /api/admin/**).
 * La lectura pública de solo lectura está en {@code GET /api/public/envio/montos}.
 */
@RestController
public class AdminConfigEnvioController {

    private final ConfiguracionEnvioService config;

    public AdminConfigEnvioController(ConfiguracionEnvioService config) { this.config = config; }

    @GetMapping("/api/admin/configuracion/envio")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> obtener() {
        return ResponseEntity.ok(ResponseDTO.success("Envío", datos(config.montos(), true)));
    }

    @PutMapping("/api/admin/configuracion/envio")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> actualizar(@RequestBody(required = false) Map<String, Object> body) {
        ConfiguracionEnvioService.Montos nuevos;
        try {
            if (body == null) throw new IllegalArgumentException("falta");
            nuevos = config.actualizar(new ConfiguracionEnvioService.Montos(
                entero(body.get("montoGamCrc")), entero(body.get("montoFueraGamCrc")), entero(body.get("montoRapidoCrc"))));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                "Cada monto de envío tiene que ser un entero entre 0 y " + ConfiguracionEnvioService.MONTO_MAX + "."));
        }
        return ResponseEntity.ok(ResponseDTO.success("Envío actualizado", datos(nuevos, true)));
    }

    /** Solo lectura y sin sesión: el checkout muestra los montos que va a cobrar el servidor. */
    @GetMapping("/api/public/envio/montos")
    public ResponseEntity<ResponseDTO> publico() {
        return ResponseEntity.ok(ResponseDTO.success("Envío", datos(config.montos(), false)));
    }

    private static int entero(Object raw) {
        if (raw == null) throw new IllegalArgumentException("falta");
        return Integer.parseInt(raw.toString().trim());
    }

    private static Map<String, Object> datos(ConfiguracionEnvioService.Montos m, boolean conTope) {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("montoGamCrc", m.gam());
        d.put("montoFueraGamCrc", m.fueraGam());
        d.put("montoRapidoCrc", m.rapido());
        if (conTope) d.put("montoMaximoCrc", ConfiguracionEnvioService.MONTO_MAX);
        return d;
    }
}
