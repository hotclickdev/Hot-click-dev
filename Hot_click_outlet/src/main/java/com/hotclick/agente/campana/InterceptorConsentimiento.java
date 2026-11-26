package com.hotclick.agente.campana;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.conversacion.spi.InterceptorMensajeEntrante;
import com.hotclick.agente.cupo.AgenteBajaService;
import com.hotclick.agente.cupo.ConfirmacionBajaEnvio;
import com.hotclick.agente.cupo.InterceptorBajaAgente;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Responde al botón del opt-in de campañas y retira el consentimiento cuando el cliente escribe STOP. Corre justo
 * ANTES del interceptor de bajas: el STOP lo observa (revoca el consentimiento) pero NO lo consume, así el de bajas
 * sigue registrando la baja y confirmando. El toque del botón sí se consume: no llega al historial ni a Claude.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class InterceptorConsentimiento implements InterceptorMensajeEntrante {

    private static final Logger log = LoggerFactory.getLogger(InterceptorConsentimiento.class);

    private final ConsentimientoService consentimientos;
    private final AgenteBajaService bajas;
    private final ConfirmacionBajaEnvio envio;
    private final OfertaConsentimientoService oferta;

    public InterceptorConsentimiento(ConsentimientoService consentimientos, AgenteBajaService bajas,
                                     ConfirmacionBajaEnvio envio, OfertaConsentimientoService oferta) {
        this.consentimientos = consentimientos;
        this.bajas = bajas;
        this.envio = envio;
        this.oferta = oferta;
    }

    @Override
    public boolean interceptar(CanalCuenta cuenta, MensajeEntrante m) {
        if (cuenta == null || cuenta.getEmpresaId() == null || m.remitenteId() == null) return false;
        try {
            String boton = m.botonId();
            if (OfertaConsentimientoService.ID_SI.equals(boton)) return aceptar(cuenta, m);
            if (OfertaConsentimientoService.ID_NO.equals(boton)) return rechazar(cuenta, m);
            if (m.texto() != null && InterceptorBajaAgente.PALABRAS_BAJA.contains(InterceptorBajaAgente.normalizar(m.texto()))) {
                consentimientos.revocar(cuenta.getEmpresaId(), cuenta.getTipo().name(), m.remitenteId());
            }
        } catch (RuntimeException e) {
            // Sin mensaje: puede traer datos del cliente. Si falla, el mensaje sigue su camino.
            log.warn("[campana-consent] no se pudo procesar el mensaje: {}", e.getClass().getSimpleName());
        }
        return false;
    }

    private boolean aceptar(CanalCuenta cuenta, MensajeEntrante m) {
        Long empresaId = cuenta.getEmpresaId();
        String canal = cuenta.getTipo().name();
        String negocio = oferta.nombreNegocio(empresaId);
        Idioma idioma = oferta.idiomaDe(cuenta, m.remitenteId());
        if (bajas.estaDeBaja(empresaId, canal, m.remitenteId())) {
            // STOP gana: el opt-in no levanta la baja.
            envio.enviar(cuenta, m.remitenteId(), TextosFijos.ofertaDeBaja(idioma, negocio));
            return true;
        }
        consentimientos.registrarDesdeBoton(empresaId, canal, m.remitenteId(), m.nombre(), m.mensajeId());
        envio.enviar(cuenta, m.remitenteId(), TextosFijos.ofertaAceptada(idioma, negocio));
        log.info("[campana-consent] opt-in por botón ({})", m);
        return true;
    }

    private boolean rechazar(CanalCuenta cuenta, MensajeEntrante m) {
        consentimientos.revocar(cuenta.getEmpresaId(), cuenta.getTipo().name(), m.remitenteId());
        envio.enviar(cuenta, m.remitenteId(), TextosFijos.ofertaRechazada(oferta.idiomaDe(cuenta, m.remitenteId()),
            oferta.nombreNegocio(cuenta.getEmpresaId())));
        return true;
    }
}
