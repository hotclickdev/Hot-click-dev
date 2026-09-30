package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.utils.TokenSeguimientoPedido;
import java.text.NumberFormat;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Esqueleto de los correos transaccionales (Figma "08 · QR y correos").
 * Solo tablas y estilos inline: Gmail y Outlook ignoran flex y hojas de estilo.
 */
@Component
public class EmailLayoutHelper {

    public static final NumberFormat CRC = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));

    public static final String F_TEXT    = "'Public Sans',Arial,Helvetica,sans-serif";
    public static final String F_DISPLAY = "'Sora','Arial Black',Arial,sans-serif";
    public static final String F_MONO    = "'IBM Plex Mono','Courier New',monospace";

    public static final String WHATSAPP_URL   = "https://wa.me/50686667888";
    public static final String WHATSAPP_TEXTO = "8666-7888";

    private static final String BORDE = "#E4E7EC";
    private static final String SITIO = "https://hotclick.lat";

    /** Base de los enlaces al sitio. Inicializada para que los builders instanciados con {@code new} en tests también funcionen. */
    @Value("${app.url:" + SITIO + "}")
    private String appUrl = SITIO;

    /**
     * Enlace al seguimiento público del pedido (/seguimiento/{token}), válido con o sin cuenta.
     * Un pedido sin token (no persistido) cae a «Mis pedidos».
     */
    public String urlSeguimiento(Pedido pedido) {
        String base = appUrl == null || appUrl.isBlank() ? SITIO : appUrl.replaceAll("/+$", "");
        String token = pedido != null ? pedido.getTokenSeguimiento() : null;
        return TokenSeguimientoPedido.formatoValido(token) ? base + "/seguimiento/" + token : base + "/mis-pedidos";
    }

    /** Enlace de texto azul, para correos que ya tienen su botón principal. El label debe llegar ya escapado. */
    public String enlaceSecundario(String url, String label) {
        return "<p style=\"margin:16px 0 0;font-size:14px;font-family:" + F_TEXT + "\">"
             + "<a href=\"" + esc(url) + "\" style=\"color:#1747A8;text-decoration:none;font-weight:700\">" + label + "</a></p>";
    }

    /** Isotipo + wordmark bicolor. Sobre fondo oscuro el rojo sube un paso y «Click» pasa a blanco. */
    public String wordmark(boolean sobreOscuro) {
        String hot   = sobreOscuro ? "#F0524A" : "#E73B33";
        String click = sobreOscuro ? "#FFFFFF" : "#1747A8";
        return "<img src=\"https://hotclick.lat/brand/hotclick-isotipo.png\" alt=\"HotClick\" width=\"34\" height=\"27\""
             + " style=\"display:inline-block;vertical-align:middle;margin-right:8px;border:0\">"
             + "<span style=\"font-family:" + F_DISPLAY + ";font-weight:800;font-size:20px;letter-spacing:-0.5px;vertical-align:middle\">"
             + "<span style=\"color:" + hot + "\">Hot</span><span style=\"color:" + click + "\">Click</span></span>";
    }

    public String abrirHtml() {
        return "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"UTF-8\">"
             + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>"
             + "<body style=\"margin:0;padding:0;background:#F1F3F6;font-family:" + F_TEXT + "\">"
             + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#F1F3F6\">"
             + "<tr><td align=\"center\" style=\"padding:24px 12px\">"
             + "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\""
             + " style=\"width:100%;max-width:600px;background:#FFFFFF;border:1px solid " + BORDE + ";border-radius:16px;border-collapse:separate\">"
             + "<tr><td style=\"padding:20px 32px;border-bottom:1px solid " + BORDE + "\">" + wordmark(false) + "</td></tr>";
    }

    /** Título y bajada del correo. El texto dinámico debe llegar ya escapado. */
    public String header(String titulo, String sub) {
        return "<tr><td style=\"padding:28px 32px 8px\">"
             + "<h1 style=\"margin:0;color:#14171C;font-size:24px;line-height:1.25;font-weight:700;font-family:" + F_DISPLAY + "\">" + titulo + "</h1>"
             + (sub != null ? "<p style=\"margin:10px 0 0;color:#4D5560;font-size:15px;line-height:1.5\">" + sub + "</p>" : "")
             + "</td></tr>";
    }

    public String abrirCuerpo() {
        return "<tr><td style=\"padding:16px 32px 28px;color:#14171C;font-size:14px;line-height:1.6\">";
    }

    /** Botón rojo principal, uno por correo. Tabla + padding en el enlace para que Outlook respete el tamaño. */
    public String cta(String url, String label) {
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:20px 0 4px\"><tr>"
             + "<td style=\"background:#E73B33;border-radius:10px\">"
             + "<a href=\"" + esc(url) + "\" style=\"display:inline-block;padding:13px 28px;color:#FFFFFF;text-decoration:none;"
             + "font-size:15px;font-weight:700;font-family:" + F_TEXT + "\">" + label + "</a>"
             + "</td></tr></table>";
    }

    /** Cierra el cuerpo y agrega el pie con soporte por WhatsApp. */
    public String footer(String pregunta) {
        return "</td></tr>"
             + "<tr><td style=\"padding:20px 32px;background:#F8F9FB;border-top:1px solid " + BORDE + ";border-radius:0 0 16px 16px\">"
             + "<p style=\"margin:0 0 6px;color:#4D5560;font-size:13px;line-height:1.5\">" + pregunta
             + " Escribinos por WhatsApp al <a href=\"" + WHATSAPP_URL + "\" style=\"color:#1747A8;text-decoration:none;font-weight:600\">"
             + WHATSAPP_TEXTO + "</a> o respondé este correo.</p>"
             + "<p style=\"margin:0;color:#6E7682;font-size:12px\">HotClick · Marketplace de emprendedores de Costa Rica · "
             + "<a href=\"https://hotclick.lat\" style=\"color:#6E7682\">hotclick.lat</a></p>"
             + "</td></tr></table></td></tr></table></body></html>";
    }

    /** Recuadro con borde que agrupa filas (productos, datos). */
    public String caja(String contenido) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\""
             + " style=\"border:1px solid " + BORDE + ";border-radius:12px;border-collapse:separate;margin:8px 0 16px\">"
             + contenido + "</table>";
    }

    /** Fila de producto: miniatura, nombre, detalle y precio. Los textos deben llegar escapados. */
    public String filaProducto(String imgUrl, String nombre, String detalle, String precio) {
        String img = (imgUrl != null && !imgUrl.isBlank())
            ? "<img src=\"" + esc(imgUrl) + "\" width=\"56\" height=\"56\" alt=\"\" style=\"display:block;border-radius:8px;border:0;object-fit:cover\">"
            : "<div style=\"width:56px;height:56px;border-radius:8px;background:#F1F3F6\"></div>";
        return "<tr><td width=\"72\" style=\"padding:12px 0 12px 16px;vertical-align:middle\">" + img + "</td>"
             + "<td style=\"padding:12px 8px;vertical-align:middle\">"
             + "<p style=\"margin:0;color:#14171C;font-size:14px;font-weight:500\">" + nombre + "</p>"
             + (detalle != null && !detalle.isBlank() ? "<p style=\"margin:2px 0 0;color:#6E7682;font-size:12px\">" + detalle + "</p>" : "")
             + "</td>"
             + "<td align=\"right\" style=\"padding:12px 16px 12px 8px;vertical-align:middle;white-space:nowrap;"
             + "color:#14171C;font-size:14px;font-weight:700;font-family:" + F_DISPLAY + "\">" + precio + "</td></tr>";
    }

    /** Fila de totales. {@code fuerte} marca la fila del total. */
    public String filaMonto(String etiqueta, String monto, boolean fuerte) {
        String tam = fuerte ? "17px" : "14px";
        String peso = fuerte ? "700" : "400";
        String color = fuerte ? "#14171C" : "#4D5560";
        String fuente = fuerte ? F_DISPLAY : F_TEXT;
        return "<tr><td style=\"padding:4px 0;color:" + color + ";font-size:" + tam + ";font-weight:" + peso + ";font-family:" + fuente + "\">" + etiqueta + "</td>"
             + "<td align=\"right\" style=\"padding:4px 0;color:#14171C;font-size:" + tam + ";font-weight:" + peso + ";font-family:" + fuente + "\">" + monto + "</td></tr>";
    }

    public String tablaMontos(String filas) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:4px 0 12px\">" + filas + "</table>";
    }

    /** Dato destacado en recuadro (número de guía, código, cupón). */
    public String datoDestacado(String etiqueta, String valor, String fondo, String borde) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\""
             + " style=\"background:" + fondo + ";border:1px solid " + borde + ";border-radius:12px;border-collapse:separate;margin:8px 0 16px\">"
             + "<tr><td align=\"center\" style=\"padding:18px 16px\">"
             + "<p style=\"margin:0 0 6px;color:#4D5560;font-size:12px;text-transform:uppercase;letter-spacing:1px\">" + etiqueta + "</p>"
             + "<p style=\"margin:0;color:#14171C;font-size:26px;font-weight:700;letter-spacing:3px;font-family:" + F_MONO + "\">" + valor + "</p>"
             + "</td></tr></table>";
    }

    public String parrafo(String html) {
        return "<p style=\"margin:0 0 12px;color:#4D5560;font-size:14px;line-height:1.6\">" + html + "</p>";
    }

    public String monto(Integer valor) {
        return "₡" + CRC.format(valor != null ? valor : 0);
    }

    /** Escapa texto y atributos: sin esto un nombre o una URL con comillas rompe el HTML. */
    public String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
