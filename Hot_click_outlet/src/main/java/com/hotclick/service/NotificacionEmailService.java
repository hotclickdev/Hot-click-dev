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
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null || cliente.getCorreo() == null) return;
        try {
            resendEmailService.send(
                cliente.getCorreo(),
                "Actualización de tu pedido — " + pedido.getNumeroPedido(),
                buildSeguimientoHtml(pedido, cliente)
            );
            log.info("Email seguimiento enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
        } catch (Exception e) {
            log.error("No se pudo enviar email de seguimiento para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
        }
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

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>"
            + "<body style='margin:0;padding:0;background:#f5f5f7;font-family:sans-serif'>"
            + "<div style='max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>"
            + "<div style='background:linear-gradient(135deg,#4f7cff,#7c3aed);padding:32px 32px 24px'>"
            + "<span style='color:#fff;font-size:20px;font-weight:900;letter-spacing:1px'>HOTCLICK</span>"
            + "<h1 style='color:#fff;margin:16px 0 0;font-size:22px;font-weight:700'>🛒 Tu carrito te está esperando</h1>"
            + "</div>"
            + "<div style='padding:28px 32px'>"
            + "<p style='margin:0 0 20px;color:#6e6e82;font-size:14px'>Dejaste estos productos en tu carrito. ¡No dejes que se agoten!</p>"
            + "<table style='width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px'>"
            + "<tbody>" + rows + "</tbody>"
            + "</table>"
            + "<div style='border-top:2px solid #e8e8ed;padding-top:14px;text-align:right;margin-bottom:28px'>"
            + "<span style='color:#1a1a2e;font-weight:700;font-size:15px'>Total: ₡" + CRC.format(total) + "</span>"
            + "</div>"
            + "<div style='text-align:center'>"
            + "<a href='" + recoverUrl + "' style='display:inline-block;background:linear-gradient(135deg,#4f7cff,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.5px'>Recuperar mi carrito →</a>"
            + "</div>"
            + "</div>"
            + "<div style='padding:20px 32px;background:#f5f5f7;text-align:center'>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600'>📱 ¿Necesitás ayuda?</a>"
            + "<p style='margin:12px 0 0;color:#aaa;font-size:11px'>HOTCLICK · hotclick.cr@gmail.com · Costa Rica</p>"
            + "<p style='margin:6px 0 0;color:#ccc;font-size:10px'>Si no quieres más recordatorios, simplemente ignorá este mensaje.</p>"
            + "</div>"
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

    private String buildSeguimientoHtml(Pedido pedido, Usuario cliente) {
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

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f5f7;font-family:sans-serif'>"
            + "<div style='max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>"
            + "<div style='background:linear-gradient(135deg,#4f7cff,#7c3aed);padding:32px 32px 24px'>"
            + "<span style='color:#fff;font-size:20px;font-weight:900;letter-spacing:1px'>HOTCLICK</span>"
            + "<h1 style='color:#fff;margin:16px 0 0;font-size:22px;font-weight:700'>Actualización de tu pedido 📬</h1>"
            + "</div>"
            + "<div style='padding:28px 32px'>"
            + "<p style='margin:0;color:#1a1a2e;font-size:15px'>Hola <strong>" + nombre + "</strong>,</p>"
            + "<p style='margin:8px 0 20px;color:#6e6e82;font-size:14px'>Aquí va la información actualizada de tu pedido <strong>" + esc(pedido.getNumeroPedido()) + "</strong>.</p>"
            + "<div style='background:#f5f5f7;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;justify-content:space-between'>"
            + "<span style='color:#6e6e82;font-size:13px'>Estado actual</span>"
            + "<span style='color:#4f7cff;font-weight:700;font-size:13px'>" + estado + "</span>"
            + "</div>"
            + guiaSection
            + retiroSection
            + "<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>"
            + "<tbody>" + items + "</tbody>"
            + "</table>"
            + "<div style='border-top:2px solid #e8e8ed;padding-top:12px;text-align:right'>"
            + "<span style='color:#1a1a2e;font-weight:700;font-size:15px'>Total: ₡" + CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div>"
            + "</div>"
            + "<div style='padding:20px 32px;background:#f5f5f7;text-align:center'>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600'>📱 Contáctanos por WhatsApp</a>"
            + "<p style='margin:12px 0 0;color:#aaa;font-size:11px'>HOTCLICK · hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div>"
            + "</div></body></html>";
    }

    private String buildGuiaHtml(Pedido pedido, Usuario cliente) {
        String nombre = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        String guia   = esc(pedido.getNumeroGuia());
        String url    = pedido.getUrlTracking() != null ? pedido.getUrlTracking()
            : "https://rastreo.correos.go.cr/?codigo=" + pedido.getNumeroGuia();

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f5f7;font-family:sans-serif'>"
            + "<div style='max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>"
            + "<div style='background:linear-gradient(135deg,#059669,#047857);padding:32px 32px 24px'>"
            + "<span style='color:#fff;font-size:20px;font-weight:900;letter-spacing:1px'>HOTCLICK</span>"
            + "<h1 style='color:#fff;margin:16px 0 0;font-size:22px;font-weight:700'>¡Tu pedido fue enviado! 🚚</h1>"
            + "</div>"
            + "<div style='padding:28px 32px'>"
            + "<p style='margin:0;color:#1a1a2e;font-size:15px'>Hola <strong>" + nombre + "</strong>,</p>"
            + "<p style='margin:8px 0 24px;color:#6e6e82;font-size:14px'>Tu pedido <strong>" + esc(pedido.getNumeroPedido()) + "</strong> está en camino con Correos de Costa Rica.</p>"
            + "<div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px'>"
            + "<p style='margin:0 0 6px;font-size:12px;color:#059669;font-weight:600;text-transform:uppercase;letter-spacing:1px'>Número de guía</p>"
            + "<p style='margin:0;font-size:24px;font-weight:900;color:#1a1a2e;letter-spacing:2px'>" + guia + "</p>"
            + "</div>"
            + "<div style='text-align:center;margin-bottom:24px'>"
            + "<a href='" + url + "' style='display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700'>📦 Rastrear mi paquete</a>"
            + "</div>"
            + "<p style='margin:0;font-size:12px;color:#9ca3af;text-align:center'>También puedes rastrear en: rastreo.correos.go.cr con el número de guía</p>"
            + "</div>"
            + "<div style='padding:20px 32px;background:#f5f5f7;text-align:center'>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600'>📱 Contáctanos por WhatsApp</a>"
            + "<p style='margin:12px 0 0;color:#aaa;font-size:11px'>HOTCLICK · hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div>"
            + "</div></body></html>";
    }

    private String buildHtml(Pedido pedido, Usuario cliente) {
        StringBuilder items = new StringBuilder();
        for (PedidoItem item : pedido.getItems()) {
            String nombre = item.getProducto() != null ? item.getProducto().getNombreProducto() : "Producto";
            items.append("<tr>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #e8e8ed'>").append(esc(nombre)).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #e8e8ed;text-align:center'>").append(item.getCantidad()).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #e8e8ed;text-align:right'>₡").append(CRC.format(item.getPrecioUnitarioMomento())).append("</td>")
                .append("<td style='padding:10px 8px;border-bottom:1px solid #e8e8ed;text-align:right'>₡").append(CRC.format(item.getSubtotalItem())).append("</td>")
                .append("</tr>");
        }

        String metodoEnvio = "ENVIO_A_DOMICILIO".equals(pedido.getMetodoEnvio())
            ? "Envío a domicilio (₡" + CRC.format(pedido.getCostoEnvio()) + ")"
            : "Retiro en tienda";

        String nombreCliente = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f5f7;font-family:sans-serif'>"
            + "<div style='max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>"
            + "<div style='background:linear-gradient(135deg,#4f7cff,#7c3aed);padding:32px 32px 24px'>"
            + "<span style='color:#fff;font-size:20px;font-weight:900;letter-spacing:1px'>HOTCLICK</span>"
            + "<h1 style='color:#fff;margin:16px 0 0;font-size:22px;font-weight:700'>¡Pedido confirmado! ✅</h1>"
            + "</div>"
            + "<div style='padding:28px 32px 0'>"
            + "<p style='margin:0;color:#1a1a2e;font-size:15px'>Hola <strong>" + nombreCliente + "</strong>,</p>"
            + "<p style='margin:8px 0 0;color:#6e6e82;font-size:14px'>Tu pago fue procesado exitosamente. Aquí está el resumen de tu pedido:</p>"
            + "</div>"
            + "<div style='margin:20px 32px;background:#f5f5f7;border-radius:10px;padding:14px 20px'>"
            + "<span style='color:#6e6e82;font-size:13px'>Número de pedido: </span>"
            + "<span style='color:#1a1a2e;font-weight:700;font-size:14px'>" + esc(pedido.getNumeroPedido()) + "</span>"
            + "</div>"
            + "<div style='padding:0 32px'>"
            + "<table style='width:100%;border-collapse:collapse;font-size:13px'>"
            + "<thead><tr style='background:#f5f5f7'>"
            + "<th style='padding:10px 8px;text-align:left;color:#6e6e82;font-weight:600'>Producto</th>"
            + "<th style='padding:10px 8px;text-align:center;color:#6e6e82;font-weight:600'>Cant.</th>"
            + "<th style='padding:10px 8px;text-align:right;color:#6e6e82;font-weight:600'>Precio</th>"
            + "<th style='padding:10px 8px;text-align:right;color:#6e6e82;font-weight:600'>Subtotal</th>"
            + "</tr></thead>"
            + "<tbody>" + items + "</tbody>"
            + "</table>"
            + "</div>"
            + "<div style='margin:16px 32px 0;border-top:2px solid #e8e8ed;padding-top:16px'>"
            + "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#6e6e82;font-size:13px'>Subtotal</span>"
            + "<span style='color:#1a1a2e;font-size:13px'>₡" + CRC.format(pedido.getSubtotal()) + "</span>"
            + "</div>"
            + (pedido.getCostoEnvio() > 0 ? "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>"
            + "<span style='color:#6e6e82;font-size:13px'>Envío</span>"
            + "<span style='color:#1a1a2e;font-size:13px'>₡" + CRC.format(pedido.getCostoEnvio()) + "</span>"
            + "</div>" : "")
            + "<div style='display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid #e8e8ed'>"
            + "<span style='color:#1a1a2e;font-weight:700;font-size:15px'>Total pagado</span>"
            + "<span style='color:#4f7cff;font-weight:700;font-size:15px'>₡" + CRC.format(pedido.getTotalPedido()) + "</span>"
            + "</div>"
            + "</div>"
            + "<div style='margin:20px 32px;background:#eff6ff;border-radius:10px;padding:16px 20px'>"
            + "<p style='margin:0 0 6px;font-weight:600;color:#1a1a2e;font-size:13px'>📦 Método de entrega</p>"
            + "<p style='margin:0;color:#6e6e82;font-size:13px'>" + esc(metodoEnvio) + "</p>"
            + "</div>"
            + "<div style='padding:24px 32px;background:#f5f5f7;margin-top:24px;text-align:center'>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600'>📱 +506 8974-5370</a>"
            + "<p style='margin:16px 0 0;color:#aaa;font-size:11px'>HOTCLICK · hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div>"
            + "</div></body></html>";
    }

    private String buildPagoFallidoHtml(Pedido pedido, Usuario cliente, String motivo) {
        String nombre = esc(cliente.getNombre() != null ? cliente.getNombre() : "Cliente");
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f5f7;font-family:sans-serif'>"
            + "<div style='max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)'>"
            + "<div style='background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px 32px 24px'>"
            + "<span style='color:#fff;font-size:20px;font-weight:900;letter-spacing:1px'>HOTCLICK</span>"
            + "<h1 style='color:#fff;margin:16px 0 0;font-size:22px;font-weight:700'>Problema con tu pago ⚠️</h1>"
            + "</div>"
            + "<div style='padding:28px 32px'>"
            + "<p style='margin:0;color:#1a1a2e;font-size:15px'>Hola <strong>" + nombre + "</strong>,</p>"
            + "<p style='margin:8px 0 24px;color:#6e6e82;font-size:14px'>Tu pago para el pedido <strong>" + esc(pedido.getNumeroPedido()) + "</strong> no pudo completarse.</p>"
            + "<div style='background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:24px'>"
            + "<p style='margin:0;font-size:13px;color:#dc2626'>" + esc(motivo != null ? motivo : "El pago fue rechazado o cancelado.") + "</p>"
            + "</div>"
            + "<p style='margin:0 0 16px;color:#6e6e82;font-size:14px'>El stock ha sido liberado. Puedes volver a intentarlo.</p>"
            + "</div>"
            + "<div style='padding:20px 32px;background:#f5f5f7;text-align:center'>"
            + "<a href='https://wa.me/50689745370' style='display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600'>📱 Contactar soporte</a>"
            + "<p style='margin:12px 0 0;color:#aaa;font-size:11px'>HOTCLICK · hotclick.cr@gmail.com · Costa Rica</p>"
            + "</div>"
            + "</div></body></html>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
