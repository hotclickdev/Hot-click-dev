package com.hotclick.agente.onboarding;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.pago.AvisoUnicoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Envía UN paso de onboarding: reclama la guarda de un solo aviso, manda el mensaje con botón al panel y lo guarda en
 * la conversación. Si el envío falla devuelve el reclamo para que el siguiente barrido lo reintente. Nunca registra
 * contacto ni texto.
 */
@Component
public class OnboardingEnvio {

    private static final Logger log = LoggerFactory.getLogger(OnboardingEnvio.class);

    private final CanalMensajeria canal;
    private final ConversacionService conversaciones;
    private final AvisoUnicoRepository avisos;
    private final String appUrl;

    public OnboardingEnvio(CanalMensajeria canal, ConversacionService conversaciones, AvisoUnicoRepository avisos,
                           @Value("${app.url:https://hotclick.lat}") String appUrl) {
        this.canal = canal;
        this.conversaciones = conversaciones;
        this.avisos = avisos;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
    }

    /** @return true si el paso salió. */
    public boolean enviar(long leadId, OnboardingPaso paso, ConversacionSesion sesion, CanalCuenta cuenta) {
        if (!avisos.reclamar(paso.tipoAviso(), leadId)) return false;
        try {
            canal.enviarBotonUrl(cuenta, sesion.getContactoExterno(), paso.texto(), paso.tituloBoton(), appUrl + paso.ruta());
        } catch (RuntimeException ex) {
            avisos.liberar(paso.tipoAviso(), leadId);
            log.warn("[agente-onboarding] no se pudo enviar {}: {}", paso, ex.getClass().getSimpleName());
            return false;
        }
        try {
            conversaciones.registrarSalienteBot(sesion.getId(), sesion.getEmpresaId(), paso.texto());
        } catch (RuntimeException ex) {
            log.warn("[agente-onboarding] paso enviado pero no quedó en el historial: {}", ex.getClass().getSimpleName());
        }
        log.info("[agente-onboarding] paso {} enviado, lead={}", paso, leadId);
        return true;
    }
}
