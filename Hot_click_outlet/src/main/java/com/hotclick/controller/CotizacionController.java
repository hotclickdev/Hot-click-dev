package com.hotclick.controller;

import com.hotclick.dto.CotizacionRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Cotizacion;
import com.hotclick.service.CotizacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/cotizaciones")
public class CotizacionController {

    @Autowired private CotizacionService cotizacionService;

    @PostMapping
    public ResponseEntity<ResponseDTO> crearCotizacion(@RequestBody CotizacionRequestDTO dto) {
        try {
            Cotizacion c = cotizacionService.crearCotizacion(dto);
            return ResponseEntity.ok(ResponseDTO.success("Cotización guardada", c));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Cotizaciones", cotizacionService.listarCotizaciones()));
    }
}
