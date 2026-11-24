package com.hotclick.service.whatsapp;

import com.hotclick.model.Usuario;
import com.hotclick.model.WaMensajeLog;
import com.hotclick.repository.WaMensajeLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Regla de envío: si el contacto escribió en las últimas 24 h ({@link VentanaServicioWhatsApp}) se
 * manda texto libre; si no, la plantilla de Meta del escenario ({@link PlantillaMeta}). Escenarios
 * sin plantilla de utilidad (reactivación, avisos a emprendedor/admin, cambio de cobro) se mandan
 * como texto libre y Meta puede rechazarlos fuera de ventana (queda en ERROR en el registro).
 * Sin credenciales: modo SIMULADO. La plantilla usada queda en la columna {@code variante}.
 */
@Component
public class WhatsAppMessageSender {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppMessageSender.class);
    private static final int MAX_ERROR = 500;

    @Autowired private WhatsAppClaudeTextClient claudeTextClient;
    @Autowired private WhatsAppMetaApiClient    metaApiClient;
    @Autowired private WaMensajeLogRepository  logRepo;
    /** Sin bean (hasta AG-05) se asume ventana cerrada: siempre plantilla. */
    @Autowired(required = false) private VentanaServicioWhatsApp ventana;

    public String enviar(Usuario u, Long empresaId, String pedidoNum,
                  WaPlantilla plantilla, Map<String, String> ctx) {
        return enviar(u, empresaId, pedidoNum, plantilla, ctx, false);
    }

    /**
     * @param personalizarConIa solo mensajes del CRM: dentro de ventana, Claude reescribe el texto
     */
    public String enviar(Usuario u, Long empresaId, String pedidoNum,
                  WaPlantilla plantilla, Map<String, String> ctx, boolean personalizarConIa) {
        String telefono = WhatsAppHelpers.normalizarTelefono(u.getTelefono());
        return emitir(u.getId(), empresaId, telefono, pedidoNum, plantilla.escenario, plantilla.name(),
            PlantillaMeta.paraEscenario(plantilla.escenario), ctx,
            () -> personalizarConIa
                ? claudeTextClient.generarTexto(plantilla, ctx, empresaId)
                : WhatsAppHelpers.fallback(plantilla, ctx));
    }

    /** Envía a un número raw (empresa, admin) sin necesidad de un Usuario registrado. */
    public String enviarANumero(String telefono, Long empresaId, String pedidoNum,
                         WaPlantilla plantilla, Map<String, String> ctx) {
        String telNorm = WhatsAppHelpers.normalizarTelefono(telefono);
        return emitir(null, empresaId, telNorm, pedidoNum, plantilla.escenario, plantilla.name(),
            PlantillaMeta.paraEscenario(plantilla.escenario), ctx,
            () -> WhatsAppHelpers.fallback(plantilla, ctx));
    }

    /** Aviso por plantilla de Meta sin pasar por WaPlantilla (traspaso a asesor, recordatorio AG-12). */
    public String enviarPlantilla(String telefono, Long empresaId, Long usuarioId, String pedidoNum,
                                  PlantillaMeta plantilla, Map<String, String> ctx) {
        String telNorm = WhatsAppHelpers.normalizarTelefono(telefono);
        return emitir(usuarioId, empresaId, telNorm, pedidoNum, plantilla.escenario, plantilla.nombreTecnico,
            Optional.of(plantilla), ctx,
            () -> plantilla.renderizar(plantilla.parametros(ctx)));
    }

    /** Texto fijo: avisos de seguridad como cambio de cuenta de cobro. */
    public String enviarTextoFijo(String telefono, Long empresaId, Long usuarioId, String texto) {
        String telNorm = WhatsAppHelpers.normalizarTelefono(telefono);
        if (telNorm.isBlank() || texto == null || texto.isBlank()) {
            return texto;
        }
        WaMensajeLog entry = nuevoLog(usuarioId, empresaId, telNorm, "CAMBIO_COBRO", "FIJO", texto, null);
        return despachar(entry, "CAMBIO_COBRO", telNorm, texto, null, null);
    }

    private String emitir(Long usuarioId, Long empresaId, String telefono, String pedidoNum,
                          String escenario, String variante, Optional<PlantillaMeta> plantillaMeta,
                          Map<String, String> ctx, Supplier<String> textoLibre) {
        if (telefono.isBlank()) return null;
        boolean dentro = ventanaAbierta(telefono);
        if (plantillaMeta.isPresent() && !dentro) {
            PlantillaMeta pm = plantillaMeta.get();
            List<String> params = pm.parametros(ctx);
            String texto = pm.renderizar(params);
            WaMensajeLog entry = nuevoLog(usuarioId, empresaId, telefono, escenario,
                pm.nombreTecnico, texto, pedidoNum);
            return despachar(entry, escenario, telefono, texto, pm, params);
        }
        String texto = textoLibre.get();
        WaMensajeLog entry = nuevoLog(usuarioId, empresaId, telefono, escenario, variante, texto, pedidoNum);
        return despachar(entry, escenario, telefono, texto, null, null);
    }

    private boolean ventanaAbierta(String telefono) {
        VentanaServicioWhatsApp v = ventana != null ? ventana : VentanaServicioWhatsApp.SIEMPRE_PLANTILLA;
        try {
            return v.dentroDeVentana(telefono);
        } catch (RuntimeException e) {
            log.warn("[WA] no se pudo consultar la ventana de 24 h, se usa plantilla: {}", e.getClass().getSimpleName());
            return false;
        }
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

    private String despachar(WaMensajeLog entry, String escenario, String telefono, String texto,
                             PlantillaMeta plantilla, List<String> params) {
        if (!metaApiClient.credencialesConfiguradas()) {
            entry.setEstado("SIMULADO");
            logRepo.save(entry);
            log.warn("[WA-SIMULADO] {} usuarioId={} empresaId={}", escenario, entry.getUsuarioId(), entry.getEmpresaId());
            return texto;
        }
        enviarAMeta(entry, escenario, telefono, texto, plantilla, params);
        logRepo.save(entry);
        return texto;
    }

    private void enviarAMeta(WaMensajeLog entry, String escenario, String telefono, String texto,
                             PlantillaMeta plantilla, List<String> params) {
        try {
            String metaId = plantilla != null
                ? metaApiClient.llamarMetaApiPlantilla(telefono, plantilla, params)
                : metaApiClient.llamarMetaApi(telefono, texto);
            entry.setEstado("ENVIADO");
            entry.setMetaMessageId(metaId);
            log.info("[WA-ENVIADO] {} usuarioId={} empresaId={} (msgId={})", escenario, entry.getUsuarioId(), entry.getEmpresaId(), metaId);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "unknown";
            entry.setEstado("ERROR");
            entry.setErrorDetalle(msg.substring(0, Math.min(MAX_ERROR, msg.length())));
            log.error("[WA-ERROR] {} usuarioId={} empresaId={}: {}", escenario, entry.getUsuarioId(), entry.getEmpresaId(), e.getClass().getSimpleName());
        }
    }
}
