package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.EmpresaAprobacionService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.TelegramNotificacionClienteService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * Aprobación / rechazo de empresas pendientes.
 */
@Component
public class SolicitudEmpresaHandler {

    private final EmpresaRepository        empresaRepository;
    private final UsuarioRepository        usuarioRepository;
    private final NotificacionEmailService notificacionEmailService;
    private final EmpresaAprobacionService empresaAprobacionService;
    private final SolicitudAdminGuard      solicitudAdminGuard;
    private final TelegramNotificacionClienteService telegramNotificacionClienteService;

    SolicitudEmpresaHandler(EmpresaRepository empresaRepository,
                            UsuarioRepository usuarioRepository,
                            NotificacionEmailService notificacionEmailService,
                            EmpresaAprobacionService empresaAprobacionService,
                            SolicitudAdminGuard solicitudAdminGuard,
                            TelegramNotificacionClienteService telegramNotificacionClienteService) {
        this.empresaRepository        = empresaRepository;
        this.usuarioRepository        = usuarioRepository;
        this.notificacionEmailService = notificacionEmailService;
        this.empresaAprobacionService = empresaAprobacionService;
        this.solicitudAdminGuard      = solicitudAdminGuard;
        this.telegramNotificacionClienteService = telegramNotificacionClienteService;
    }

    public ResponseEntity<ResponseDTO> aprobar(Long id) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = empresaAprobacionService.aprobarYPublicar(id);
        String nombreNegocio = nombreNegocio(e);
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarAprobacionNegocio(
                u.getCorreo(), u.getNombre(), nombreNegocio));
        telegramNotificacionClienteService.notificarSolicitudAprobada(e.getId(), "Negocio", nombreNegocio);
        return ResponseEntity.ok(ResponseDTO.success("Empresa aprobada", null));
    }

    public ResponseEntity<ResponseDTO> rechazar(Long id, Map<String, String> body) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        e.setEstadoEmpresa("RECHAZADO");
        empresaRepository.save(e);
        String nombreNegocio = nombreNegocio(e);
        String motivo = body != null ? body.get("comentario") : null;
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarRechazoNegocio(
                u.getCorreo(), u.getNombre(), nombreNegocio, motivo));
        telegramNotificacionClienteService.notificarSolicitudRevision(
            e.getId(), "Negocio", nombreNegocio, motivo);
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", null));
    }

    private static String nombreNegocio(Empresa e) {
        return e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa();
    }
}
