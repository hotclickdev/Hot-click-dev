package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.consola.TiendaRapidaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/tienda-rapida")
public class TiendaRapidaPublicController {

    private final TiendaRapidaService tiendas;

    public TiendaRapidaPublicController(TiendaRapidaService tiendas) {
        this.tiendas = tiendas;
    }

    @GetMapping("/{token}")
    public ResponseEntity<ResponseDTO> ver(@PathVariable String token) {
        return ResponseEntity.ok(ResponseDTO.success("Tienda rápida", tiendas.ver(token)));
    }

    @PostMapping("/{token}")
    public ResponseEntity<ResponseDTO> completar(@PathVariable String token, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ResponseDTO.success("Datos guardados", tiendas.completar(
            token, body.get("persona"), body.get("cedula"), body.get("correo"), body.get("telefono"), body.get("clave"))));
    }
}
