package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.EmpresaAprobacionService;
import com.hotclick.service.NotificacionEmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Aprobación / rechazo de empresas pendientes.
 * Extraído bit-idéntico de SolicitudAprobacionController — no cambia comportamiento.
 */
@Component
public class SolicitudEmpresaHandler {

    private final EmpresaRepository        empresaRepository;
    private final UsuarioRepository        usuarioRepository;
    private final NotificacionEmailService notificacionEmailService;
    private final EmpresaAprobacionService empresaAprobacionService;
    private final SolicitudAdminGuard      solicitudAdminGuard;

    SolicitudEmpresaHandler(EmpresaRepository empresaRepository,
                            UsuarioRepository usuarioRepository,
                            NotificacionEmailService notificacionEmailService,
                            EmpresaAprobacionService empresaAprobacionService,
                            SolicitudAdminGuard solicitudAdminGuard) {
        this.empresaRepository        = empresaRepository;
        this.usuarioRepository        = usuarioRepository;
        this.notificacionEmailService = notificacionEmailService;
        this.empresaAprobacionService = empresaAprobacionService;
        this.solicitudAdminGuard      = solicitudAdminGuard;
    }

    public ResponseEntity<ResponseDTO> aprobar(Long id) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        // Aprobar = activar + hacer visible + publicar productos, en una transacción.
        // Setear solo estado_empresa dejaba a la empresa fuera del catálogo público
        // (visibilidad_publica quedaba en false desde el registro).
        Empresa e = empresaAprobacionService.aprobarYPublicar(id);
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarAprobacionNegocio(
                u.getCorreo(), u.getNombre(),
                e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa()
            ));
        return ResponseEntity.ok(ResponseDTO.success("Empresa aprobada", null));
    }

    public ResponseEntity<ResponseDTO> rechazar(Long id) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        e.setEstadoEmpresa("RECHAZADO");
        empresaRepository.save(e);
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarRechazoNegocio(
                u.getCorreo(), u.getNombre(),
                e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa()
            ));
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", null));
    }
}
