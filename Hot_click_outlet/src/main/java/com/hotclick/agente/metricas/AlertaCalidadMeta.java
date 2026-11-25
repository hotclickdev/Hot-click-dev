package com.hotclick.agente.metricas;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.service.TelegramService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * AG-32: registra los avisos de Meta sobre la cuenta o la calidad del número que llegan al webhook
 * ({@code account_update}, {@code phone_number_quality_update}, {@code account_review_update},
 * {@code account_alerts}) y avisa al ADMIN por el canal de operaciones (Telegram), el mismo de las demás alertas.
 *
 * <p>El cuerpo ya viene con firma verificada. Aun así solo se guardan campo, evento y límite, limpios y
 * recortados; nunca teléfonos, nombres ni textos. El aviso a Telegram es un texto fijo (sin formato Markdown).
 */
@Component
public class AlertaCalidadMeta {

    private static final Logger log = LoggerFactory.getLogger(AlertaCalidadMeta.class);

    static final Set<String> CAMPOS = Set.of(
        "account_update", "phone_number_quality_update", "account_review_update", "account_alerts");
    static final int MAX_CAMPO = 40;

    private final AlertaMetaRepositorio repositorio;
    private final TelegramService telegram;

    public AlertaCalidadMeta(AlertaMetaRepositorio repositorio, TelegramService telegram) {
        this.repositorio = repositorio;
        this.telegram = telegram;
    }

    /** @return cuántos avisos de cuenta o calidad traía el evento (0 si era solo de mensajes). */
    public int registrar(JsonNode raiz) {
        List<AlertaMetaRepositorio.Aviso> avisos = extraer(raiz);
        if (avisos.isEmpty()) return 0;
        try {
            repositorio.insertar(avisos);
        } catch (RuntimeException e) {
            log.warn("[meta-calidad] no se pudo guardar el aviso: {}", e.getClass().getSimpleName());
        }
        try {
            telegram.enviar(textoAlerta(avisos));
        } catch (RuntimeException e) {
            log.warn("[meta-calidad] no se pudo avisar al ADMIN: {}", e.getClass().getSimpleName());
        }
        log.warn("[meta-calidad] Meta avisó un cambio en la cuenta o la calidad de un número ({} aviso(s))", avisos.size());
        return avisos.size();
    }

    static List<AlertaMetaRepositorio.Aviso> extraer(JsonNode raiz) {
        List<AlertaMetaRepositorio.Aviso> avisos = new ArrayList<>();
        if (raiz == null) return avisos;
        for (JsonNode entry : raiz.path("entry")) {
            for (JsonNode change : entry.path("changes")) {
                String campo = change.path("field").asText("");
                if (!CAMPOS.contains(campo)) continue;
                JsonNode valor = change.path("value");
                avisos.add(new AlertaMetaRepositorio.Aviso(campo, limpiar(valor.path("event").asText(null)),
                    limpiar(valor.path("current_limit").asText(null)), limpiar(entry.path("id").asText(null))));
            }
        }
        return avisos;
    }

    /** Solo letras, números, espacio, punto y guion bajo o medio; recortado. Null si queda vacío. */
    static String limpiar(String texto) {
        if (texto == null) return null;
        String x = texto.replaceAll("[^A-Za-z0-9 ._-]", "").trim();
        if (x.isEmpty()) return null;
        return x.length() <= MAX_CAMPO ? x : x.substring(0, MAX_CAMPO);
    }

    static String textoAlerta(List<AlertaMetaRepositorio.Aviso> avisos) {
        StringBuilder eventos = new StringBuilder();
        for (AlertaMetaRepositorio.Aviso a : avisos) {
            if (a.evento() == null) continue;
            if (eventos.length() > 0) eventos.append(", ");
            eventos.append(a.evento().toLowerCase(Locale.ROOT).replace('_', ' '));
        }
        return "Meta avisó un cambio en la cuenta o en la calidad de un número de WhatsApp conectado a los bots ("
            + avisos.size() + " aviso(s)" + (eventos.length() > 0 ? ": " + eventos : "")
            + "). Revisá Canales y las Métricas del bot en el panel.";
    }
}
