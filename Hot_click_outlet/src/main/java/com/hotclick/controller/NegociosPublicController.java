package com.hotclick.controller;

import com.hotclick.dto.NegocioPublicoDTO;
import com.hotclick.service.negocio.DirectorioNegociosService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Directorio público de negocios (visitante, sin JWT: GET /api/public/** ya es público).
 * {@code q} busca por nombre o slug sin tildes; {@code plan} filtra por plan público
 * (emprendimientos, pymes, negocio-plus). Nunca devuelve contacto del vendedor.
 */
@RestController
@RequestMapping("/api/public/negocios")
public class NegociosPublicController {

    private final DirectorioNegociosService directorio;

    public NegociosPublicController(DirectorioNegociosService directorio) {
        this.directorio = directorio;
    }

    @GetMapping
    public List<NegocioPublicoDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) Integer limite) {
        return directorio.buscar(q, plan, limite);
    }
}
