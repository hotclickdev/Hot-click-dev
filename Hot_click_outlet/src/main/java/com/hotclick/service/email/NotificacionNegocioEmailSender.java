package com.hotclick.service.email;

import java.util.Locale;
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
            resendEmailService.send(email, negocioEmailBuilder.asuntoCuponBienvenida(), negocioEmailBuilder.buildCuponBienvenida(codigo));
            log.info("Email cupón bienvenida enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de cupón: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarBienvenidaEmprendedor(String correo, String nombre, String nombreEmpresa) {
        try {
            resendEmailService.send(correo, "Tu tienda está lista en HotClick — " + emailLayoutHelper.esc(nombreEmpresa),
                negocioEmailBuilder.buildBienvenidaEmprendedor(nombre, nombreEmpresa));
            log.info("Email bienvenida emprendedor enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de bienvenida: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarAprobacionNegocio(String correo, String nombre, String nombreEmpresa) {
        try {
            resendEmailService.send(correo, "Tu negocio " + emailLayoutHelper.esc(nombreEmpresa) + " fue aprobado — HotClick",
                negocioEmailBuilder.buildAprobacionNegocio(nombre, nombreEmpresa));
            log.info("Email aprobación enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de aprobación: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarRechazoNegocio(String correo, String nombre, String nombreEmpresa) {
        enviarRechazoNegocio(correo, nombre, nombreEmpresa, null);
    }

    public void enviarRechazoNegocio(String correo, String nombre, String nombreEmpresa, String motivo) {
        try {
            resendEmailService.send(correo, "Actualización sobre tu solicitud — " + emailLayoutHelper.esc(nombreEmpresa),
                negocioEmailBuilder.buildRechazoNegocio(nombre, nombreEmpresa, motivo));
            log.info("Email rechazo enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de rechazo: {}", e.getClass().getSimpleName());
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
            log.info("Email invitación miembro enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de invitación: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarAltaEmprendedorAdmin(String correoAdmin, String nombreEmpresa, String correo,
                                          boolean cupoGratis, CupoEmprendedorEstado estado) {
        try {
            resendEmailService.send(correoAdmin,
                "Nueva alta de emprendimiento — " + emailLayoutHelper.esc(nombreEmpresa),
                negocioEmailBuilder.buildAltaEmprendedorAdmin(nombreEmpresa, correo, cupoGratis, estado));
            log.info("Email alta emprendedor enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de alta emprendedor: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarAltaEmprendedorPendienteAdmin(String correoAdmin, String nombreEmpresa, String correo,
                                                    CupoEmprendedorEstado estado) {
        try {
            resendEmailService.send(correoAdmin,
                "Nueva alta de emprendimiento — " + emailLayoutHelper.esc(nombreEmpresa),
                negocioEmailBuilder.buildAltaEmprendedorPendienteAdmin(nombreEmpresa, correo, estado));
            log.info("Email alta emprendedor pendiente enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de alta emprendedor pendiente: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarModeracionAprobada(String correo, String nombre, String tipoLabel, String nombreItem) {
        try {
            resendEmailService.send(correo,
                tipoLabel + " aprobado — HotClick",
                negocioEmailBuilder.buildModeracionAprobada(nombre, tipoLabel, nombreItem));
        } catch (Exception e) {
            log.error("No se pudo enviar email de moderación aprobada: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarModeracionRechazada(String correo, String nombre, String tipoLabel,
                                          String nombreItem, String motivo) {
        try {
            resendEmailService.send(correo,
                "Actualización sobre " + tipoLabel.toLowerCase(Locale.ROOT) + " — HotClick",
                negocioEmailBuilder.buildModeracionRechazada(nombre, tipoLabel, nombreItem, motivo));
        } catch (Exception e) {
            log.error("No se pudo enviar email de moderación rechazada: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarResenaResultado(String correo, String nombre, boolean aprobada, String productoNombre) {
        try {
            String asunto = aprobada
                ? "Tu reseña ya está publicada — HotClick"
                : "Actualización sobre tu reseña — HotClick";
            resendEmailService.send(correo, asunto,
                negocioEmailBuilder.buildResenaResultado(nombre, aprobada, productoNombre));
        } catch (Exception e) {
            log.error("No se pudo enviar email de reseña: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarProductoModerado(String correo, String nombre, String productoNombre,
                                       boolean pausado, String notas) {
        try {
            String asunto = pausado
                ? "Producto pausado — HotClick"
                : "Aviso sobre tu producto — HotClick";
            resendEmailService.send(correo, asunto,
                negocioEmailBuilder.buildProductoModerado(nombre, productoNombre, pausado, notas));
        } catch (Exception e) {
            log.error("No se pudo enviar email de producto moderado: {}", e.getClass().getSimpleName());
        }
    }

    public void enviarCambioCobroPendiente(String correo, String nombre, String tipoCuenta, String mascaraNueva) {
        try {
            resendEmailService.send(correo, "Cambio de cuenta de cobro en revisión — HotClick",
                negocioEmailBuilder.buildCambioCobroPendiente(nombre, tipoCuenta, mascaraNueva));
        } catch (Exception e) {
            log.error("No se pudo enviar email de cambio de cobro: {}", e.getClass().getSimpleName());
        }
    }
    public void enviarAlertaSobreventaAdmin(String correoAdmin, Long pagoId, String numerosPedidos,
                                            Integer monto, String proveedor) {
        try {
            String pedidos = emailLayoutHelper.esc(String.valueOf(numerosPedidos));
            resendEmailService.send(correoAdmin,
                "[ALERTA] Cobro sin stock — reembolso pendiente (pedidos " + pedidos + ")",
                "<p>Se registró un cobro sin stock para entregar (sobreventa).</p>"
                    + "<ul><li>Pago #" + pagoId + " · " + emailLayoutHelper.esc(String.valueOf(proveedor)) + "</li>"
                    + "<li>Monto: ₡" + (monto != null ? monto : 0) + "</li>"
                    + "<li>Pedidos: " + pedidos + " (en revisión por sobreventa, no se despachan)</li></ul>"
                    + "<p>El pago quedó en REEMBOLSO_PENDIENTE: gestioná el reembolso o la reposición desde "
                    + "Admin → Pagos (estado REEMBOLSO_PENDIENTE).</p>");
            log.info("Email alerta sobreventa enviado");
        } catch (Exception e) {
            log.error("No se pudo enviar email de alerta de sobreventa: {}", e.getClass().getSimpleName());
        }
    }

    /**
     * Aviso sin PII: solo id interno del pago, estado y link al admin. Lanza la excepción del envío para que
     * quien llama la registre (el pago ya quedó REEMBOLSO_PENDIENTE antes de este punto).
     */
    public void enviarAvisoReembolsoPendienteAdmin(String correoAdmin, Long pagoId, String estado, String linkAdmin) {
        enviarAvisoReembolsoPendienteAdmin(correoAdmin, pagoId, estado, linkAdmin, ReembolsoPendienteResumenItem.Origen.ONVO_CANCELADO);
    }

    /** Aviso individual con asunto y texto según el origen del REEMBOLSO_PENDIENTE. Sin PII. Lanza si falla el envío. */
    public void enviarAvisoReembolsoPendienteAdmin(String correoAdmin, Long pagoId, String estado, String linkAdmin,
                                                   ReembolsoPendienteResumenItem.Origen origen) {
        String est = emailLayoutHelper.esc(String.valueOf(estado));
        String link = emailLayoutHelper.esc(String.valueOf(linkAdmin));
        ReembolsoPendienteResumenItem.Origen o = origen == null ? ReembolsoPendienteResumenItem.Origen.OTRO : origen;
        String asunto;
        String texto;
        switch (o) {
            case ONVO_CANCELADO -> { asunto = "Cobro sobre pedido cancelado";
                texto = "ONVO cobró un pedido que ya estaba cancelado. No se reactivó el pedido ni se tocó el stock."; }
            case SINPE -> { asunto = "Cobro SINPE sobre pedido cancelado";
                texto = "Se confirmó un cobro SINPE (vía ONVO) de un pedido que ya estaba cancelado. No se reactivó el pedido ni se tocó el stock."; }
            case SOBREVENTA -> { asunto = "Cobro sin stock (sobreventa)";
                texto = "Se cobró un pedido sin stock para entregar. El pedido quedó en revisión por sobreventa y no se despacha."; }
            default -> { asunto = "Cobro sin venta";
                texto = "Se registró un cobro sin venta asociada (origen no determinable)."; }
        }
        resendEmailService.send(correoAdmin,
            "[ALERTA] " + asunto + " — pago #" + pagoId + " en " + est,
            "<p>" + texto + "</p>"
                + "<ul><li>Pago #" + pagoId + "</li><li>Estado: " + est + "</li></ul>"
                + "<p>Gestioná el reembolso desde <a href=\"" + link + "\">" + link + "</a>.</p>");
    }

    /** Resumen único de REEMBOLSO_PENDIENTE anteriores a V217 sin avisar: id, monto y fecha. Sin datos del cliente. */
    public void enviarResumenReembolsosPendientesAdmin(String correoAdmin,
            java.util.List<ReembolsoPendienteResumenItem> pagos, String linkAdmin) {
        String link = emailLayoutHelper.esc(String.valueOf(linkAdmin));
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        java.util.Map<ReembolsoPendienteResumenItem.Origen, java.util.List<ReembolsoPendienteResumenItem>> porOrigen =
            new java.util.EnumMap<>(ReembolsoPendienteResumenItem.Origen.class);
        for (ReembolsoPendienteResumenItem p : pagos) {
            ReembolsoPendienteResumenItem.Origen o = p.origen() == null ? ReembolsoPendienteResumenItem.Origen.OTRO : p.origen();
            porOrigen.computeIfAbsent(o, k -> new java.util.ArrayList<>()).add(p);
        }
        StringBuilder filas = new StringBuilder();
        for (var grupo : porOrigen.entrySet()) {
            filas.append("<h3>").append(emailLayoutHelper.esc(grupo.getKey().titulo())).append(" (")
                .append(grupo.getValue().size()).append(")</h3>")
                .append("<table><tr><th>Pago</th><th>Monto</th><th>Fecha</th></tr>");
            for (ReembolsoPendienteResumenItem p : grupo.getValue()) {
                filas.append("<tr><td>#").append(p.pagoId()).append("</td><td>")
                    .append(p.monto() == null ? "-" : String.valueOf(p.monto())).append(' ')
                    .append(emailLayoutHelper.esc(p.moneda() == null ? "" : p.moneda())).append("</td><td>")
                    .append(p.fecha() == null ? "-" : p.fecha().format(f)).append("</td></tr>");
            }
            filas.append("</table>");
        }
        resendEmailService.send(correoAdmin,
            "[ALERTA] " + pagos.size() + " cobros pendientes de reembolso sin avisar (anteriores al aviso automático)",
            "<p>Estos pagos quedaron REEMBOLSO_PENDIENTE antes de que existiera el aviso automático y nunca se avisaron.</p>"
                + filas
                + "<p>Gestioná los reembolsos desde <a href=\"" + link + "\">" + link + "</a>.</p>");
    }

}
