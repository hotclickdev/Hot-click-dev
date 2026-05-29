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

@Service
public class NotificacionEmailService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionEmailService.class);
    private static final NumberFormat CRC = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));

    @Autowired private ResendEmailService resendEmailService;

    @Async
    public void enviarConfirmacionPedido(Pedido pedido) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null || cliente.getCorreo() == null) return;
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

    @Async
    public void enviarNotificacionGuia(Pedido pedido) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null || cliente.getCorreo() == null) return;
        try {
            resendEmailService.send(
                cliente.getCorreo(),
                "Tu pedido fue enviado — " + pedido.getNumeroPedido(),
                buildGuiaHtml(pedido, cliente)
            );
            log.info("Email guía enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
        } catch (Exception e) {
            log.error("No se pudo enviar email de guía para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
        }
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
                "¡Todavía tienes productos esperando en HOTCLICK!",
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
                .append("<td style='padding:10px 8px;border-bottom:1px solid #e8e8ed'>")
                .append(img).append(esc(item.getNombre())).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #e8e8ed;text-align:center;color:#6e6e82'>×")
                .append(item.getCantidad() != null ? item.getCantidad() : 1).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #e8e8ed;text-align:right;font-weight:600;color:#1a1a2e'>₡")
                .append(CRC.format(subtotal)).append("</td>")
                .append("</tr>");
        }

        String recoverUrl = appUrl + "/recuperar-carrito/" + carritoId;

        return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
            + "<body style='margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif'>"
            + "<div style='max-width:600px;margin:32px auto;padding:0 16px'>"

            + "<div style='background:linear-gradient(135deg,#4f7cff 0%,#7c3aed 100%);border-radius:20px 20px 0 0;padding:36px 36px 28px;text-align:center'>"
            + "<div style='display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:6px 16px;margin-bottom:16px'>"
            + "<span style='color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase'>HOTCLICK</span>"
            + "</div>"
            + "<div style='font-size:40px;margin-bottom:12px'>🛒</div>"
            + "<h1 style='margin:0;color:#fff;font-size:26px;font-weight:800'>¡Tu carrito te espera!</h1>"
            + "<p style='margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px'>Dejaste productos sin completar tu compra</p>"
            + "</div>"

            + "<div style='background:#fff;padding:32px 36px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed'>"
            + "<p style='margin:0 0 24px;color:#6e6e82;font-size:14px;line-height:1.6'>Estos productos están esperando por ti. ¡No dejes que se agoten!</p>"
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<tbody>" + rows + "</tbody>"
            + "</table>"
            + "<div style='background:#f9fafb;border-radius:12px;padding:16px 20px;text-align:right;margin-bottom:28px'>"
            + "<span style='color:#1a1a2e;font-weight:800;font-size:16px'>Total estimado: ₡" + CRC.format(total) + "</span>"
            + "</div>"
            + "<div style='text-align:center'>"
            + "<a href='" + esc(recoverUrl) + "' style='display:inline-block;background:linear-gradient(135deg,#4f7cff,#7c3aed);color:#fff;text-decoration:none;padding:15px 40px;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:0.5px'>Recuperar mi carrito →</a>"
            + "</div>"
            + "</div>"

            + "<div style='background:#1a1a2e;border-radius:0 0 20px 20px;padding:28px 36px;text-align:center'>"
            + "<p style='margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:13px'>¿Tienes alguna pregunta?</p>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:20px'>📱 Necesito ayuda</a>"
            + "<div style='border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:4px'>"
            + "<p style='margin:0 0 4px;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px'>HOTCLICK</p>"
            + "<p style='margin:0 0 6px;color:rgba(255,255,255,0.5);font-size:11px'>hotclick.cr@gmail.com · Costa Rica</p>"
            + "<p style='margin:0;color:rgba(255,255,255,0.3);font-size:10px'>Si no deseas más recordatorios, simplemente ignorá este mensaje.</p>"
            + "</div></div>"
            + "</div></body></html>";
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
                    .append("<td style='padding:8px 0;border-bottom:1px solid #e8e8ed;font-size:13px;color:#1a1a2e'>").append(esc(prod)).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #e8e8ed;text-align:center;font-size:13px;color:#6e6e82'>×").append(item.getCantidad()).append("</td>")
                    .append("<td style='padding:8px 0;border-bottom:1px solid #e8e8ed;text-align:right;font-size:13px;color:#1a1a2e'>₡").append(CRC.format(item.getSubtotalItem())).append("</td>")
                    .append("</tr>");
            }
        }

        String guiaSection = "";
        if (pedido.getNumeroGuia() != null && !pedido.getNumeroGuia().isBlank()) {
            boolean isCorreos = pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
            String url = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
                : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();
            String courierLabel = isCorreos ? "🟡 Correos de Costa Rica" : "🛵 Entrega directa por HOTCLICK";
            guiaSection = "<div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center'>"
                + "<p style='margin:0 0 4px;font-size:12px;color:#059669;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Envío · " + esc(courierLabel) + "</p>"
                + "<p style='margin:0 0 4px;font-size:12px;color:#6e6e82'>Número de guía</p>"
                + "<p style='margin:0 0 12px;font-size:20px;font-weight:900;color:#1a1a2e;letter-spacing:2px'>" + esc(pedido.getNumeroGuia()) + "</p>"
                + "<a href='" + url + "' style='display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700'>📦 Rastrear paquete</a>"
                + "</div>";
        }

        String retiroSection = "";
        if (esRetiro && ("LISTO_RETIRO".equals(pedido.getEstadoPedido()) || "EN_PREPARACION".equals(pedido.getEstadoPedido()))) {
            retiroSection = "<div style='background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center'>"
                + "<p style='margin:0 0 8px;font-size:14px;color:#1a1a2e;font-weight:600'>📍 Retiro en tienda</p>"
                + "<p style='margin:0 0 12px;font-size:13px;color:#6e6e82'>HOTCLICK · Centro Comercial · Costa Rica</p>"
                + "<a href='https://waze.com/ul?ll=9.9342,-84.0877&navigate=yes' style='display:inline-block;background:#00b4ff;color:#fff;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700'>🗺 Cómo llegar (Waze)</a>"
                + "</div>";
        }

        String notaSection = (nota != null && !nota.isBlank())
            ? "<div style='background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin-bottom:20px'>"
                + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px'>Mensaje de HOTCLICK</p>"
                + "<p style='margin:0;font-size:14px;color:#1a1a2e'>" + esc(nota) + "</p>"
                + "</div>"
            : "";

        String estadoColor;
        String estadoEmoji;
        switch (pedido.getEstadoPedido() != null ? pedido.getEstadoPedido() : "") {
            case "PAGADO":         estadoColor = "#4f7cff"; estadoEmoji = "💳"; break;
            case "EN_PREPARACION": estadoColor = "#f59e0b"; estadoEmoji = "📦"; break;
            case "LISTO_RETIRO":   estadoColor = "#8b5cf6"; estadoEmoji = "🏪"; break;
            case "ENVIADO":        estadoColor = "#059669"; estadoEmoji = "🚚"; break;
            case "ENTREGADO":      estadoColor = "#10b981"; estadoEmoji = "✅"; break;
            case "CANCELADO":      estadoColor = "#ef4444"; estadoEmoji = "❌"; break;
            default:               estadoColor = "#6b7280"; estadoEmoji = "📋";
        }

        return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
            + "<body style='margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif'>"
            + "<div style='max-width:600px;margin:32px auto;padding:0 16px'>"

            + "<div style='background:linear-gradient(135deg,#4f7cff 0%,#7c3aed 100%);border-radius:20px 20px 0 0;padding:36px 36px 28px;text-align:center'>"
            + "<div style='display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:6px 16px;margin-bottom:16px'>"
            + "<span style='color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase'>HOTCLICK</span>"
            + "</div>"
            + "<div style='font-size:40px;margin-bottom:12px'>📬</div>"
            + "<h1 style='margin:0;color:#fff;font-size:26px;font-weight:800'>Actualización de tu pedido</h1>"
            + "<p style='margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px'>Tenemos novedades para ti</p>"
            + "</div>"

            + "<div style='background:#fff;padding:32px 36px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed'>"
            + "<p style='margin:0 0 6px;color:#1a1a2e;font-size:16px'>Hola <strong>" + nombre + "</strong> 👋</p>"
            + "<p style='margin:0 0 24px;color:#6e6e82;font-size:14px;line-height:1.6'>Aquí está la información actualizada de tu pedido <strong style='color:#1a1a2e'>" + esc(pedido.getNumeroPedido()) + "</strong>.</p>"

            // Status badge
            + "<div style='background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between'>"
            + "<div><p style='margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Estado actual</p>"
            + "<p style='margin:0;font-size:16px;font-weight:800;color:" + estadoColor + "'>" + estadoEmoji + " " + estado + "</p></div>"
            + "</div>"

            + notaSection
            + guiaSection
            + retiroSection

            + "<table style='width:100%;border-collapse:collapse;margin-bottom:20px'>"
            + "<tbody>" + items + "</tbody>"
            + "</table>"

            + "<div style='background:#f9fafb;border-radius:12px;padding:16px 20px;text-align:right'>"
            + "<span style='color:#1a1a2e;font-weight:800;font-size:16px'>Total: ₡" + CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div>"
            + "</div>"

            + "<div style='background:#1a1a2e;border-radius:0 0 20px 20px;padding:28px 36px;text-align:center'>"
            + "<p style='margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:13px'>¿Tienes alguna pregunta?</p>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:20px'>📱 Escríbenos por WhatsApp</a>"
            + "<div style='border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:4px'>"
            + "<p style='margin:0 0 4px;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px'>HOTCLICK</p>"
            + "<p style='margin:0;color:rgba(255,255,255,0.5);font-size:11px'>hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div></div>"
            + "</div></body></html>";
    }

    private String buildGuiaHtml(Pedido pedido, Usuario cliente) {
        String nombre = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        String guia   = esc(pedido.getNumeroGuia());
        boolean isCorreos = pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
        String url    = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
            : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();
        String courierNombre = isCorreos ? "Correos de Costa Rica" : "HOTCLICK Express";
        String courierEmoji = isCorreos ? "🟡" : "🛵";

        return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
            + "<body style='margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif'>"
            + "<div style='max-width:600px;margin:32px auto;padding:0 16px'>"

            // Header
            + "<div style='background:linear-gradient(135deg,#059669 0%,#047857 100%);border-radius:20px 20px 0 0;padding:36px 36px 28px;text-align:center'>"
            + "<div style='display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:6px 16px;margin-bottom:16px'>"
            + "<span style='color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase'>HOTCLICK</span>"
            + "</div>"
            + "<div style='font-size:40px;margin-bottom:12px'>🚚</div>"
            + "<h1 style='margin:0;color:#fff;font-size:26px;font-weight:800;line-height:1.2'>¡Tu pedido está en camino!</h1>"
            + "<p style='margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px'>Ya salió de nuestras manos hacia las tuyas</p>"
            + "</div>"

            // Main
            + "<div style='background:#fff;padding:32px 36px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed'>"
            + "<p style='margin:0 0 6px;color:#1a1a2e;font-size:16px'>Hola <strong>" + nombre + "</strong> 👋</p>"
            + "<p style='margin:0 0 28px;color:#6e6e82;font-size:14px;line-height:1.6'>Tu pedido <strong style='color:#1a1a2e'>" + esc(pedido.getNumeroPedido()) + "</strong> fue enviado con " + courierEmoji + " <strong>" + courierNombre + "</strong>.</p>"

            // Tracking number
            + "<div style='background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:2px solid #6ee7b7;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px'>"
            + "<p style='margin:0 0 8px;font-size:12px;color:#059669;font-weight:700;text-transform:uppercase;letter-spacing:2px'>📦 Número de guía</p>"
            + "<p style='margin:0 0 20px;font-size:28px;font-weight:900;color:#1a1a2e;letter-spacing:3px;font-family:monospace'>" + guia + "</p>"
            + "<a href='" + esc(url) + "' style='display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700'>Rastrear mi paquete →</a>"
            + "</div>"

            // Info tip
            + "<div style='border:1px solid #fde68a;background:#fffbeb;border-radius:12px;padding:14px 18px;margin-bottom:8px'>"
            + "<p style='margin:0;font-size:13px;color:#92400e;line-height:1.6'>💡 <strong>Tip:</strong> También puedes rastrear en "
            + (isCorreos ? "<strong>rastreo.correos.go.cr</strong> ingresando tu número de guía." : "el link de arriba.")
            + " Los tiempos de entrega son de 2–5 días hábiles.</p>"
            + "</div>"
            + "</div>"

            // Footer
            + "<div style='background:#1a1a2e;border-radius:0 0 20px 20px;padding:28px 36px;text-align:center'>"
            + "<p style='margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:13px'>¿Alguna pregunta sobre tu envío?</p>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:20px'>📱 Escríbenos por WhatsApp</a>"
            + "<div style='border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:4px'>"
            + "<p style='margin:0 0 4px;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px'>HOTCLICK</p>"
            + "<p style='margin:0;color:rgba(255,255,255,0.5);font-size:11px'>hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div></div>"
            + "</div></body></html>";
    }

    private String buildHtml(Pedido pedido, Usuario cliente) {
        StringBuilder itemRows = new StringBuilder();
        for (PedidoItem item : pedido.getItems()) {
            String nombre = item.getProducto() != null ? esc(item.getProducto().getNombreProducto()) : "Producto";
            String imgUrl = item.getProducto() != null ? item.getProducto().getImagenPrincipalUrl() : null;
            String imgTag = (imgUrl != null && !imgUrl.isBlank())
                ? "<img src='" + esc(imgUrl) + "' width='52' height='52' style='object-fit:cover;border-radius:8px;display:block;border:1px solid #e8e8ed' alt=''>"
                : "<div style='width:52px;height:52px;border-radius:8px;background:#f0f0f5;display:flex;align-items:center;justify-content:center;font-size:20px'>📦</div>";
            itemRows.append("<tr>")
                .append("<td style='padding:14px 8px;border-bottom:1px solid #f0f0f5;vertical-align:middle'>")
                .append("<table cellpadding='0' cellspacing='0' style='border-collapse:collapse'><tr>")
                .append("<td style='padding-right:12px;vertical-align:middle'>").append(imgTag).append("</td>")
                .append("<td style='vertical-align:middle'><span style='font-size:13px;color:#1a1a2e;font-weight:500;display:block'>").append(nombre).append("</span>")
                .append("<span style='font-size:11px;color:#9ca3af;margin-top:2px;display:block'>Cantidad: ×").append(item.getCantidad()).append("</span></td>")
                .append("</tr></table></td>")
                .append("<td style='padding:14px 8px;border-bottom:1px solid #f0f0f5;text-align:right;vertical-align:middle;white-space:nowrap'>")
                .append("<span style='font-size:14px;font-weight:700;color:#4f7cff'>₡").append(CRC.format(item.getSubtotalItem())).append("</span></td>")
                .append("</tr>");
        }

        boolean esEnvio = "ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio());
        String metodoEnvioLabel = esEnvio
            ? "🚚 Envío a domicilio"
            : "🏪 Retiro en tienda";
        String metodoEnvioSub = esEnvio
            ? "Recibirás tu pedido en la dirección indicada"
            : "Tu pedido estará listo para retirar en nuestra tienda";

        String nombreCliente = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");

        return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<title>Pedido confirmado</title></head>"
            + "<body style='margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif'>"
            + "<div style='max-width:600px;margin:32px auto;padding:0 16px'>"

            // Header card
            + "<div style='background:linear-gradient(135deg,#4f7cff 0%,#7c3aed 100%);border-radius:20px 20px 0 0;padding:36px 36px 28px;text-align:center'>"
            + "<div style='display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:6px 16px;margin-bottom:16px'>"
            + "<span style='color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase'>HOTCLICK</span>"
            + "</div>"
            + "<div style='width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px'>✅</div>"
            + "<h1 style='margin:0;color:#fff;font-size:26px;font-weight:800;line-height:1.2'>¡Pedido confirmado!</h1>"
            + "<p style='margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:14px'>Tu pago fue procesado exitosamente</p>"
            + "</div>"

            // Main content
            + "<div style='background:#fff;padding:32px 36px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed'>"

            // Greeting
            + "<p style='margin:0 0 6px;color:#1a1a2e;font-size:16px'>Hola <strong>" + nombreCliente + "</strong> 👋</p>"
            + "<p style='margin:0 0 28px;color:#6e6e82;font-size:14px;line-height:1.6'>Gracias por tu compra. Aquí está el resumen de tu pedido:</p>"

            // Order number badge
            + "<div style='background:#f5f5ff;border:1.5px solid #c7d2fe;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between'>"
            + "<div><p style='margin:0 0 2px;font-size:11px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Número de pedido</p>"
            + "<p style='margin:0;font-size:16px;font-weight:800;color:#1a1a2e;font-family:monospace'>" + esc(pedido.getNumeroPedido()) + "</p></div>"
            + "<div style='font-size:24px'>🧾</div>"
            + "</div>"

            // Items
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:24px'>"
            + "<thead><tr style='border-bottom:2px solid #f0f0f5'>"
            + "<th style='padding:10px 8px;text-align:left;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Producto</th>"
            + "<th style='padding:10px 8px;text-align:right;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Total</th>"
            + "</tr></thead>"
            + "<tbody>" + itemRows + "</tbody>"
            + "</table>"

            // Totals
            + "<div style='background:#f9fafb;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#6e6e82;font-size:13px'>Subtotal</span>"
            + "<span style='color:#1a1a2e;font-size:13px'>₡" + CRC.format(pedido.getSubtotal()) + "</span>"
            + "</div>"
            + (esEnvio ? "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#6e6e82;font-size:13px'>Envío</span>"
            + "<span style='color:#1a1a2e;font-size:13px'>₡" + CRC.format(pedido.getCostoEnvio()) + "</span>"
            + "</div>" : "")
            + "<div style='display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #e8e8ed;margin-top:4px'>"
            + "<span style='color:#1a1a2e;font-weight:800;font-size:16px'>Total pagado</span>"
            + "<span style='color:#4f7cff;font-weight:800;font-size:18px'>₡" + CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div></div>"

            // Delivery method
            + "<div style='border:1px solid #e8e8ed;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:14px;font-weight:700;color:#1a1a2e'>" + metodoEnvioLabel + "</p>"
            + "<p style='margin:0;font-size:13px;color:#6e6e82'>" + metodoEnvioSub + "</p>"
            + "</div>"

            // Warranty / trust
            + "<div style='background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:8px'>"
            + "<p style='margin:0 0 4px;font-size:14px;font-weight:700;color:#065f46'>🛡 Garantía de 40 días activa</p>"
            + "<p style='margin:0;font-size:13px;color:#047857'>Si tienes cualquier problema con tu pedido, contáctanos por WhatsApp y lo resolvemos.</p>"
            + "</div>"
            + "</div>"

            // Footer
            + "<div style='background:#1a1a2e;border-radius:0 0 20px 20px;padding:28px 36px;text-align:center'>"
            + "<p style='margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:13px'>¿Tienes alguna pregunta sobre tu pedido?</p>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:20px'>📱 Escríbenos por WhatsApp</a>"
            + "<div style='border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:4px'>"
            + "<p style='margin:0 0 4px;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px'>HOTCLICK</p>"
            + "<p style='margin:0;color:rgba(255,255,255,0.5);font-size:11px'>hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div></div>"

            + "</div></body></html>";
    }

    private String buildPagoFallidoHtml(Pedido pedido, Usuario cliente, String motivo) {
        String nombre = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
            + "<body style='margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif'>"
            + "<div style='max-width:600px;margin:32px auto;padding:0 16px'>"

            + "<div style='background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);border-radius:20px 20px 0 0;padding:36px 36px 28px;text-align:center'>"
            + "<div style='display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:6px 16px;margin-bottom:16px'>"
            + "<span style='color:rgba(255,255,255,0.9);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase'>HOTCLICK</span>"
            + "</div>"
            + "<div style='font-size:40px;margin-bottom:12px'>⚠️</div>"
            + "<h1 style='margin:0;color:#fff;font-size:24px;font-weight:800'>Problema con tu pago</h1>"
            + "<p style='margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px'>No se pudo procesar el pago de tu pedido</p>"
            + "</div>"

            + "<div style='background:#fff;padding:32px 36px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed'>"
            + "<p style='margin:0 0 6px;color:#1a1a2e;font-size:16px'>Hola <strong>" + nombre + "</strong>,</p>"
            + "<p style='margin:0 0 24px;color:#6e6e82;font-size:14px;line-height:1.6'>Tu pago para el pedido <strong style='color:#1a1a2e'>" + esc(pedido.getNumeroPedido()) + "</strong> no pudo completarse.</p>"

            + "<div style='background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 4px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px'>Motivo</p>"
            + "<p style='margin:0;font-size:14px;color:#7f1d1d'>" + esc(motivo != null ? motivo : "El pago fue rechazado o cancelado.") + "</p>"
            + "</div>"

            + "<p style='margin:0 0 20px;color:#6e6e82;font-size:14px;line-height:1.6'>El stock fue liberado y puedes volver a intentarlo. Si el problema persiste, contáctanos por WhatsApp.</p>"

            + "<div style='text-align:center;padding:8px 0'>"
            + "<a href='https://hotclick.onrender.com/checkout' style='display:inline-block;background:#4f7cff;color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;font-size:15px;font-weight:700'>Intentar de nuevo →</a>"
            + "</div>"
            + "</div>"

            + "<div style='background:#1a1a2e;border-radius:0 0 20px 20px;padding:28px 36px;text-align:center'>"
            + "<p style='margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:13px'>¿Necesitas ayuda con tu pago?</p>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;margin-bottom:20px'>📱 Contáctanos por WhatsApp</a>"
            + "<div style='border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:4px'>"
            + "<p style='margin:0 0 4px;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px'>HOTCLICK</p>"
            + "<p style='margin:0;color:rgba(255,255,255,0.5);font-size:11px'>hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div></div>"
            + "</div></body></html>";
    }

    @Async
    public void enviarCuponBienvenida(String email, String codigo) {
        try {
            String html = "<div style='font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d14;color:#e8e8ed;padding:32px;border-radius:16px'>" +
                "<h2 style='color:#4f7cff;margin-bottom:8px'>¡Tu código de descuento!</h2>" +
                "<p style='color:#8e8e9a;margin-bottom:24px'>Gracias por unirte a HOTCLICK. Usá este código para obtener un <strong style='color:#e8e8ed'>17% de descuento</strong> en tu primera compra en línea:</p>" +
                "<div style='background:#1a1a2e;border:2px dashed #4f7cff;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px'>" +
                "<span style='font-size:28px;font-weight:900;letter-spacing:4px;color:#4f7cff'>" + esc(codigo) + "</span>" +
                "</div>" +
                "<p style='color:#8e8e9a;font-size:13px'>• Válido para una sola compra<br>• Una vez por persona<br>• Ingresalo en el campo \"¿Tenés un cupón?\" al hacer checkout</p>" +
                "<div style='margin-top:28px;padding-top:20px;border-top:1px solid #1a1a2e;text-align:center'>" +
                "<a href='https://hotclick.cr/productos' style='background:#4f7cff;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px'>Ver productos →</a>" +
                "</div>" +
                "<p style='color:#5e5e6e;font-size:11px;text-align:center;margin-top:20px'>HOTCLICK Outlet · Costa Rica</p>" +
                "</div>";
            resendEmailService.send(email, "Tu cupón de 17% OFF — HOTCLICK", html);
            log.info("Email cupón bienvenida enviado a {}", email);
        } catch (Exception e) {
            log.error("No se pudo enviar email de cupón a {}: {}", email, e.getMessage());
        }
    }

    @Async
    public void enviarBienvenidaEmprendedor(String correo, String nombre, String nombreEmpresa) {
        try {
            String html = "<div style='font-family:sans-serif;max-width:520px;margin:0 auto;background:#0d0d14;color:#e8e8ed;padding:32px;border-radius:16px'>"
                + "<div style='text-align:center;margin-bottom:24px'>"
                + "<div style='display:inline-block;background:linear-gradient(135deg,#ff4b12,#ff7b00);padding:12px 20px;border-radius:12px;font-weight:900;font-size:18px;letter-spacing:2px;color:#fff'>HOTCLICK</div>"
                + "</div>"
                + "<h2 style='color:#ff4b12;margin-bottom:8px'>¡Bienvenido a HOTCLICK, " + esc(nombre) + "!</h2>"
                + "<p style='color:#8e8e9a;margin-bottom:20px'>Tu empresa <strong style='color:#e8e8ed'>" + esc(nombreEmpresa) + "</strong> fue registrada exitosamente. "
                + "Ya podés acceder a tu panel de administración y empezar a configurar tu tienda.</p>"
                + "<div style='background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:20px'>"
                + "<p style='margin:0 0 10px;font-weight:700;color:#e8e8ed'>Próximos pasos:</p>"
                + "<ul style='margin:0;padding-left:20px;color:#8e8e9a;line-height:1.8'>"
                + "<li>Agrega tus primeros productos desde el panel</li>"
                + "<li>Configura el perfil de tu empresa (logo, colores, WhatsApp)</li>"
                + "<li>Invita a tu equipo de administración</li>"
                + "</ul>"
                + "</div>"
                + "<div style='text-align:center;margin-top:24px'>"
                + "<a href='https://hotclick.cr/admin' style='background:linear-gradient(135deg,#ff4b12,#ff7b00);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px'>Ir a mi panel →</a>"
                + "</div>"
                + "<p style='color:#5e5e6e;font-size:11px;text-align:center;margin-top:24px'>HOTCLICK Outlet · Costa Rica · <a href='https://hotclick.cr' style='color:#5e5e6e'>hotclick.cr</a></p>"
                + "</div>";
            resendEmailService.send(correo, "¡Bienvenido a HOTCLICK! Tu tienda está lista — " + esc(nombreEmpresa), html);
            log.info("Email bienvenida emprendedor enviado a {}", correo);
        } catch (Exception e) {
            log.error("No se pudo enviar email de bienvenida a {}: {}", correo, e.getMessage());
        }
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
