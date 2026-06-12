package com.hotclick.service;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Usuario;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Emails transaccionales con la plantilla del Brand Book HotClick v1.1 (cap. 12.1):
 * header azul 900 con wordmark bicolor, cuerpo blanco, UN solo CTA rojo por correo,
 * colores semánticos del cap. 3.3 y footer neutro 900. Tono: voseo costarricense
 * (cap. 15.3) — el usuario nunca tiene la culpa y todo error trae salida (cap. 10.3).
 */
@Service
public class NotificacionEmailService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionEmailService.class);
    private static final NumberFormat CRC = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));

    // Tipografía con fallback de email (cap. 12.1): Sora → Arial Black · Public Sans → Arial
    private static final String F_TEXT    = "'Public Sans',Arial,Helvetica,sans-serif";
    private static final String F_DISPLAY = "'Sora','Arial Black',Arial,sans-serif";

    @Autowired private ResendEmailService resendEmailService;
    @Autowired private WhatsAppService    whatsAppService;

    /* ──────────────────────────── piezas compartidas ──────────────────────────── */

    /** Wordmark bicolor (§2.1). Sobre fondo oscuro el rojo sube un paso y «Click» pasa a blanco (§2.4). */
    private String wordmark(boolean sobreOscuro) {
        String hot   = sobreOscuro ? "#F0524A" : "#E73B33";
        String click = sobreOscuro ? "#FFFFFF" : "#1747A8";
        return "<span style=\"font-family:" + F_DISPLAY + ";font-weight:800;font-size:20px;letter-spacing:-0.5px\">"
             + "<span style='color:" + hot + "'>Hot</span><span style='color:" + click + "'>Click</span></span>";
    }

    private String abrirHtml() {
        return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
             + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
             + "<body style=\"margin:0;padding:0;background:#F8F9FB;font-family:" + F_TEXT + "\">"
             + "<div style='max-width:600px;margin:32px auto;padding:0 16px'>";
    }

    /** Header de campaña sobre azul 900 (§5.3): el rojo queda reservado al CTA. */
    private String header(String titulo, String sub) {
        return "<div style='background:#152B5E;border-radius:16px 16px 0 0;padding:32px 36px 28px;text-align:center'>"
             + wordmark(true)
             + "<h1 style=\"margin:18px 0 0;color:#FFFFFF;font-size:26px;font-weight:800;line-height:1.2;font-family:" + F_DISPLAY + "\">" + titulo + "</h1>"
             + (sub != null ? "<p style='margin:10px 0 0;color:#C2D5F9;font-size:14px'>" + sub + "</p>" : "")
             + "</div>";
    }

    private String abrirCuerpo() {
        return "<div style='background:#FFFFFF;padding:32px 36px;border-left:1px solid #E4E7EC;border-right:1px solid #E4E7EC'>";
    }

    /** CTA primario — Rojo Hot, uno por correo (cap. 3.5 / 12.1). */
    private String cta(String url, String label) {
        return "<div style='text-align:center;padding:8px 0'>"
             + "<a href='" + esc(url) + "' style='display:inline-block;background:#E73B33;color:#FFFFFF;text-decoration:none;"
             + "padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700'>" + label + "</a></div>";
    }

    /** Footer neutro 900 con soporte por WhatsApp (canal primario, cap. 15) y firma. */
    private String footer(String pregunta) {
        return "</div>"
             + "<div style='background:#14171C;border-radius:0 0 16px 16px;padding:28px 36px;text-align:center'>"
             + "<p style='margin:0 0 14px;color:#9AA1AE;font-size:13px'>" + pregunta + "</p>"
             + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#FFFFFF;text-decoration:none;"
             + "padding:11px 26px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:20px'>Escribinos por WhatsApp</a>"
             + "<div style='border-top:1px solid #232830;padding-top:16px;margin-top:4px'>"
             + "<p style='margin:0 0 4px'>" + wordmark(true) + "</p>"
             + "<p style='margin:0;color:#6E7682;font-size:11px'>hotclick.cr@gmail.com · Costa Rica · <a href='https://hotclick.lat' style='color:#6E7682'>hotclick.lat</a></p>"
             + "</div></div>"
             + "</div></body></html>";
    }

    /* ──────────────────────────── notificaciones de pedido ──────────────────────────── */

    @Async
    public void enviarConfirmacionPedido(Pedido pedido) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null) return;
        // Email
        if (cliente.getCorreo() != null) {
            try {
                resendEmailService.send(
                    cliente.getCorreo(),
                    "Pedido confirmado — " + pedido.getNumeroPedido(),
                    buildHtml(pedido, cliente)
                );
                log.info("Email confirmación enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
            } catch (Exception e) {
                log.error("No se pudo enviar email de confirmación para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
            }
        }
        // WhatsApp — en paralelo, falla silenciosamente
        whatsAppService.enviarConfirmacionPedido(pedido);
    }

    @Async
    public void enviarNotificacionGuia(Pedido pedido) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null) return;
        // Email
        if (cliente.getCorreo() != null) {
            try {
                resendEmailService.send(
                    cliente.getCorreo(),
                    "Tu pedido va en camino — " + pedido.getNumeroPedido(),
                    buildGuiaHtml(pedido, cliente)
                );
                log.info("Email guía enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
            } catch (Exception e) {
                log.error("No se pudo enviar email de guía para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
            }
        }
        // WhatsApp
        whatsAppService.enviarGuiaAsignada(pedido);
    }

    @Async
    public void enviarSeguimientoEstado(Pedido pedido) {
        enviarSeguimientoEstado(pedido, null);
    }

    @Async
    public void enviarSeguimientoEstado(Pedido pedido, String nota) {
        try { enviarSeguimientoEstadoSync(pedido, nota); }
        catch (Exception e) { log.error("No se pudo enviar email de seguimiento para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage()); }
    }

    /** Versión síncrona — lanza excepción si SendGrid falla (usar desde el endpoint /notificar). */
    public void enviarSeguimientoEstadoSync(Pedido pedido, String nota) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null || cliente.getCorreo() == null)
            throw new RuntimeException("El pedido no tiene correo de cliente registrado");
        resendEmailService.send(
            cliente.getCorreo(),
            "Actualización de tu pedido — " + pedido.getNumeroPedido(),
            buildSeguimientoHtml(pedido, cliente, nota)
        );
        log.info("Email seguimiento enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
    }

    @Async
    public void enviarRecuperacionCarrito(
            String email, Long carritoId,
            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,
            String appUrl) {
        try {
            resendEmailService.send(
                email,
                "Tu carrito te espera — HotClick",
                buildRecuperacionCarritoHtml(carritoId, items, appUrl)
            );
            log.info("Email recuperación carrito enviado a {} (carrito {})", email, carritoId);
        } catch (Exception e) {
            log.error("No se pudo enviar email de recuperación de carrito {}: {}", carritoId, e.getMessage());
        }
    }

    private String buildRecuperacionCarritoHtml(
            Long carritoId,
            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,
            String appUrl) {

        StringBuilder rows = new StringBuilder();
        int total = 0;
        for (CarritoAbandonadoRequestDTO.CartItemDTO item : items) {
            int subtotal = (item.getPrecio() != null ? item.getPrecio() : 0)
                         * (item.getCantidad() != null ? item.getCantidad() : 1);
            total += subtotal;
            String img = item.getImagenUrl() != null
                ? "<img src='" + esc(item.getImagenUrl()) + "' width='48' height='48' style='object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:10px'>"
                : "";
            rows.append("<tr>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #E4E7EC;color:#14171C'>")
                .append(img).append(esc(item.getNombre())).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #E4E7EC;text-align:center;color:#4D5560'>×")
                .append(item.getCantidad() != null ? item.getCantidad() : 1).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #E4E7EC;text-align:right;font-weight:700;color:#14171C'>₡")
                .append(CRC.format(subtotal)).append("</td>")
                .append("</tr>");
        }

        String recoverUrl = appUrl + "/recuperar-carrito/" + carritoId;

        return abrirHtml()
            + header("Tu carrito te espera", "Dejaste productos sin completar la compra")
            + abrirCuerpo()
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Guardamos tu carrito tal cual lo dejaste. Completá la compra antes de que se agote el stock.</p>"
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<tbody>" + rows + "</tbody>"
            + "</table>"
            + "<div style='background:#F8F9FB;border-radius:10px;padding:16px 20px;text-align:right;margin-bottom:28px'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:16px;font-family:" + F_DISPLAY + "\">Total estimado: ₡" + CRC.format(total) + "</span>"
            + "</div>"
            + cta(recoverUrl, "Recuperar mi carrito")
            + "<p style='margin:16px 0 0;color:#9AA1AE;font-size:11px;text-align:center'>Si ya no querés recordatorios, simplemente ignorá este mensaje.</p>"
            + footer("¿Tenés alguna pregunta?");
    }

    @Async
    public void enviarPagoFallido(Pedido pedido, String motivo) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null || cliente.getCorreo() == null) return;
        try {
            resendEmailService.send(
                cliente.getCorreo(),
                "Problema con tu pago — " + pedido.getNumeroPedido(),
                buildPagoFallidoHtml(pedido, cliente, motivo)
            );
            log.info("Email pago fallido enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
        } catch (Exception e) {
            log.error("No se pudo enviar email de pago fallido para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
        }
    }

    private String buildSeguimientoHtml(Pedido pedido, Usuario cliente, String nota) {
        String nombre  = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        String estado  = esc(pedido.getEstadoPedido() != null ? pedido.getEstadoPedido() : "—");
        boolean esRetiro = !"ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio());

        StringBuilder items = new StringBuilder();
        if (pedido.getItems() != null) {
            for (PedidoItem item : pedido.getItems()) {
                String prod = item.getProducto() != null ? item.getProducto().getNombreProducto() : "Producto";
                items.append("<tr>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;font-size:13px;color:#14171C'>").append(esc(prod)).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;text-align:center;font-size:13px;color:#4D5560'>×").append(item.getCantidad()).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #E4E7EC;text-align:right;font-size:13px;color:#14171C'>₡").append(CRC.format(item.getSubtotalItem())).append("</td>")
                    .append("</tr>");
            }
        }

        String guiaSection = "";
        if (pedido.getNumeroGuia() != null && !pedido.getNumeroGuia().isBlank()) {
            boolean isCorreos = pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
            String url = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
                : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();
            String courierLabel = isCorreos ? "Correos de Costa Rica" : "Entrega directa por HotClick";
            guiaSection = "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center'>"
                + "<p style='margin:0 0 4px;font-size:12px;color:#178A50;font-weight:700;text-transform:uppercase;letter-spacing:1px'>Envío · " + esc(courierLabel) + "</p>"
                + "<p style='margin:0 0 4px;font-size:12px;color:#4D5560'>Número de guía</p>"
                + "<p style=\"margin:0 0 12px;font-size:20px;font-weight:800;color:#14171C;letter-spacing:2px;font-family:'IBM Plex Mono',monospace\">" + esc(pedido.getNumeroGuia()) + "</p>"
                + "<a href='" + url + "' style='display:inline-block;background:#E73B33;color:#FFFFFF;text-decoration:none;padding:9px 22px;border-radius:10px;font-size:13px;font-weight:700'>Rastrear paquete</a>"
                + "</div>";
        }

        String retiroSection = "";
        if (esRetiro && ("LISTO_RETIRO".equals(pedido.getEstadoPedido()) || "EN_PREPARACION".equals(pedido.getEstadoPedido()))) {
            retiroSection = "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center'>"
                + "<p style='margin:0 0 8px;font-size:14px;color:#14171C;font-weight:700'>Retiro en tienda</p>"
                + "<p style='margin:0 0 12px;font-size:13px;color:#4D5560'>HotClick · Centro Comercial · Costa Rica</p>"
                + "<a href='https://waze.com/ul?ll=9.9342,-84.0877&navigate=yes' style='display:inline-block;border:1px solid #1747A8;color:#1747A8;text-decoration:none;padding:8px 20px;border-radius:10px;font-size:13px;font-weight:700'>Cómo llegar (Waze)</a>"
                + "</div>";
        }

        String notaSection = (nota != null && !nota.isBlank())
            ? "<div style='background:#FDF3DC;border:1px solid #EBD9A8;border-radius:12px;padding:14px 18px;margin-bottom:20px'>"
                + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#9A6700;text-transform:uppercase;letter-spacing:1px'>Mensaje de HotClick</p>"
                + "<p style='margin:0;font-size:14px;color:#14171C'>" + esc(nota) + "</p>"
                + "</div>"
            : "";

        // Estados con los colores semánticos del cap. 3.3 / 6.2
        String estadoColor;
        switch (pedido.getEstadoPedido() != null ? pedido.getEstadoPedido() : "") {
            case "PAGADO":         estadoColor = "#1747A8"; break;
            case "EN_PREPARACION": estadoColor = "#9A6700"; break;
            case "LISTO_RETIRO":   estadoColor = "#1747A8"; break;
            case "ENVIADO":        estadoColor = "#178A50"; break;
            case "ENTREGADO":      estadoColor = "#178A50"; break;
            case "CANCELADO":      estadoColor = "#D02A23"; break;
            default:               estadoColor = "#6E7682";
        }

        return abrirHtml()
            + header("Actualización de tu pedido", "Tenemos novedades para vos")
            + abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombre + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Esta es la información actualizada de tu pedido <strong style='color:#14171C'>" + esc(pedido.getNumeroPedido()) + "</strong>.</p>"

            // Badge de estado: punto de color + texto (cap. 6.2)
            + "<div style='background:#F8F9FB;border:1px solid #E4E7EC;border-radius:12px;padding:16px 20px;margin-bottom:20px'>"
            + "<p style='margin:0 0 2px;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Estado actual</p>"
            + "<p style='margin:0;font-size:16px;font-weight:800;color:" + estadoColor + "'>&#9679; " + estado + "</p>"
            + "</div>"

            + notaSection
            + guiaSection
            + retiroSection

            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<tbody>" + items + "</tbody>"
            + "</table>"

            + "<div style='background:#F8F9FB;border-radius:10px;padding:16px 20px;text-align:right'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:16px;font-family:" + F_DISPLAY + "\">Total: ₡" + CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div>"
            + footer("¿Tenés alguna pregunta?");
    }

    private String buildGuiaHtml(Pedido pedido, Usuario cliente) {
        String nombre = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        String guia   = esc(pedido.getNumeroGuia());
        boolean isCorreos = pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
        String url    = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
            : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();
        String courierNombre = isCorreos ? "Correos de Costa Rica" : "HotClick Express";

        return abrirHtml()
            + header("Tu pedido va en camino", "Ya salió de nuestras manos hacia las tuyas")
            + abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombre + "</strong>.</p>"
            + "<p style='margin:0 0 28px;color:#4D5560;font-size:14px;line-height:1.6'>Tu pedido <strong style='color:#14171C'>" + esc(pedido.getNumeroPedido()) + "</strong> fue enviado con <strong>" + courierNombre + "</strong>.</p>"

            // Número de guía en mono (cap. 4.1: datos en IBM Plex Mono)
            + "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px'>"
            + "<p style='margin:0 0 8px;font-size:12px;color:#178A50;font-weight:700;text-transform:uppercase;letter-spacing:2px'>Número de guía</p>"
            + "<p style=\"margin:0 0 20px;font-size:28px;font-weight:800;color:#14171C;letter-spacing:3px;font-family:'IBM Plex Mono',monospace\">" + guia + "</p>"
            + "<a href='" + esc(url) + "' style='display:inline-block;background:#E73B33;color:#FFFFFF;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700'>Rastrear mi paquete</a>"
            + "</div>"

            + "<div style='border:1px solid #EBD9A8;background:#FDF3DC;border-radius:12px;padding:14px 18px;margin-bottom:8px'>"
            + "<p style='margin:0;font-size:13px;color:#9A6700;line-height:1.6'><strong>Dato útil:</strong> también podés rastrear en "
            + (isCorreos ? "<strong>rastreo.correos.go.cr</strong> ingresando tu número de guía." : "el enlace de arriba.")
            + " La entrega tarda de 2 a 5 días hábiles.</p>"
            + "</div>"
            + footer("¿Alguna pregunta sobre tu envío?");
    }

    private String buildHtml(Pedido pedido, Usuario cliente) {
        StringBuilder itemRows = new StringBuilder();
        for (PedidoItem item : pedido.getItems()) {
            String nombre = item.getProducto() != null ? esc(item.getProducto().getNombreProducto()) : "Producto";
            String imgUrl = item.getProducto() != null ? item.getProducto().getImagenPrincipalUrl() : null;
            String imgTag = (imgUrl != null && !imgUrl.isBlank())
                ? "<img src='" + esc(imgUrl) + "' width='52' height='52' style='object-fit:cover;border-radius:8px;display:block;border:1px solid #E4E7EC' alt=''>"
                : "<div style='width:52px;height:52px;border-radius:8px;background:#F1F3F6'></div>";
            itemRows.append("<tr>")
                .append("<td style='padding:14px 8px;border-bottom:1px solid #F1F3F6;vertical-align:middle'>")
                .append("<table cellpadding='0' cellspacing='0' style='border-collapse:collapse'><tr>")
                .append("<td style='padding-right:12px;vertical-align:middle'>").append(imgTag).append("</td>")
                .append("<td style='vertical-align:middle'><span style='font-size:13px;color:#14171C;font-weight:500;display:block'>").append(nombre).append("</span>")
                .append("<span style='font-size:11px;color:#9AA1AE;margin-top:2px;display:block'>Cantidad: ×").append(item.getCantidad()).append("</span></td>")
                .append("</tr></table></td>")
                .append("<td style='padding:14px 8px;border-bottom:1px solid #F1F3F6;text-align:right;vertical-align:middle;white-space:nowrap'>")
                .append("<span style=\"font-size:14px;font-weight:700;color:#14171C;font-family:" + F_DISPLAY + "\">₡").append(CRC.format(item.getSubtotalItem())).append("</span></td>")
                .append("</tr>");
        }

        boolean esEnvio = "ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio());
        String metodoEnvioLabel = esEnvio ? "Envío a domicilio" : "Retiro en tienda";
        String metodoEnvioSub = esEnvio
            ? "Vas a recibir tu pedido en la dirección indicada"
            : "Tu pedido va a estar listo para retirar en nuestra tienda";

        String nombreCliente = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");

        return abrirHtml()
            + header("¡Listo! Pedido confirmado", "Tu pago se procesó sin problemas")
            + abrirCuerpo()

            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombreCliente + "</strong>.</p>"
            + "<p style='margin:0 0 28px;color:#4D5560;font-size:14px;line-height:1.6'>Gracias por tu compra. Este es el resumen de tu pedido:</p>"

            // Número de pedido (datos en mono, cap. 4.1)
            + "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 2px;font-size:11px;color:#1747A8;font-weight:700;text-transform:uppercase;letter-spacing:1px'>Número de pedido</p>"
            + "<p style=\"margin:0;font-size:16px;font-weight:800;color:#14171C;font-family:'IBM Plex Mono',monospace\">" + esc(pedido.getNumeroPedido()) + "</p>"
            + "</div>"

            // Items
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:24px'>"
            + "<thead><tr style='border-bottom:2px solid #E4E7EC'>"
            + "<th style='padding:10px 8px;text-align:left;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Producto</th>"
            + "<th style='padding:10px 8px;text-align:right;font-size:11px;color:#9AA1AE;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Total</th>"
            + "</tr></thead>"
            + "<tbody>" + itemRows + "</tbody>"
            + "</table>"

            // Totales
            + "<div style='background:#F8F9FB;border-radius:10px;padding:16px 20px;margin-bottom:24px'>"
            + "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#4D5560;font-size:13px'>Subtotal</span>"
            + "<span style='color:#14171C;font-size:13px'>₡" + CRC.format(pedido.getSubtotal()) + "</span>"
            + "</div>"
            + (esEnvio ? "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#4D5560;font-size:13px'>Envío</span>"
            + "<span style='color:#14171C;font-size:13px'>₡" + CRC.format(pedido.getCostoEnvio()) + "</span>"
            + "</div>" : "")
            + "<div style='display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #E4E7EC;margin-top:4px'>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:16px;font-family:" + F_DISPLAY + "\">Total pagado</span>"
            + "<span style=\"color:#14171C;font-weight:800;font-size:18px;font-family:" + F_DISPLAY + "\">₡" + CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div></div>"

            // Método de entrega
            + "<div style='border:1px solid #E4E7EC;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:14px;font-weight:700;color:#14171C'>" + metodoEnvioLabel + "</p>"
            + "<p style='margin:0;font-size:13px;color:#4D5560'>" + metodoEnvioSub + "</p>"
            + "</div>"

            // Garantía / confianza
            + "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:14px;font-weight:700;color:#178A50'>Garantía de 40 días activa</p>"
            + "<p style='margin:0;font-size:13px;color:#14171C'>Si tenés cualquier problema con tu pedido, escribinos por WhatsApp y lo resolvemos.</p>"
            + "</div>"

            + cta("https://hotclick.lat/mis-pedidos", "Ver mi pedido")
            + footer("¿Tenés alguna pregunta sobre tu pedido?");
    }

    private String buildPagoFallidoHtml(Pedido pedido, Usuario cliente, String motivo) {
        String nombre = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        return abrirHtml()
            + header("No pudimos procesar tu pago", "Tu carrito sigue guardado")
            + abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + nombre + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>El pago de tu pedido <strong style='color:#14171C'>" + esc(pedido.getNumeroPedido()) + "</strong> no se pudo completar. No se hizo ningún cargo.</p>"

            // Alerta de error: fondo semántico 50 + texto 600 (cap. 3.5)
            + "<div style='background:#FEF2F1;border:1px solid #FBC1BD;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#D02A23;text-transform:uppercase;letter-spacing:1px'>Qué pasó</p>"
            + "<p style='margin:0;font-size:14px;color:#76211E'>" + esc(motivo != null ? motivo : "El pago fue rechazado o cancelado por el procesador.") + "</p>"
            + "</div>"

            + "<p style='margin:0 0 20px;color:#4D5560;font-size:14px;line-height:1.6'>El stock fue liberado y podés intentarlo de nuevo cuando querás — revisá los datos del método de pago o probá con otro. Si el problema sigue, escribinos por WhatsApp y lo vemos juntos.</p>"

            + cta("https://hotclick.lat/checkout", "Intentar de nuevo")
            + footer("¿Necesitás ayuda con tu pago?");
    }

    /* ──────────────────────────── marketing y cuentas ──────────────────────────── */

    @Async
    public void enviarCuponBienvenida(String email, String codigo) {
        try {
            String html = abrirHtml()
                + header("Tu código de descuento", "13% menos en tu primera compra en línea")
                + abrirCuerpo()
                + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Gracias por unirte a HotClick. Usá este código al pagar y obtené un <strong style='color:#14171C'>13% de descuento</strong> en tu primera compra en línea:</p>"
                + "<div style='background:#FEF2F1;border:2px dashed #E73B33;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px'>"
                + "<span style=\"font-size:28px;font-weight:800;letter-spacing:4px;color:#D02A23;font-family:'IBM Plex Mono',monospace\">" + esc(codigo) + "</span>"
                + "</div>"
                + "<p style='margin:0 0 24px;color:#4D5560;font-size:13px;line-height:1.8'>• Válido para una sola compra<br>• Una vez por persona<br>• Ingresalo en el campo «¿Tenés un cupón?» al hacer checkout</p>"
                + cta("https://hotclick.lat/productos", "Encontrá lo que buscás")
                + footer("¿Tenés alguna pregunta?");
            resendEmailService.send(email, "Tu cupón de 13% OFF — HotClick", html);
            log.info("Email cupón bienvenida enviado a {}", email);
        } catch (Exception e) {
            log.error("No se pudo enviar email de cupón a {}: {}", email, e.getMessage());
        }
    }

    @Async
    public void enviarBienvenidaEmprendedor(String correo, String nombre, String nombreEmpresa) {
        try {
            String html = abrirHtml()
                + header("Tu tienda está lista", "Bienvenido a la comunidad de emprendedores")
                + abrirCuerpo()
                + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + esc(nombre) + "</strong>.</p>"
                + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Tu negocio <strong style='color:#14171C'>" + esc(nombreEmpresa) + "</strong> quedó registrado en HotClick. Ya podés entrar a tu panel y empezar a configurar tu tienda.</p>"
                + "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:20px;margin-bottom:24px'>"
                + "<p style='margin:0 0 10px;font-weight:700;color:#14171C'>Próximos pasos:</p>"
                + "<ul style='margin:0;padding-left:20px;color:#4D5560;line-height:1.8;font-size:14px'>"
                + "<li>Agregá tus primeros productos desde el panel</li>"
                + "<li>Configurá el perfil de tu negocio (logo, colores, WhatsApp)</li>"
                + "<li>Invitá a tu equipo de administración</li>"
                + "</ul>"
                + "</div>"
                + cta("https://hotclick.lat/admin", "Ir a mi panel")
                + footer("¿Tenés dudas para arrancar?");
            resendEmailService.send(correo, "Tu tienda está lista en HotClick — " + esc(nombreEmpresa), html);
            log.info("Email bienvenida emprendedor enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de bienvenida a {}: {}", correo, e.getMessage());
        }
    }

    @Async
    public void enviarAprobacionNegocio(String correo, String nombre, String nombreEmpresa) {
        try {
            String html = abrirHtml()
                + header("¡Tu negocio fue aprobado!", "Tus productos ya son visibles al público")
                + abrirCuerpo()
                + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + esc(nombre) + "</strong>.</p>"
                + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Tu negocio <strong style='color:#14171C'>" + esc(nombreEmpresa) + "</strong> fue revisado y aprobado. Desde ahora tus productos aparecen en HotClick.</p>"
                + "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:12px;padding:20px;margin-bottom:24px'>"
                + "<p style='margin:0 0 10px;font-weight:700;color:#178A50'>Tu tienda ya está en línea</p>"
                + "<p style='margin:0;color:#14171C;line-height:1.7;font-size:14px'>Podés activar la visibilidad, agregar más productos y configurar tu perfil desde el panel de administración.</p>"
                + "</div>"
                + cta("https://hotclick.lat/admin", "Ver mi panel")
                + footer("¿Tenés alguna pregunta?");
            resendEmailService.send(correo, "Tu negocio " + esc(nombreEmpresa) + " fue aprobado — HotClick", html);
            log.info("Email aprobación enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de aprobación a {}: {}", correo, e.getMessage());
        }
    }

    @Async
    public void enviarRechazoNegocio(String correo, String nombre, String nombreEmpresa) {
        try {
            String html = abrirHtml()
                + header("Actualización sobre tu solicitud", null)
                + abrirCuerpo()
                + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + esc(nombre) + "</strong>.</p>"
                + "<p style='margin:0 0 16px;color:#4D5560;font-size:14px;line-height:1.6'>Revisamos tu solicitud para <strong style='color:#14171C'>" + esc(nombreEmpresa) + "</strong> y en esta ocasión no fue aprobada.</p>"
                + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Esto no cierra la puerta: si tenés dudas o querés saber qué ajustar para volver a aplicar, escribinos a <a href='mailto:soporte@hotclick.cr' style='color:#1747A8'>soporte@hotclick.cr</a> o por WhatsApp.</p>"
                + footer("¿Querés que lo revisemos juntos?");
            resendEmailService.send(correo, "Actualización sobre tu solicitud — " + esc(nombreEmpresa), html);
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
    @Async
    public void enviarInvitacionMiembro(String correo, String nombre, String rolEnEmpresa,
                                        String nombreEmpresa, String passwordPlano) {
        try {
            String rolLabel = switch (rolEnEmpresa) {
                case "EDITOR" -> "Editor — puede editar productos y pedidos";
                case "LECTOR" -> "Lector — solo visualización";
                case "ADMIN"  -> "Admin — acceso completo";
                default -> rolEnEmpresa;
            };

            String credencialesBlock;
            if (passwordPlano != null) {
                credencialesBlock = "<div style='background:#F8F9FB;border:1px solid #E4E7EC;border-radius:12px;padding:20px;margin:20px 0'>"
                    + "<p style='margin:0 0 12px;font-weight:700;color:#14171C'>Tus credenciales de acceso</p>"
                    + "<table style='width:100%;border-collapse:collapse'>"
                    + "<tr><td style='color:#4D5560;padding:4px 0;width:110px;font-size:14px'>Correo:</td>"
                    + "<td style=\"color:#14171C;font-family:'IBM Plex Mono',monospace;font-size:14px\">" + esc(correo) + "</td></tr>"
                    + "<tr><td style='color:#4D5560;padding:4px 0;font-size:14px'>Contraseña:</td>"
                    + "<td style=\"color:#9A6700;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px\">" + esc(passwordPlano) + "</td></tr>"
                    + "</table>"
                    + "<p style='margin:12px 0 0;font-size:12px;color:#6E7682'>Te recomendamos cambiar la contraseña al ingresar desde Configuración → Seguridad.</p>"
                    + "</div>";
            } else {
                credencialesBlock = "<p style='color:#4D5560;background:#F8F9FB;border:1px solid #E4E7EC;border-radius:10px;padding:14px;margin:16px 0;font-size:14px'>"
                    + "Ingresá con tu correo <strong style='color:#14171C'>" + esc(correo) + "</strong> y tu contraseña habitual.</p>";
            }

            String html = abrirHtml()
                + header("Te agregaron a un equipo", "Ya tenés acceso al panel del negocio")
                + abrirCuerpo()
                + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + esc(nombre) + "</strong>.</p>"
                + "<p style='margin:0 0 20px;color:#4D5560;font-size:14px;line-height:1.6'>Fuiste invitado al negocio <strong style='color:#14171C'>" + esc(nombreEmpresa) + "</strong> en HotClick.</p>"
                + "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:16px;margin-bottom:4px'>"
                + "<p style='margin:0 0 6px;color:#4D5560;font-size:13px'>Tu rol asignado</p>"
                + "<p style='margin:0;color:#1747A8;font-weight:700'>" + esc(rolLabel) + "</p>"
                + "</div>"
                + credencialesBlock
                + cta("https://hotclick.lat/login", "Ingresar al panel")
                + footer("¿Tenés alguna pregunta?");

            resendEmailService.send(correo,
                "Te invitaron al equipo de " + esc(nombreEmpresa) + " en HotClick",
                html);
            log.info("Email invitación miembro enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de invitación a {}: {}", correo, e.getMessage());
        }
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
