package com.hotclick.controller;

import com.hotclick.service.HaciendaContribuyenteService;
import com.hotclick.service.HaciendaContribuyenteService.ContribuyenteDTO;
import com.hotclick.utils.CedulaCr;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hacienda")
public class HaciendaContribuyenteController {

    private final HaciendaContribuyenteService service;

    public HaciendaContribuyenteController(HaciendaContribuyenteService service) {
        this.service = service;
    }

    /** Consulta pública — no requiere JWT. Devuelve datos del contribuyente en Hacienda CR. */
    @GetMapping("/contribuyente/{cedula}")
    public ResponseEntity<ContribuyenteDTO> consultar(@PathVariable String cedula) {
        ContribuyenteDTO dto = service.consultar(CedulaCr.requireValida(cedula));
        return ResponseEntity.ok(dto);
    }
}
