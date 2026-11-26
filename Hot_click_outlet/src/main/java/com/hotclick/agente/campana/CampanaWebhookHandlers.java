package com.hotclick.agente.campana;

import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.agente.webhook.EstadoEntrante;
import com.hotclick.agente.webhook.EstadoEntranteHandler;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntranteHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Métricas de campañas desde el webhook: acuses de entrega y lectura ({@code statuses}), cambios de estado de las
 * plantillas y respuestas del cliente. Todo idempotente (Meta repite los acuses) y monótono (un acuse atrasado no
 * baja un envío de LEIDO a ENTREGADO). Un mensaje que no es de ninguna campaña se ignora.
 */
@Component
public class CampanaWebhookHandlers implements EstadoEntranteHandler, MensajeEntranteHandler {

    private static final Logger log = LoggerFactory.getLogger(CampanaWebhookHandlers.class);
    /** Una respuesta cuenta para la campaña si llega dentro de los 7 días posteriores al envío. */
    static final Duration VENTANA_RESPUESTA = Duration.ofDays(7);

    private final CampanaRepositorio repo;
    private final PlantillaCampanaService plantillas;
    private final CanalCuentaService cuentas;
    private final HasherInterno hasher;
    private final CampanaConfig config;

    public CampanaWebhookHandlers(CampanaRepositorio repo, PlantillaCampanaService plantillas, CanalCuentaService cuentas,
                                  HasherInterno hasher, CampanaConfig config) {
        this.repo = repo;
        this.plantillas = plantillas;
        this.cuentas = cuentas;
        this.hasher = hasher;
        this.config = config;
    }

    @Override
    public void estado(EstadoEntrante.EstadoMensaje e) {
        Instant cuando = e.epochSeg() > 0 ? Instant.ofEpochSecond(e.epochSeg()) : config.ahora();
        int n = repo.aplicarAcuse(e.mensajeId(), e.estado(), cuando, e.codigoError());
        if (n > 0) log.info("[campana-metricas] acuse aplicado ({})", e);
    }

    @Override
    public void plantilla(EstadoEntrante.EstadoPlantilla p) {
        plantillas.aplicarEstadoWebhook(p);
    }

    /** El cliente escribió: si recibió una campaña de ESE negocio hace poco, cuenta como respuesta. */
    @Override
    public void manejar(MensajeEntrante m) {
        if (m.canal() != MensajeEntrante.Canal.WHATSAPP || m.remitenteId() == null) return;
        cuentas.buscar(m.canal(), m.cuentaId()).ifPresent(cuenta -> {
            if (cuenta.getEmpresaId() == null) return;
            String hash = hasher.contacto(cuenta.getEmpresaId(), cuenta.getTipo().name(), m.remitenteId());
            Instant ahora = config.ahora();
            repo.marcarRespuesta(cuenta.getEmpresaId(), hash, ahora.minus(VENTANA_RESPUESTA), ahora);
        });
    }
}
