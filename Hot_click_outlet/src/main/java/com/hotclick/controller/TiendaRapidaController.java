package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.consola.TiendaRapidaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/consola/tiendas-rapidas")
public class TiendaRapidaController {

    private final TiendaRapidaService tiendas;

    public TiendaRapidaController(TiendaRapidaService tiendas) {
        this.tiendas = tiendas;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Tiendas rápidas", tiendas.listar()));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@RequestBody Map<String, Object> body) {
        Integer dias = body.get("dias") instanceof Number numero ? numero.intValue() : null;
        return ResponseEntity.ok(ResponseDTO.success("Tienda rápida",
            tiendas.crear(texto(body.get("negocio")), texto(body.get("persona")), texto(body.get("telefono")), dias)));
    }

    private static String texto(Object valor) {
        return valor == null ? "" : valor.toString();
    }
}
