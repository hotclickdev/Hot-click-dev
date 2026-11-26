package com.hotclick.agente.catalogo;

import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.agente.panel.PanelAcceso;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.PermiteLector;
import com.hotclick.security.PropietarioGuard;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Catálogo de Meta del negocio (AG-37). La empresa sale SIEMPRE de {@link PanelAcceso}. Conectar, sincronizar y
 * desconectar exigen rol de gestión; ver el estado es de lectura.
 */
@RestController
@RequestMapping("/api/agente/catalogo")
public class CatalogoController {

    public record ConectarPedido(String catalogoId) { }

    private final CatalogoMetaService servicio;
    private final PanelAcceso acceso;
    private final PropietarioGuard propietarioGuard;

    public CatalogoController(CatalogoMetaService servicio, PanelAcceso acceso, PropietarioGuard propietarioGuard) {
        this.servicio = servicio;
        this.acceso = acceso;
        this.propietarioGuard = propietarioGuard;
    }

    private Long gestion() {
        Long empresaId = acceso.empresa();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId) && !propietarioGuard.esAdminEquipo(empresaId))
            throw new TenantAccessDeniedException("Solo el dueño o el administrador del negocio puede gestionar el catálogo");
        return empresaId;
    }

    @PermiteLector
    @GetMapping
    public ResponseEntity<CatalogoMetaService.Estado> estado() {
        return ResponseEntity.ok(servicio.estado(acceso.empresa()));
    }

    @PostMapping
    public ResponseEntity<CatalogoMetaService.Estado> conectar(@RequestBody ConectarPedido p) {
        Long empresaId = gestion();
        return ResponseEntity.ok(servicio.conectar(empresaId, p == null ? null : p.catalogoId()));
    }

    /** Sincronización completa a pedido del negocio (además del barrido diario). */
    @PostMapping("/sincronizar")
    public ResponseEntity<Map<String, Integer>> sincronizar() {
        Long empresaId = gestion();
        return ResponseEntity.ok(Map.of("pedidos", servicio.barrer(empresaId)));
    }

    @DeleteMapping
    public ResponseEntity<Void> desconectar() {
        servicio.desconectar(gestion());
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(MetaRechazoException.class)
    ResponseEntity<ResponseDTO> rechazo(MetaRechazoException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ResponseDTO.error(e.getMessage()));
    }
}
