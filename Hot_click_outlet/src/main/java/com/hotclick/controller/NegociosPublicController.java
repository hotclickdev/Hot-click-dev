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

    /** Tope explícito de la respuesta: el directorio nunca devuelve más de esto por llamada. */
    static final int MAX_LIST_NEGOCIOS = DirectorioNegociosService.LIMITE_MAXIMO;

    private final DirectorioNegociosService directorio;

    public NegociosPublicController(DirectorioNegociosService directorio) {
        this.directorio = directorio;
    }

    @GetMapping
    public List<NegocioPublicoDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) Integer limite) {
        int tope = limite == null ? DirectorioNegociosService.LIMITE_DEFECTO : Math.min(Math.max(limite, 1), MAX_LIST_NEGOCIOS);
        return directorio.buscar(q, plan, tope);
    }
}
