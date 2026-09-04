package com.hotclick.service.whatsapp;

import com.hotclick.model.Usuario;
import com.hotclick.model.WaMensajeLog;
import com.hotclick.repository.WaMensajeLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class WhatsAppMessageSender {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppMessageSender.class);
    private static final int MAX_ERROR = 500;

    @Autowired private WhatsAppGeminiTextClient geminiTextClient;
    @Autowired private WhatsAppMetaApiClient    metaApiClient;
    @Autowired private WaMensajeLogRepository  logRepo;

    public String enviar(Usuario u, Long empresaId, String pedidoNum,
                  WaPlantilla plantilla, Map<String, String> ctx) {
        String texto = geminiTextClient.generarTexto(plantilla, ctx);
        String telefono = WhatsAppHelpers.normalizarTelefono(u.getTelefono());
        WaMensajeLog entry = nuevoLog(u.getId(), empresaId, telefono, plantilla.escenario,
                plantilla.name(), texto, pedidoNum);
        return despachar(entry, plantilla.escenario, telefono, texto);
    }

    /** Envía a un número raw (empresa, admin) sin necesidad de un Usuario registrado. */
    public String enviarANumero(String telefono, Long empresaId, String pedidoNum,
                         WaPlantilla plantilla, Map<String, String> ctx) {
        String texto   = geminiTextClient.generarTexto(plantilla, ctx);
        String telNorm = WhatsAppHelpers.normalizarTelefono(telefono);
        WaMensajeLog entry = nuevoLog(null, empresaId, telNorm, plantilla.escenario,
                plantilla.name(), texto, pedidoNum);
        return despachar(entry, plantilla.escenario, telNorm, texto);
    }

    /** Texto fijo (sin Gemini): avisos de seguridad como cambio de cuenta de cobro. */
    public String enviarTextoFijo(String telefono, Long empresaId, Long usuarioId, String texto) {
        String telNorm = WhatsAppHelpers.normalizarTelefono(telefono);
        if (telNorm.isBlank() || texto == null || texto.isBlank()) {
            return texto;
        }
        WaMensajeLog entry = nuevoLog(usuarioId, empresaId, telNorm, "CAMBIO_COBRO", "FIJO", texto, null);
        return despachar(entry, "CAMBIO_COBRO", telNorm, texto);
    }

    private WaMensajeLog nuevoLog(Long usuarioId, Long empresaId, String telefono,
                                  String escenario, String variante, String texto, String pedidoNum) {
        WaMensajeLog entry = new WaMensajeLog();
        entry.setUsuarioId(usuarioId);
        entry.setEmpresaId(empresaId);
        entry.setTelefono(telefono);
        entry.setTipoMensaje(escenario);
        entry.setVariante(variante);
        entry.setTextoEnviado(texto);
        entry.setPedidoNumero(pedidoNum);
        return entry;
    }

    private String despachar(WaMensajeLog entry, String escenario, String telefono, String texto) {
        if (!metaApiClient.credencialesConfiguradas()) {
            entry.setEstado("SIMULADO");
            logRepo.save(entry);
            log.warn("[WA-SIMULADO] {} → {}: {}", escenario, telefono, texto);
            return texto;
        }
        enviarAMeta(entry, escenario, telefono, texto);
        logRepo.save(entry);
        return texto;
    }

    private void enviarAMeta(WaMensajeLog entry, String escenario, String telefono, String texto) {
        try {
            String metaId = metaApiClient.llamarMetaApi(telefono, texto);
            entry.setEstado("ENVIADO");
            entry.setMetaMessageId(metaId);
            log.info("[WA-ENVIADO] {} → {} (msgId={})", escenario, telefono, metaId);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "unknown";
            entry.setEstado("ERROR");
            entry.setErrorDetalle(msg.substring(0, Math.min(MAX_ERROR, msg.length())));
            log.error("[WA-ERROR] {} → {}: {}", escenario, telefono, e.getMessage());
        }
    }
}
