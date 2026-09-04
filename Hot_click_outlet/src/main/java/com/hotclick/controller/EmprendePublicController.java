package com.hotclick.controller;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.service.CupoEmprendedorService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/emprende")
public class EmprendePublicController {

    private final CupoEmprendedorService cupoEmprendedorService;

    public EmprendePublicController(CupoEmprendedorService cupoEmprendedorService) {
        this.cupoEmprendedorService = cupoEmprendedorService;
    }

    @GetMapping("/cupos")
    public CupoEmprendedorEstado cupos() {
        return cupoEmprendedorService.estadoPublico();
    }
}
