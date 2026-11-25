package com.hotclick.agente.conexion;

import com.hotclick.agente.conexion.ConexionDtos.ConectarPaginaRequest;
import com.hotclick.agente.conexion.ConexionDtos.ConexionResultado;
import com.hotclick.agente.conexion.ConexionDtos.ConfigPublica;
import com.hotclick.agente.conexion.ConexionDtos.PaginaDto;
import com.hotclick.agente.conexion.ConexionDtos.PaginasRequest;
import com.hotclick.agente.conexion.ConexionDtos.WhatsappRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.TenantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Conexión de cuentas de Meta desde el panel. Cada negocio conecta solo lo suyo ({@code CompanyScope}); el ADMIN
 * conecta las de HotClick. Solo el PROPIETARIO o el administrador del negocio (no EDITOR, LECTOR ni CAJERO, ni
 * sesión de soporte) y con la feature "ai" del plan. Sin configuración de la app de Meta responde 503.
 */
@RestController
@RequestMapping("/api/agente/conexion")
public class ConexionMetaController {

    static final String MSG_ROL = "Solo el propietario o el administrador del negocio puede conectar cuentas.";

    private final ConexionMetaService service;
    private final CompanyScope companyScope;
    private final TenantService tenantService;
    private final PropietarioGuard propietarioGuard;

    public ConexionMetaController(ConexionMetaService service, CompanyScope companyScope,
                                  TenantService tenantService, PropietarioGuard propietarioGuard) {
        this.service = service;
        this.companyScope = companyScope;
        this.tenantService = tenantService;
        this.propietarioGuard = propietarioGuard;
    }

    @GetMapping("/config")
    public ResponseEntity<ConfigPublica> config() {
        alcance();
        return ResponseEntity.ok(service.configPublica());
    }

    @PostMapping("/whatsapp")
    public ResponseEntity<ConexionResultado> whatsapp(@Valid @RequestBody WhatsappRequest req) {
        return ResponseEntity.ok(service.conectarWhatsapp(alcance(), req));
    }

    @PostMapping("/meta-paginas/listar")
    public ResponseEntity<List<PaginaDto>> listar(@Valid @RequestBody PaginasRequest req) {
        alcance();
        return ResponseEntity.ok(service.listarPaginas(req.accessToken()));
    }

    @PostMapping("/meta-paginas")
    public ResponseEntity<ConexionResultado> conectarPagina(@Valid @RequestBody ConectarPaginaRequest req) {
        return ResponseEntity.ok(service.conectarPagina(alcance(), req.accessToken(), req.paginaId()));
    }

    /** null = ADMIN global (cuentas de HotClick); si no, la empresa del tenant con plan con IA y rol de gestión. */
    private Long alcance() {
        Long scope = companyScope.requireEmpresaIdOrAdmin();
        if (scope == null) return null;
        if (!tenantService.tieneFeature("ai"))
            throw new TenantAccessDeniedException("Los bots de venta requieren un plan con IA");
        if (!propietarioGuard.puedeGestionarEmpresa(scope) && !propietarioGuard.esAdminEquipo(scope))
            throw new TenantAccessDeniedException(MSG_ROL);
        return scope;
    }

    @ExceptionHandler(ConexionNoConfiguradaException.class)
    ResponseEntity<ResponseDTO> noConfigurada(ConexionNoConfiguradaException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ResponseDTO.error(e.getMessage()));
    }

    @ExceptionHandler(MetaRechazoException.class)
    ResponseEntity<ResponseDTO> rechazo(MetaRechazoException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ResponseDTO.error(e.getMessage()));
    }
}
