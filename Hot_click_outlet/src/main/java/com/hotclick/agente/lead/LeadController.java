package com.hotclick.agente.lead;

import com.hotclick.security.CompanyScope;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Lectura de leads para el CRM. Cada negocio ve solo los suyos; el ADMIN (sin impersonar) ve los de HotClick
 * (fk_id_empresa NULL). El alcance sale de {@link CompanyScope}, nunca de un parámetro. No exige la feature "ai":
 * los leads los generó el bot de HotClick y pertenecen al negocio aunque su plan no incluya bot propio.
 */
@RestController
@RequestMapping("/api/agente/leads")
public class LeadController {

    private final LeadService service;
    private final CompanyScope companyScope;

    public LeadController(LeadService service, CompanyScope companyScope) {
        this.service = service;
        this.companyScope = companyScope;
    }

    @GetMapping
    public ResponseEntity<List<LeadDto>> listar(
            @RequestParam(required = false) TipoLead tipo,
            @RequestParam(required = false) EstadoLead estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listar(companyScope.requireEmpresaIdOrAdmin(), tipo, estado, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeadDto> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(service.detalle(id, companyScope.requireEmpresaIdOrAdmin()));
    }
}
