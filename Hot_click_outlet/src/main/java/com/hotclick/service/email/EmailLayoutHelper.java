package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.utils.TokenSeguimientoPedido;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
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

    /** Montos con punto de miles (₡10.500), como en Figma y en el sitio. */
    public static final NumberFormat CRC = formatoColones();

    private static NumberFormat formatoColones() {
        DecimalFormatSymbols simbolos = new DecimalFormatSymbols(Locale.forLanguageTag("es-CR"));
        simbolos.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", simbolos);
    }

    public static final String F_TEXT    = "'Public Sans',Arial,Helvetica,sans-serif";
    public static final String F_DISPLAY = "'Sora',Arial,Helvetica,sans-serif";
    public static final String F_MONO    = "'IBM Plex Mono','Courier New',monospace";

    public static final String WHATSAPP_URL   = "https://wa.me/50686667888";
    public static final String WHATSAPP_TEXTO = "8666-7888";

    /** Fondos del círculo de ícono del encabezado (Figma: success-bg, blue/50, warning-bg, red/50). */
    public static final String FONDO_EXITO  = "#E9F7F0";
    public static final String FONDO_INFO   = "#EFF4FE";
    public static final String FONDO_AVISO  = "#FDF3DC";
    public static final String FONDO_ALERTA = "#FEF2F1";
    /** Fondo gris de recuadros de código y notas neutras (n/50). */
    public static final String FONDO_SUAVE  = "#F8F9FB";

    /** Textos y acentos de SHELL que los builders pasan como argumento (n/900, n/600, blue/600). */
    public static final String TEXTO       = "#14171C";
    public static final String TEXTO_SUAVE = "#4D5560";
    public static final String AZUL        = "#1747A8";

    /** Pregunta del pie de los correos al cliente. */
    public static final String PREGUNTA_DUDAS = "¿Dudas?";

    /** Apertura de las tablas de maquetación: Outlook necesita los atributos además del estilo. */
    private static final String TABLA       = "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"";
    private static final String TABLA_ANCHA = "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"";

    private static final String RASTREO_CORREOS = "https://rastreo.correos.go.cr/?codigo=";

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
             + TABLA_ANCHA + " style=\"background:#F1F3F6\">"
             + "<tr><td align=\"center\" style=\"padding:24px 12px\">"
             + "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\""
             + " style=\"width:100%;max-width:600px;background:#FFFFFF;border:1px solid " + BORDE + ";border-radius:14px;border-collapse:separate\">"
             + "<tr><td style=\"padding:20px 32px;border-bottom:1px solid " + BORDE + "\">" + wordmark(false) + "</td></tr>";
    }

    /** Título y bajada del correo. El texto dinámico debe llegar ya escapado. */
    public String header(String titulo, String sub) {
        return "<tr><td style=\"padding:28px 32px 0\">"
             + titulo(titulo, sub, "0")
             + "</td></tr>";
    }

    /**
     * Encabezado de Figma: círculo de 48 con ícono de 24, título de 24 y bajada de 15.
     * {@code icono} es el nombre de un PNG de {@code /email/icono-<nombre>.png} (Gmail no muestra SVG).
     * El texto dinámico debe llegar ya escapado.
     */
    public String headerConIcono(String fondo, String icono, String titulo, String sub) {
        return "<tr><td style=\"padding:28px 32px 0\">"
             + TABLA + "><tr>"
             + "<td width=\"48\" height=\"48\" align=\"center\" valign=\"middle\""
             + " style=\"width:48px;height:48px;background:" + fondo + ";border-radius:24px\">"
             + "<img src=\"" + iconoUrl(icono) + "\" width=\"24\" height=\"24\" alt=\"\""
             + " style=\"display:block;border:0;margin:0 auto\">"
             + "</td></tr></table>"
             + titulo(titulo, sub, "10px")
             + "</td></tr>";
    }

    private String titulo(String titulo, String sub, String margenSuperior) {
        return "<h1 style=\"margin:" + margenSuperior + " 0 0;color:#14171C;font-size:24px;line-height:30px;font-weight:700;font-family:" + F_DISPLAY + "\">" + titulo + "</h1>"
             + (sub != null ? "<p style=\"margin:10px 0 0;color:#4D5560;font-size:15px;line-height:22px\">" + sub + "</p>" : "");
    }

    /** URL pública del PNG de un ícono de correo (viven en {@code frontend/public/email}). */
    public String iconoUrl(String nombre) {
        return SITIO + "/email/icono-" + nombre + ".png";
    }

    public String abrirCuerpo() {
        return "<tr><td style=\"padding:18px 32px 32px;color:#14171C;font-size:14px;line-height:1.6\">";
    }

    /** Botón rojo principal, uno por correo. Tabla + padding en el enlace para que Outlook respete el tamaño. */
    public String cta(String url, String label) {
        return boton(url, label, "#E73B33", "12px");
    }

    /** Botón azul (Figma lo usa para seguir el paquete). */
    public String ctaAzul(String url, String label) {
        return boton(url, label, "#1747A8", "10px");
    }

    private String boton(String url, String label, String fondo, String radio) {
        return TABLA + " style=\"margin:0 0 18px\"><tr>"
             + "<td style=\"background:" + fondo + ";border-radius:" + radio + "\">"
             + "<a href=\"" + esc(url) + "\" style=\"display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;"
             + "font-size:15px;font-weight:700;font-family:" + F_TEXT + "\">" + label + "</a>"
             + "</td></tr></table>";
    }

    /** Cierra el cuerpo y agrega el pie con soporte por WhatsApp. */
    public String footer(String pregunta) {
        return "</td></tr>"
             + "<tr><td style=\"padding:20px 32px;background:#F8F9FB;border-top:1px solid " + BORDE + ";border-radius:0 0 14px 14px\">"
             + "<p style=\"margin:0 0 6px;color:#4D5560;font-size:13px;line-height:19px\">" + pregunta
             + " Escribinos por WhatsApp al <a href=\"" + WHATSAPP_URL + "\" style=\"color:#4D5560;text-decoration:none\">"
             + WHATSAPP_TEXTO + "</a> o respondé este correo.</p>"
             + "<p style=\"margin:0;color:#6E7682;font-size:12px;line-height:17px\">HotClick · Marketplace de emprendedores de Costa Rica · "
             + "<a href=\"https://hotclick.lat\" style=\"color:#6E7682;text-decoration:none\">hotclick.lat</a></p>"
             + "</td></tr></table></td></tr></table></body></html>";
    }

    /** Recuadro con borde que agrupa filas de producto (Figma: radio 12, relleno 16). */
    public String caja(String contenido) {
        return TABLA_ANCHA
             + " style=\"border:1px solid " + BORDE + ";border-radius:12px;border-collapse:separate;margin:0 0 18px\">"
             + espaciador(10) + contenido + espaciador(10) + "</table>";
    }

    private String espaciador(int alto) {
        return "<tr><td colspan=\"3\" height=\"" + alto + "\" style=\"height:" + alto + "px;line-height:" + alto + "px;font-size:0\">&nbsp;</td></tr>";
    }

    /** Fila de producto: miniatura de 56, nombre, detalle y precio. Los textos deben llegar escapados. */
    public String filaProducto(String imgUrl, String nombre, String detalle, String precio) {
        String img = (imgUrl != null && !imgUrl.isBlank())
            ? "<img src=\"" + esc(imgUrl) + "\" width=\"56\" height=\"56\" alt=\"\" style=\"display:block;border-radius:8px;border:0;object-fit:cover\">"
            : "<div style=\"width:56px;height:56px;border-radius:8px;background:#F1F3F6\"></div>";
        return "<tr><td width=\"68\" style=\"padding:6px 0 6px 16px;vertical-align:middle\">" + img + "</td>"
             + "<td style=\"padding:6px 8px 6px 12px;vertical-align:middle\">"
             + "<p style=\"margin:0;color:#14171C;font-size:14px;font-weight:500\">" + nombre + "</p>"
             + (detalle != null && !detalle.isBlank() ? "<p style=\"margin:2px 0 0;color:#6E7682;font-size:12px\">" + detalle + "</p>" : "")
             + "</td>"
             + "<td align=\"right\" style=\"padding:6px 16px 6px 8px;vertical-align:middle;white-space:nowrap;"
             + "color:#14171C;font-size:14px;font-weight:600;font-family:" + F_DISPLAY + "\">" + precio + "</td></tr>";
    }

    /** Fila de totales. {@code fuerte} marca la fila del total (Public Sans 16 la etiqueta, Sora 18 el monto). */
    public String filaMonto(String etiqueta, String monto, boolean fuerte) {
        String tamEtiqueta = fuerte ? "16px" : "14px";
        String tamMonto = fuerte ? "18px" : "14px";
        String peso = fuerte ? "700" : "400";
        String colorEtiqueta = fuerte ? "#14171C" : "#4D5560";
        String fuenteMonto = fuerte ? F_DISPLAY : F_TEXT;
        return "<tr><td style=\"padding:4px 0;color:" + colorEtiqueta + ";font-size:" + tamEtiqueta + ";font-weight:" + peso + ";font-family:" + F_TEXT + "\">" + etiqueta + "</td>"
             + "<td align=\"right\" style=\"padding:4px 0;color:#14171C;font-size:" + tamMonto + ";font-weight:" + peso + ";font-family:" + fuenteMonto + "\">" + monto + "</td></tr>";
    }

    public String tablaMontos(String filas) {
        return TABLA_ANCHA + " style=\"margin:0 0 14px\">" + filas + "</table>";
    }

    /** Dato destacado en recuadro (número de guía, código, cupón). */
    public String datoDestacado(String etiqueta, String valor, String fondo, String borde) {
        return TABLA_ANCHA
             + " style=\"background:" + fondo + ";border:1px solid " + borde + ";border-radius:12px;border-collapse:separate;margin:8px 0 16px\">"
             + "<tr><td align=\"center\" style=\"padding:18px 16px\">"
             + "<p style=\"margin:0 0 6px;color:#4D5560;font-size:12px;text-transform:uppercase;letter-spacing:1px\">" + etiqueta + "</p>"
             + "<p style=\"margin:0;color:#14171C;font-size:26px;font-weight:700;letter-spacing:3px;font-family:" + F_MONO + "\">" + valor + "</p>"
             + "</td></tr></table>";
    }

    /**
     * Recuadro de código de Figma: borde punteado gris, etiqueta de 12 y valor de 30
     * (guía y código de verificación en mono 500; cupón en Sora 800). {@code valor} llega escapado.
     */
    public String codigoDestacado(String etiqueta, String valor, String fondo, boolean enMono) {
        String fuente = enMono ? F_MONO : F_DISPLAY;
        String peso = enMono ? "500" : "800";
        return TABLA_ANCHA
             + " style=\"background:" + fondo + ";border:1px dashed #9AA1AE;border-radius:12px;border-collapse:separate;margin:0 0 18px\">"
             + "<tr><td align=\"center\" style=\"padding:18px 16px\">"
             + "<p style=\"margin:0 0 4px;color:#6E7682;font-size:12px;line-height:15px\">" + etiqueta + "</p>"
             + "<p style=\"margin:0;color:#14171C;font-size:30px;line-height:38px;font-weight:" + peso + ";font-family:" + fuente + "\">" + valor + "</p>"
             + "</td></tr></table>";
    }

    /** Nota con fondo de color y título opcional (Motivo, Mensaje de la tienda). Los textos llegan escapados. */
    public String notaConTitulo(String fondo, String colorTitulo, String tituloNota, String texto, String colorTexto, String tamTexto) {
        return TABLA_ANCHA
             + " style=\"background:" + fondo + ";border-radius:12px;border-collapse:separate;margin:0 0 18px\">"
             + "<tr><td style=\"padding:16px\">"
             + "<p style=\"margin:0 0 4px;color:" + colorTitulo + ";font-size:13px;font-weight:600\">" + tituloNota + "</p>"
             + "<p style=\"margin:0;color:" + colorTexto + ";font-size:" + tamTexto + ";line-height:20px\">" + texto + "</p>"
             + "</td></tr></table>";
    }

    /** Nota azul con ícono de 18 (Figma: «Otros paquetes»). El texto llega escapado. */
    public String notaAzul(String icono, String texto) {
        return TABLA_ANCHA
             + " style=\"background:#EFF4FE;border-radius:10px;border-collapse:separate;margin:0 0 18px\">"
             + "<tr><td width=\"18\" valign=\"top\" style=\"padding:13px 0 12px 16px\">"
             + "<img src=\"" + iconoUrl(icono) + "\" width=\"18\" height=\"18\" alt=\"\" style=\"display:block;border:0\"></td>"
             + "<td style=\"padding:12px 16px 12px 10px;color:#1747A8;font-size:14px;line-height:20px\">" + texto + "</td></tr></table>";
    }

    /** Línea pequeña gris bajo el botón (aclaraciones). El texto llega escapado. */
    public String notaPequena(String texto) {
        return "<p style=\"margin:0 0 18px;color:#6E7682;font-size:13px;line-height:19px\">" + texto + "</p>";
    }

    /**
     * Pasos del pedido (Figma «Estados»): cuatro columnas con círculo de 24.
     * Los anteriores a {@code actual} van en verde con check, el actual en azul y los demás en gris.
     */
    public String pasosEstado(String[] etiquetas, int actual) {
        StringBuilder celdas = new StringBuilder();
        for (int i = 0; i < etiquetas.length; i++) {
            boolean hecho = i < actual;
            boolean esActual = i == actual;
            String fondo = fondoPaso(hecho, esActual);
            String interior = hecho
                ? "<img src=\"" + iconoUrl("check-blanco") + "\" width=\"14\" height=\"14\" alt=\"\" style=\"display:block;border:0;margin:0 auto\">"
                : "&nbsp;";
            String color = esActual || hecho ? "#14171C" : "#6E7682";
            String peso = esActual ? "700" : "500";
            celdas.append("<td align=\"center\" valign=\"top\" width=\"").append(100 / etiquetas.length).append("%\">")
                .append(TABLA + "><tr>")
                .append("<td width=\"24\" height=\"24\" align=\"center\" valign=\"middle\" style=\"width:24px;height:24px;background:").append(fondo)
                .append(";border-radius:12px;font-size:0;line-height:0\">").append(interior).append("</td></tr></table>")
                .append("<p style=\"margin:6px 0 0;color:").append(color).append(";font-size:12px;font-weight:").append(peso).append("\">")
                .append(esc(etiquetas[i])).append("</p></td>");
        }
        return TABLA_ANCHA + " style=\"margin:0 0 18px\"><tr>"
             + celdas + "</tr></table>";
    }

    private static String fondoPaso(boolean hecho, boolean esActual) {
        if (hecho) return "#178A50";
        return esActual ? AZUL : BORDE;
    }

    /** Rastreo por Correos de Costa Rica: el pedido no trae URL propia o trae una de correos.go.cr. */
    public boolean esRastreoCorreos(Pedido pedido) {
        return pedido.getUrlTracking() == null || pedido.getUrlTracking().contains("correos.go.cr");
    }

    /** URL de rastreo del paquete: la del pedido o la de Correos con el número de guía. */
    public String urlRastreo(Pedido pedido) {
        return pedido.getUrlTracking() != null ? pedido.getUrlTracking() : RASTREO_CORREOS + pedido.getNumeroGuia();
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
