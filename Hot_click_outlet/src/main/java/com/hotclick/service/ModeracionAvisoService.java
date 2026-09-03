package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.email.NotificacionNegocioEmailSender;
import org.springframework.stereotype.Service;

/**
 * Avisos de moderación al vendedor: email + Telegram (fail-safe).
 */
@Service
public class ModeracionAvisoService {

    private final UsuarioRepository usuarioRepository;
    private final NotificacionNegocioEmailSender negocioEmailSender;
    private final TelegramNotificacionClienteService telegramNotificacionClienteService;

    public ModeracionAvisoService(
            UsuarioRepository usuarioRepository,
            NotificacionNegocioEmailSender negocioEmailSender,
            TelegramNotificacionClienteService telegramNotificacionClienteService) {
        this.usuarioRepository = usuarioRepository;
        this.negocioEmailSender = negocioEmailSender;
        this.telegramNotificacionClienteService = telegramNotificacionClienteService;
    }

    public void avisarAprobado(Long empresaId, String tipoLabel, String nombreItem) {
        if (empresaId == null) return;
        telegramNotificacionClienteService.notificarSolicitudAprobada(empresaId, tipoLabel, nombreItem);
        correoEmprendedor(empresaId).ifPresent(u ->
            negocioEmailSender.enviarModeracionAprobada(u.getCorreo(), u.getNombre(), tipoLabel, nombreItem));
    }

    public void avisarRechazado(Long empresaId, String tipoLabel, String nombreItem, String motivo) {
        if (empresaId == null) return;
        telegramNotificacionClienteService.notificarSolicitudRevision(empresaId, tipoLabel, nombreItem, motivo);
        correoEmprendedor(empresaId).ifPresent(u ->
            negocioEmailSender.enviarModeracionRechazada(u.getCorreo(), u.getNombre(), tipoLabel, nombreItem, motivo));
    }

    public void avisarResena(String correo, String nombre, boolean aprobada, String productoNombre) {
        if (correo == null || correo.isBlank()) return;
        negocioEmailSender.enviarResenaResultado(correo, nombre, aprobada, productoNombre);
    }

    /** Aviso al vendedor tras moderar un reporte (pausa y/o notas). Fail-safe vía callers. */
    public void avisarProductoModerado(Long empresaId, String nombreProducto, boolean pausado, String notas) {
        if (empresaId == null) return;
        telegramNotificacionClienteService.notificarProductoModerado(empresaId, nombreProducto, pausado, notas);
        correoEmprendedor(empresaId).ifPresent(u ->
            negocioEmailSender.enviarProductoModerado(u.getCorreo(), u.getNombre(), nombreProducto, pausado, notas));
    }

    private java.util.Optional<Usuario> correoEmprendedor(Long empresaId) {
        return usuarioRepository.findByEmpresaIdConRoles(empresaId).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst();
    }
}
