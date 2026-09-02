package com.hotclick.service.email;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.service.ResendEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Envío de emails transaccionales de negocio (cupones, onboarding, equipo).
 * Extraído bit-idéntico de NotificacionEmailService — no cambia comportamiento.
 */
@Component
public class NotificacionNegocioEmailSender {

    private static final Logger log = LoggerFactory.getLogger(NotificacionNegocioEmailSender.class);

    @Autowired private ResendEmailService resendEmailService;
    @Autowired private NegocioEmailBuilder negocioEmailBuilder;
    @Autowired private EmailLayoutHelper emailLayoutHelper;

    public void enviarCuponBienvenida(String email, String codigo) {
        try {
            resendEmailService.send(email, "Tu cupón de 13% OFF — HotClick", negocioEmailBuilder.buildCuponBienvenida(codigo));
            log.info("Email cupón bienvenida enviado a {}", email);
        } catch (Exception e) {
            log.error("No se pudo enviar email de cupón a {}: {}", email, e.getMessage());
        }
    }

    public void enviarBienvenidaEmprendedor(String correo, String nombre, String nombreEmpresa) {
        try {
            resendEmailService.send(correo, "Tu tienda está lista en HotClick — " + emailLayoutHelper.esc(nombreEmpresa),
                negocioEmailBuilder.buildBienvenidaEmprendedor(nombre, nombreEmpresa));
            log.info("Email bienvenida emprendedor enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de bienvenida a {}: {}", correo, e.getMessage());
        }
    }

    public void enviarAprobacionNegocio(String correo, String nombre, String nombreEmpresa) {
        try {
            resendEmailService.send(correo, "Tu negocio " + emailLayoutHelper.esc(nombreEmpresa) + " fue aprobado — HotClick",
                negocioEmailBuilder.buildAprobacionNegocio(nombre, nombreEmpresa));
            log.info("Email aprobación enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de aprobación a {}: {}", correo, e.getMessage());
        }
    }

    public void enviarRechazoNegocio(String correo, String nombre, String nombreEmpresa) {
        try {
            resendEmailService.send(correo, "Actualización sobre tu solicitud — " + emailLayoutHelper.esc(nombreEmpresa),
                negocioEmailBuilder.buildRechazoNegocio(nombre, nombreEmpresa));
            log.info("Email rechazo enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de rechazo a {}: {}", correo, e.getMessage());
        }
    }

    /**
     * Enviada al nuevo miembro cuando el emprendedor lo agrega al equipo.
     * Si passwordPlano != null es un usuario nuevo y se incluyen las credenciales.
     * Si passwordPlano == null es un usuario existente que se suma a otro negocio.
     */
    public void enviarInvitacionMiembro(String correo, String nombre, String rolEnEmpresa,
                                 String nombreEmpresa, String passwordPlano) {
        try {
            resendEmailService.send(correo,
                "Te invitaron al equipo de " + emailLayoutHelper.esc(nombreEmpresa) + " en HotClick",
                negocioEmailBuilder.buildInvitacionMiembro(correo, nombre, rolEnEmpresa, nombreEmpresa, passwordPlano));
            log.info("Email invitación miembro enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de invitación a {}: {}", correo, e.getMessage());
        }
    }

    public void enviarAltaEmprendedorAdmin(String correoAdmin, String nombreEmpresa, String correo,
                                          boolean cupoGratis, CupoEmprendedorEstado estado) {
        try {
            resendEmailService.send(correoAdmin,
                "Nueva alta de emprendimiento — " + emailLayoutHelper.esc(nombreEmpresa),
                negocioEmailBuilder.buildAltaEmprendedorAdmin(nombreEmpresa, correo, cupoGratis, estado));
            log.info("Email alta emprendedor enviado a admin {}", correoAdmin);
        } catch (Exception e) {
            log.error("No se pudo enviar email de alta emprendedor a {}: {}", correoAdmin, e.getMessage());
        }
    }
}
