package com.hotclick.agente.voz;

import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.motor.CostoAgenteListener;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Notas de voz del cliente (AG-13). El despacho lo invoca (ya fuera del hilo del webhook) cuando llega un audio:
 * <ol>
 *   <li>sin proveedor de transcripción: el bot pide con amabilidad que escriban el mensaje;</li>
 *   <li>con proveedor: descarga segura, transcribe y devuelve el mensaje con el texto para seguir el flujo normal
 *       (en el historial queda "[voz] ..."); la duración se suma al costo del negocio vía {@link CostoAgenteListener},
 *       el mismo tope de gasto del cupo del agente;</li>
 *   <li>cualquier fallo (descarga, límites, proveedor, audio vacío): respuesta de respaldo, nunca silencio.</li>
 * </ol>
 * No registra contenido, remitente ni URLs; solo contadores y el tipo de fallo.
 */
@Service
public class VozEntranteService {

    private static final Logger log = LoggerFactory.getLogger(VozEntranteService.class);
    private static final int MAX_TEXTO = 4000;

    static final String TEXTO_DESHABILITADO =
        "Por ahora no puedo escuchar notas de voz. ¿Me lo podría escribir? Con gusto le ayudo.";
    static final String TEXTO_FALLO =
        "No logré entender su nota de voz. ¿Me podría escribir su mensaje, por favor?";
    static final String TEXTO_LARGA =
        "Su nota de voz es muy larga para procesarla. ¿Me podría escribir lo principal, por favor?";

    private final ObjectProvider<TranscriptorVoz> transcriptor;
    private final DescargadorAudio descargador;
    private final CanalMensajeria canal;
    private final ConversacionService conversaciones;
    private final VozConfig config;
    private final ObjectProvider<CostoAgenteListener> costo;

    @Autowired
    public VozEntranteService(ObjectProvider<TranscriptorVoz> transcriptor, DescargadorAudio descargador,
                              CanalMensajeria canal, ConversacionService conversaciones, VozConfig config,
                              ObjectProvider<CostoAgenteListener> costo) {
        this.transcriptor = transcriptor;
        this.descargador = descargador;
        this.canal = canal;
        this.conversaciones = conversaciones;
        this.config = config;
        this.costo = costo;
    }

    /**
     * @return el mensaje con {@code texto} transcrito para seguir el flujo, o {@code null} si ya se respondió con
     *         el texto de respaldo y no hay nada más que hacer
     */
    public MensajeEntrante procesar(ConversacionActiva conv, MensajeEntrante mensaje) {
        TranscriptorVoz t = transcriptor.getIfAvailable();
        if (t == null || !t.habilitado()) {
            log.info("[agente-voz] sin proveedor de transcripción: se pide texto ({})", mensaje);
            responder(conv, TEXTO_DESHABILITADO);
            return null;
        }
        try {
            AudioVoz audio = descargador.descargar(conv.cuenta(), mensaje);
            ResultadoVoz r = t.transcribir(audio);
            return aplicar(conv, mensaje, r);
        } catch (AudioRechazadoException e) {
            log.warn("[agente-voz] audio rechazado ({}): {}", e.motivo(), mensaje);
            responder(conv, e.motivo() == AudioRechazadoException.Motivo.DEMASIADO_GRANDE ? TEXTO_LARGA : TEXTO_FALLO);
            return null;
        } catch (RuntimeException e) {
            // Sin mensaje de la excepción: podría traer URL, token o texto del cliente.
            log.warn("[agente-voz] falló la transcripción ({}): {}", e.getClass().getSimpleName(), mensaje);
            responder(conv, TEXTO_FALLO);
            return null;
        }
    }

    private MensajeEntrante aplicar(ConversacionActiva conv, MensajeEntrante m, ResultadoVoz r) {
        if (r == null) {
            responder(conv, TEXTO_FALLO);
            return null;
        }
        // El costo se cuenta aunque luego se descarte: el proveedor ya lo cobró.
        contarSegundos(conv, r.segundos());
        String texto = r.texto() == null ? "" : r.texto().strip();
        if (texto.isEmpty()) {
            responder(conv, TEXTO_FALLO);
            return null;
        }
        if (r.segundos() > config.maxSegundos()) {
            log.warn("[agente-voz] nota de voz sobre el límite de duración ({} s): {}", r.segundos(), m);
            responder(conv, TEXTO_LARGA);
            return null;
        }
        if (texto.length() > MAX_TEXTO) texto = texto.substring(0, MAX_TEXTO);
        conversaciones.marcarTranscripcionVoz(conv.sesionId(), conv.empresaId(), texto);
        log.info("[agente-voz] nota de voz transcrita, {} s ({})", r.segundos(), m);
        return new MensajeEntrante(m.canal(), m.cuentaId(), m.remitenteId(), m.nombre(), m.mensajeId(), m.tipo(),
            texto, m.mediaId(), m.epochSeg(), m.botonId());
    }

    /** Segundos transcritos × tarifa configurada → costo en USD del negocio (mismo tope de gasto que Claude). */
    private void contarSegundos(ConversacionActiva conv, int segundos) {
        double usd = Math.max(0, segundos) / 60.0 * config.costoUsdPorMinuto();
        if (usd <= 0) return;
        costo.orderedStream().forEach(l -> {
            try {
                l.costo(conv.empresaId(), usd);
            } catch (RuntimeException e) {
                log.warn("[agente-voz] no se pudo registrar el costo de voz: {}", e.getClass().getSimpleName());
            }
        });
    }

    private void responder(ConversacionActiva conv, String texto) {
        try {
            canal.enviarTexto(conv.cuenta(), conv.contacto(), texto);
            conversaciones.registrarSalienteBot(conv.sesionId(), conv.empresaId(), texto);
        } catch (RuntimeException e) {
            log.warn("[agente-voz] no se pudo enviar la respuesta de respaldo: {}", e.getClass().getSimpleName());
        }
    }
}
