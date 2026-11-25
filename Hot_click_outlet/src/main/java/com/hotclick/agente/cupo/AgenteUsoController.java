package com.hotclick.agente.cupo;

import com.hotclick.security.CompanyScope;
import com.hotclick.security.PermiteLector;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * Uso del mes del bot (conversaciones, cupo, costo de IA y tope). Solo lectura. El alcance sale de
 * {@link CompanyScope}, nunca de un parámetro: cada negocio ve lo suyo; el ADMIN (sin impersonar) ve lo de HotClick,
 * que no tiene cupo ni tope.
 */
@RestController
@RequestMapping("/api/agente/uso")
public class AgenteUsoController {

    /** @param cupo -1 = ilimitado; null = sin cupo (HotClick) */
    public record UsoAgenteDto(String mes, int conversaciones, Integer cupo, BigDecimal costoUsd, BigDecimal topeUsd,
                               boolean agenteIncluido) { }

    private final AgenteCupoService servicio;
    private final CompanyScope companyScope;

    public AgenteUsoController(AgenteCupoService servicio, CompanyScope companyScope) {
        this.servicio = servicio;
        this.companyScope = companyScope;
    }

    @GetMapping
    @PermiteLector // lectura del uso del negocio propio
    public ResponseEntity<UsoAgenteDto> uso() {
        AgenteCupoService.Resumen r = servicio.resumen(companyScope.requireEmpresaIdOrAdmin());
        return ResponseEntity.ok(new UsoAgenteDto(r.mes().toString().substring(0, 7), r.conversaciones(), r.cupo(),
            r.costoUsd(), r.topeUsd(), r.agenteIncluido()));
    }
}
