package com.hotclick.service.email;

import com.hotclick.model.EncargoPersonalizado;
import com.hotclick.service.ResendEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EncargoEmailSender {

    private static final Logger log = LoggerFactory.getLogger(EncargoEmailSender.class);

    @Autowired private ResendEmailService resendEmailService;
    @Autowired private EmailLayoutHelper layout;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl;

    public void notificarNuevoEncargoAlArtista(String correoArtista, String nombreArtista,
                                               EncargoPersonalizado encargo) {
        if (correoArtista == null || correoArtista.isBlank()) return;
        try {
            String producto = layout.esc(encargo.getProductoNombre());
            String html = layout.abrirHtml()
                + layout.header("Nuevo encargo personalizado", producto)
                + layout.abrirCuerpo()
                + "<p>Hola " + layout.esc(nombreArtista) + ",</p>"
                + "<p>Recibiste un nuevo encargo de <strong>" + layout.esc(encargo.getNombreCliente()) + "</strong>.</p>"
                + "<p>Revisá las imágenes de referencia y respondé con un precio o rechazo desde tu panel.</p>"
                + layout.cta(appUrl + "/admin/encargos", "Ver encargos")
                + layout.footer("¿Tenés dudas sobre este encargo?");
            resendEmailService.send(correoArtista, "Nuevo encargo: " + producto, html);
        } catch (Exception e) {
            log.error("No se pudo notificar encargo al artista {}: {}", correoArtista, e.getMessage());
        }
    }

    public void notificarEncargoAprobado(EncargoPersonalizado encargo) {
        try {
            String producto = layout.esc(encargo.getProductoNombre());
            String precio = "₡" + EmailLayoutHelper.CRC.format(encargo.getPrecioCotizado());
            String link = appUrl + "/encargo/" + encargo.getTokenPublico();
            String html = layout.abrirHtml()
                + layout.header("Tu encargo fue aprobado", producto)
                + layout.abrirCuerpo()
                + "<p>Hola " + layout.esc(encargo.getNombreCliente()) + ",</p>"
                + "<p>El artista aprobó tu encargo de <strong>" + producto + "</strong>.</p>"
                + "<p>Precio: <strong>" + precio + "</strong>. Tenés 7 días para pagar.</p>"
                + mensajeVendedorHtml(encargo)
                + layout.cta(link, "Pagar ahora")
                + layout.footer("¿Tenés dudas sobre tu encargo?");
            resendEmailService.send(encargo.getEmail(), "Encargo aprobado — " + producto, html);
        } catch (Exception e) {
            log.error("No se pudo notificar aprobación de encargo {}: {}", encargo.getId(), e.getMessage());
        }
    }

    public void notificarEncargoRechazado(EncargoPersonalizado encargo) {
        try {
            String producto = layout.esc(encargo.getProductoNombre());
            String html = layout.abrirHtml()
                + layout.header("Encargo no disponible", producto)
                + layout.abrirCuerpo()
                + "<p>Hola " + layout.esc(encargo.getNombreCliente()) + ",</p>"
                + "<p>Lamentablemente el artista no pudo aceptar tu encargo de <strong>" + producto + "</strong>.</p>"
                + "<p><strong>Motivo:</strong> " + layout.esc(encargo.getMotivoRechazo()) + "</p>"
                + layout.footer("¿Querés intentar con otro producto?");
            resendEmailService.send(encargo.getEmail(), "Actualización de tu encargo — " + producto, html);
        } catch (Exception e) {
            log.error("No se pudo notificar rechazo de encargo {}: {}", encargo.getId(), e.getMessage());
        }
    }

    public void notificarEncargoRecibidoCliente(EncargoPersonalizado encargo) {
        try {
            String producto = layout.esc(encargo.getProductoNombre());
            String link = appUrl + "/encargo/" + encargo.getTokenPublico();
            String html = layout.abrirHtml()
                + layout.header("Encargo recibido", producto)
                + layout.abrirCuerpo()
                + "<p>Hola " + layout.esc(encargo.getNombreCliente()) + ",</p>"
                + "<p>Recibimos tu solicitud de encargo personalizado. El artista lo revisará y te avisaremos.</p>"
                + layout.cta(link, "Ver estado del encargo")
                + layout.footer("¿Tenés dudas sobre tu encargo?");
            resendEmailService.send(encargo.getEmail(), "Recibimos tu encargo — " + producto, html);
        } catch (Exception e) {
            log.error("No se pudo confirmar encargo al cliente {}: {}", encargo.getId(), e.getMessage());
        }
    }

    public void notificarEncargoVencido(EncargoPersonalizado encargo) {
        try {
            String producto = layout.esc(encargo.getProductoNombre());
            String link = appUrl + "/encargo/" + encargo.getTokenPublico();
            String html = layout.abrirHtml()
                + layout.header("Cotización vencida", producto)
                + layout.abrirCuerpo()
                + "<p>Hola " + layout.esc(encargo.getNombreCliente()) + ",</p>"
                + "<p>La cotización de tu encargo de <strong>" + producto + "</strong> venció.</p>"
                + "<p>Podés solicitar un nuevo encargo desde la tienda del artista.</p>"
                + layout.cta(link, "Ver encargo")
                + layout.footer("¿Tenés dudas?");
            resendEmailService.send(encargo.getEmail(), "Cotización vencida — " + producto, html);
        } catch (Exception e) {
            log.error("No se pudo notificar vencimiento de encargo {}: {}", encargo.getId(), e.getMessage());
        }
    }

    private String mensajeVendedorHtml(EncargoPersonalizado encargo) {
        if (encargo.getMensajeVendedor() == null || encargo.getMensajeVendedor().isBlank()) {
            return "";
        }
        return "<p><strong>Nota del artista:</strong> " + layout.esc(encargo.getMensajeVendedor()) + "</p>";
    }
}
