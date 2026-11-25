package com.hotclick.agente.asesor;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PermiteLector;
import com.hotclick.service.TenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * {@code GET /api/bandeja/{id}/resumen} (AG-17): resumen y respuesta sugerida editable. Solo lee y propone; nunca
 * envía mensajes. Mismo alcance que la bandeja (empresa del llamador o ADMIN de plataforma con el bot de HotClick)
 * y exige la feature "ai". {@code @PermiteLector}: es una consulta, no modifica nada del negocio.
 */
@RestController
@RequestMapping("/api/bandeja")
public class ResumenConversacionController {

    private final ResumenConversacionService service;
    private final CompanyScope companyScope;
    private final TenantService tenantService;

    public ResumenConversacionController(ResumenConversacionService service, CompanyScope companyScope,
                                         TenantService tenantService) {
        this.service = service;
        this.companyScope = companyScope;
        this.tenantService = tenantService;
    }

    @PermiteLector
    @GetMapping("/{id}/resumen")
    public ResponseEntity<ResumenConversacionService.Resultado> resumen(@PathVariable UUID id) {
        Long scope = companyScope.requireEmpresaIdOrAdmin();
        if (scope != null && !tenantService.tieneFeature("ai"))
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
        return ResponseEntity.ok(service.generar(id, scope, companyScope.getCurrentUserId()));
    }
}
