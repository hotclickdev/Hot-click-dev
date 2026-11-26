package com.hotclick.agente.canal;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
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
    private final PropietarioGuard propietarioGuard;
    static final String MSG_ROL = "Solo el propietario o el administrador del negocio puede gestionar los canales.";

    public CanalCuentaAdminController(CanalCuentaService service, CompanyScope companyScope,
                                      TenantService tenantService, PropietarioGuard propietarioGuard) {
        this.service = service;
        this.companyScope = companyScope;
        this.tenantService = tenantService;
        this.propietarioGuard = propietarioGuard;
    }

    @GetMapping
    public ResponseEntity<List<CanalCuentaDto>> listar() {
        Long scope = alcance();
        return ResponseEntity.ok(service.listar(scope).stream().map(CanalCuentaDto::de).toList());
    }

    @PostMapping("/{id}/pausar")
    public ResponseEntity<CanalCuentaDto> pausar(@PathVariable Long id) {
        return ResponseEntity.ok(CanalCuentaDto.de(service.pausar(id, alcanceGestion())));
    }

    @PostMapping("/{id}/reanudar")
    public ResponseEntity<CanalCuentaDto> reanudar(@PathVariable Long id) {
        return ResponseEntity.ok(CanalCuentaDto.de(service.reanudar(id, alcanceGestion())));
    }

    @PostMapping("/{id}/desconectar")
    public ResponseEntity<CanalCuentaDto> desconectar(@PathVariable Long id) {
        return ResponseEntity.ok(CanalCuentaDto.de(service.desconectar(id, alcanceGestion())));
    }

    /** Pausar, reanudar y desconectar exigen el mismo nivel que conectar: propietario o administrador del negocio. */
    private Long alcanceGestion() {
        Long scope = alcance();
        if (scope != null && !propietarioGuard.puedeGestionarEmpresa(scope) && !propietarioGuard.esAdminEquipo(scope))
            throw new TenantAccessDeniedException(MSG_ROL);
        return scope;
    }

    /** null = ADMIN global; si no, la empresa del tenant, y su plan debe incluir la feature. */
    private Long alcance() {
        Long scope = companyScope.requireEmpresaIdOrAdmin();
        if (scope != null && !tenantService.tieneFeature("ai"))
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
        return scope;
    }
}
