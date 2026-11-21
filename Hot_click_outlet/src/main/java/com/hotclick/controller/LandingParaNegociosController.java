package com.hotclick.controller;

import com.hotclick.utils.SoporteTelefono;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Landing estática «HotClick para negocios» (agendar demo) en /para-negocios.
 *
 * <p>El HTML vive fuera de {@code static/} ({@code classpath:/landing/para-negocios.html}) porque lleva marcadores
 * que se llenan aquí: el WhatsApp de soporte sale de {@code hotclick.soporte.telefono} y nunca se escribe en el repo.
 * Sin número configurado, los botones de WhatsApp van a /contacto y el teléfono visible se omite.
 * Imágenes, scripts y audio están en {@code static/para-negocios/} (copiados por Vite desde {@code public/}).
 */
@Controller
public class LandingParaNegociosController {

    static final String RUTA = "/para-negocios";
    static final String MARCA_WA = "__SOPORTE_WA__";
    static final String MARCA_TEXTO = "__SOPORTE_TEXTO__";
    static final String MARCA_CALENDARIO = "__DEMO_CALENDARIO__";
    /** Página de reservas de Google Calendar (con o sin /calendar, con o sin ?gv=true). */
    private static final Pattern CALENDARIO = Pattern.compile(
        "^https://calendar\\.google\\.com/(?:calendar/)?appointments/schedules/([A-Za-z0-9_-]{10,200})(?:\\?gv=true)?$");
    private static final Pattern ENLACE_WA = Pattern.compile("https://wa\\.me/" + MARCA_WA + "\\?text=[^\"]*");

    @Value("classpath:/landing/para-negocios.html")
    private Resource plantilla;

    @Value("${hotclick.soporte.telefono:}")
    private String telefonoSoporte;

    /** Sin default: vacío o inválido ⇒ no se inserta el calendario y queda el botón de WhatsApp. */
    @Value("${hotclick.demo.calendario-url:}")
    private String calendarioUrl;

    private volatile String html;

    @PostConstruct
    void cargar() throws IOException {
        html = render(new String(plantilla.getInputStream().readAllBytes(), StandardCharsets.UTF_8), telefonoSoporte, calendarioUrl);
    }

    static String render(String plantilla, String telefono, String calendario) {
        return render(plantilla, telefono).replace(MARCA_CALENDARIO, calendarioEmbebible(calendario));
    }

    /** URL para el iframe (formato de inserción de Google, {@code ?gv=true}); "" si no es una página de reservas de Google. */
    static String calendarioEmbebible(String url) {
        Matcher m = CALENDARIO.matcher(url == null ? "" : url.trim());
        return m.matches() ? "https://calendar.google.com/calendar/appointments/schedules/" + m.group(1) + "?gv=true" : "";
    }

    static String render(String plantilla, String telefono) {
        String digitos = SoporteTelefono.digitosWa(telefono);
        if (digitos.isEmpty()) {
            String sinWa = ENLACE_WA.matcher(plantilla).replaceAll("/contacto");
            return sinWa.replace("<b>" + MARCA_TEXTO + "</b> · ", "");
        }
        return plantilla
            .replace(MARCA_WA, digitos)
            .replace(MARCA_TEXTO, SoporteTelefono.texto(telefono));
    }

    @GetMapping(value = RUTA, produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> pagina() {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic())
            .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
            .body(html);
    }

    /** Con barra final: redirige a la ruta canónica. */
    @GetMapping(RUTA + "/")
    public ResponseEntity<Void> conBarra() {
        return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY).header(HttpHeaders.LOCATION, RUTA).build();
    }
}
