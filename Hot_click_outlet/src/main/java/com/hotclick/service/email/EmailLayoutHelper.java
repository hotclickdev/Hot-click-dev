package com.hotclick.service.email;

import java.text.NumberFormat;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Piezas compartidas del Brand Book HotClick v1.1 (cap. 12.1) para emails transaccionales.
 */
@Component
public class EmailLayoutHelper {

    public static final NumberFormat CRC = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));

    // Tipografía con fallback de email (cap. 12.1): Sora → Arial Black · Public Sans → Arial
    public static final String F_TEXT    = "'Public Sans',Arial,Helvetica,sans-serif";
    public static final String F_DISPLAY = "'Sora','Arial Black',Arial,sans-serif";

    /** Wordmark bicolor (§2.1). Sobre fondo oscuro el rojo sube un paso y «Click» pasa a blanco (§2.4). */
    public String wordmark(boolean sobreOscuro) {
        String hot   = sobreOscuro ? "#F0524A" : "#E73B33";
        String click = sobreOscuro ? "#FFFFFF" : "#1747A8";
        return "<img src='https://hotclick.lat/brand/hotclick-isotipo.png' alt='HotClick' width='44' height='35'"
             + " style='display:inline-block;vertical-align:middle;margin-right:8px'>"
             + "<span style=\"font-family:" + F_DISPLAY + ";font-weight:800;font-size:20px;letter-spacing:-0.5px;"
             + "vertical-align:middle\">"
             + "<span style='color:" + hot + "'>Hot</span><span style='color:" + click + "'>Click</span></span>";
    }

    public String abrirHtml() {
        return "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
             + "<meta name='viewport' content='width=device-width,initial-scale=1'></head>"
             + "<body style=\"margin:0;padding:0;background:#F8F9FB;font-family:" + F_TEXT + "\">"
             + "<div style='max-width:600px;margin:32px auto;padding:0 16px'>";
    }

    /** Header de campaña sobre azul 900 (§5.3): el rojo queda reservado al CTA. */
    public String header(String titulo, String sub) {
        return "<div style='background:#152B5E;border-radius:16px 16px 0 0;padding:32px 36px 28px;text-align:center'>"
             + wordmark(true)
             + "<h1 style=\"margin:18px 0 0;color:#FFFFFF;font-size:26px;font-weight:800;line-height:1.2;font-family:" + F_DISPLAY + "\">" + titulo + "</h1>"
             + (sub != null ? "<p style='margin:10px 0 0;color:#C2D5F9;font-size:14px'>" + sub + "</p>" : "")
             + "</div>";
    }

    public String abrirCuerpo() {
        return "<div style='background:#FFFFFF;padding:32px 36px;border-left:1px solid #E4E7EC;border-right:1px solid #E4E7EC'>";
    }

    /** CTA primario — Rojo Hot, uno por correo (cap. 3.5 / 12.1). */
    public String cta(String url, String label) {
        return "<div style='text-align:center;padding:8px 0'>"
             + "<a href='" + esc(url) + "' style='display:inline-block;background:#E73B33;color:#FFFFFF;text-decoration:none;"
             + "padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700'>" + label + "</a></div>";
    }

    /** Footer neutro 900 con soporte por WhatsApp (canal primario, cap. 15) y firma. */
    public String footer(String pregunta) {
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

    public String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
