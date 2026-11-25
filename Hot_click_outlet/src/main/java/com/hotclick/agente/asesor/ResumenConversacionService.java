package com.hotclick.agente.asesor;

import com.hotclick.agente.bandeja.BandejaService;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.security.RateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Resumen corto y respuesta sugerida de UNA conversación de la bandeja (AG-17).
 *
 * <p>Garantías: la conversación se carga con {@link BandejaService#mensajesParaResumen} (mismo aislamiento por
 * empresa que el resto de la bandeja: fuera de alcance responde 404); el modelo corre con el perfil
 * {@code RESUMEN_BANDEJA} (Haiku, effort low, SIN herramientas) y solo ve el texto de esa conversación, sin
 * teléfono ni datos de otras; no envía nada al cliente (la persona edita y envía con el flujo de siempre).
 * Límite por usuario con {@link RateLimiter}; el costo lo registra el motor en {@code ClaudeUsoRegistrador}.
 * Modo de fallo: si Claude no responde, {@code disponible=false} y la bandeja sigue funcionando.
 */
@Service
public class ResumenConversacionService {

    private static final Logger log = LoggerFactory.getLogger(ResumenConversacionService.class);
    static final int TEXTO_MAX = 500;
    static final int SUGERENCIA_MAX = 1000;
    static final int RESUMEN_MAX = 800;
    static final int VENTANA_SEGUNDOS = 3600;
    private static final String MARCA_SUGERENCIA = "SUGERENCIA:";
    private static final String MARCA_RESUMEN = "RESUMEN:";

    /** resumen y sugerencia en texto plano; disponible=false si no se pudo generar. */
    public record Resultado(boolean disponible, String resumen, String sugerencia) {
        static Resultado noDisponible() { return new Resultado(false, "", ""); }

        /** Sin el resumen ni la sugerencia: citan la conversación del cliente (AG-14 H-07). */
        @Override
        public String toString() {
            return "Resultado[disponible=" + disponible + "]";
        }
    }

    private final BandejaService bandeja;
    private final MotorAgente motor;
    private final RateLimiter rateLimiter;
    private final int maxPorHora;

    public ResumenConversacionService(BandejaService bandeja, MotorAgente motor, RateLimiter rateLimiter,
                                      @Value("${agente.resumen.max-por-hora:20}") int maxPorHora) {
        this.bandeja = bandeja;
        this.motor = motor;
        this.rateLimiter = rateLimiter;
        this.maxPorHora = Math.max(1, maxPorHora);
    }

    public Resultado generar(UUID conversacionId, Long scope, Long usuarioId) {
        // 404 primero (aislamiento), después el límite: no se gasta cupo con ids ajenos.
        List<ConversacionMensaje> mensajes = bandeja.mensajesParaResumen(conversacionId, scope);
        if (!rateLimiter.tryAcquire("bandeja_resumen:u:" + usuarioId, maxPorHora, VENTANA_SEGUNDOS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Pediste muchos resúmenes seguidos. Intentá de nuevo en un rato.");
        }
        String transcripcion = transcribir(mensajes);
        if (transcripcion.isBlank()) return Resultado.noDisponible();
        ContextoHerramienta ctx = new ContextoHerramienta(scope, null, PerfilAgente.RESUMEN_BANDEJA, null,
            null, null, usuarioId);
        ResultadoAgente r;
        try {
            r = motor.ejecutarSinFiltroEntrada(PerfilAgente.RESUMEN_BANDEJA, ctx, List.of(), transcripcion);
        } catch (RuntimeException e) {
            log.warn("[bandeja-resumen] falló el motor: {}", e.getClass().getSimpleName());
            return Resultado.noDisponible();
        }
        if (r.motivoFin() != MotivoFin.COMPLETO || r.texto().isBlank()) return Resultado.noDisponible();
        return parsear(r.texto());
    }

    /** Líneas "Cliente:/Bot:/Persona:"; el texto va en una sola línea para que no pueda forjar otro turno. */
    static String transcribir(List<ConversacionMensaje> mensajes) {
        StringBuilder sb = new StringBuilder();
        for (ConversacionMensaje m : mensajes) {
            String rol = switch (m.getRol() == null ? "" : m.getRol()) {
                case ConversacionMensaje.ROL_CLIENTE -> "Cliente";
                case ConversacionMensaje.ROL_BOT -> "Bot";
                case ConversacionMensaje.ROL_PERSONA -> "Persona";
                default -> null;
            };
            if (rol == null || m.getContenido() == null) continue;
            String t = m.getContenido().replaceAll("\\s+", " ").trim();
            if (t.isEmpty()) continue;
            if (t.length() > TEXTO_MAX) t = t.substring(0, TEXTO_MAX);
            sb.append(rol).append(": ").append(t).append('\n');
        }
        return sb.toString().trim();
    }

    static Resultado parsear(String texto) {
        String t = texto.trim();
        int iSug = indiceMarca(t, MARCA_SUGERENCIA);
        String resumen = iSug >= 0 ? t.substring(0, iSug) : t;
        String sugerencia = iSug >= 0 ? t.substring(iSug + MARCA_SUGERENCIA.length()) : "";
        int iRes = indiceMarca(resumen, MARCA_RESUMEN);
        if (iRes >= 0) resumen = resumen.substring(iRes + MARCA_RESUMEN.length());
        resumen = recortar(resumen.trim(), RESUMEN_MAX);
        sugerencia = recortar(sugerencia.trim(), SUGERENCIA_MAX);
        if (resumen.isEmpty() && sugerencia.isEmpty()) return Resultado.noDisponible();
        return new Resultado(true, resumen, sugerencia);
    }

    private static int indiceMarca(String t, String marca) {
        return t.toUpperCase(Locale.ROOT).indexOf(marca);
    }

    private static String recortar(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
