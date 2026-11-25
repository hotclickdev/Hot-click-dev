package com.hotclick.agente.canal;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Gestión mínima de las cuentas conectadas. El alta real (Embedded Signup) es AG-23. Cada negocio ve y gestiona
 * solo las suyas; el ADMIN ve todas. Exige la feature "ai" del plan (provisional hasta definir la del agente).
 */
@RestController
@RequestMapping("/api/agente/canales")
public class CanalCuentaAdminController {

    private final CanalCuentaService service;
    private final CompanyScope companyScope;
    private final TenantService tenantService;

    public CanalCuentaAdminController(CanalCuentaService service, CompanyScope companyScope,
                                      TenantService tenantService) {
        this.service = service;
        this.companyScope = companyScope;
        this.tenantService = tenantService;
    }

    @GetMapping
    public ResponseEntity<List<CanalCuentaDto>> listar() {
        Long scope = alcance();
        return ResponseEntity.ok(service.listar(scope).stream().map(CanalCuentaDto::de).toList());
    }

    @PostMapping("/{id}/pausar")
    public ResponseEntity<CanalCuentaDto> pausar(@PathVariable Long id) {
        return ResponseEntity.ok(CanalCuentaDto.de(service.pausar(id, alcance())));
    }

    @PostMapping("/{id}/reanudar")
    public ResponseEntity<CanalCuentaDto> reanudar(@PathVariable Long id) {
        return ResponseEntity.ok(CanalCuentaDto.de(service.reanudar(id, alcance())));
    }

    @PostMapping("/{id}/desconectar")
    public ResponseEntity<CanalCuentaDto> desconectar(@PathVariable Long id) {
        return ResponseEntity.ok(CanalCuentaDto.de(service.desconectar(id, alcance())));
    }

    /** null = ADMIN global; si no, la empresa del tenant, y su plan debe incluir la feature. */
    private Long alcance() {
        Long scope = companyScope.requireEmpresaIdOrAdmin();
        if (scope != null && !tenantService.tieneFeature("ai"))
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
        return scope;
    }
}
