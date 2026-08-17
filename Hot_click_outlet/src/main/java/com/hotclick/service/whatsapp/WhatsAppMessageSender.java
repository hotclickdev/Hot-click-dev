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

    @Autowired private WhatsAppGeminiTextClient geminiTextClient;
    @Autowired private WhatsAppMetaApiClient    metaApiClient;
    @Autowired private WaMensajeLogRepository  logRepo;

    public String enviar(Usuario u, Long empresaId, String pedidoNum,
                  WaPlantilla plantilla, Map<String, String> ctx) {
        String texto = geminiTextClient.generarTexto(plantilla, ctx);
        String telefono = WhatsAppHelpers.normalizarTelefono(u.getTelefono());

        WaMensajeLog entry = new WaMensajeLog();
        entry.setUsuarioId(u.getId());
        entry.setEmpresaId(empresaId);
        entry.setTelefono(telefono);
        entry.setTipoMensaje(plantilla.escenario);
        entry.setVariante(plantilla.name());
        entry.setTextoEnviado(texto);
        entry.setPedidoNumero(pedidoNum);

        if (!metaApiClient.credencialesConfiguradas()) {
            entry.setEstado("SIMULADO");
            logRepo.save(entry);
            log.info("[WA-SIMULADO] {} → {}: {}", plantilla.escenario, telefono, texto);
            return texto;
        }

        try {
            String metaId = metaApiClient.llamarMetaApi(telefono, texto);
            entry.setEstado("ENVIADO");
            entry.setMetaMessageId(metaId);
            log.info("[WA-ENVIADO] {} → {} (msgId={})", plantilla.escenario, telefono, metaId);
        } catch (Exception e) {
            entry.setEstado("ERROR");
            entry.setErrorDetalle(e.getMessage() != null ? e.getMessage().substring(0, Math.min(500, e.getMessage().length())) : "unknown");
            log.error("[WA-ERROR] {} → {}: {}", plantilla.escenario, telefono, e.getMessage());
        }

        logRepo.save(entry);
        return texto;
    }

    /** Envía a un número raw (empresa, admin) sin necesidad de un Usuario registrado. */
    public String enviarANumero(String telefono, Long empresaId, String pedidoNum,
                         WaPlantilla plantilla, Map<String, String> ctx) {
        String texto   = geminiTextClient.generarTexto(plantilla, ctx);
        String telNorm = WhatsAppHelpers.normalizarTelefono(telefono);

        WaMensajeLog entry = new WaMensajeLog();
        entry.setEmpresaId(empresaId);
        entry.setTelefono(telNorm);
        entry.setTipoMensaje(plantilla.escenario);
        entry.setVariante(plantilla.name());
        entry.setTextoEnviado(texto);
        entry.setPedidoNumero(pedidoNum);

        if (!metaApiClient.credencialesConfiguradas()) {
            entry.setEstado("SIMULADO");
            logRepo.save(entry);
            log.info("[WA-SIMULADO] {} → {}: {}", plantilla.escenario, telNorm, texto);
            return texto;
        }

        try {
            String metaId = metaApiClient.llamarMetaApi(telNorm, texto);
            entry.setEstado("ENVIADO");
            entry.setMetaMessageId(metaId);
            log.info("[WA-ENVIADO] {} → {} (msgId={})", plantilla.escenario, telNorm, metaId);
        } catch (Exception e) {
            entry.setEstado("ERROR");
            entry.setErrorDetalle(e.getMessage() != null
                ? e.getMessage().substring(0, Math.min(500, e.getMessage().length())) : "unknown");
            log.error("[WA-ERROR] {} → {}: {}", plantilla.escenario, telNorm, e.getMessage());
        }

        logRepo.save(entry);
        return texto;
    }
}
