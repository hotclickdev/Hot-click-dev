package com.hotclick.service.whatsapp;

import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/**
 * Ventana de servicio real (AG-05): el contacto está dentro si alguna de sus conversaciones de WhatsApp tuvo un mensaje
 * del cliente en las últimas 24 h ({@code hot_click_chat_sesion_tb.ultimo_mensaje_cliente}). El teléfono se normaliza igual
 * que en {@link WhatsAppMessageSender} y se compara contra {@code contacto_externo} (wa_id, solo dígitos con país).
 * Una sola consulta de existencia por llamada. Nunca registra el teléfono.
 */
@Component
public class VentanaServicioWhatsAppReal implements VentanaServicioWhatsApp {

    static final String CANAL_WHATSAPP = "WHATSAPP";

    private final ConversacionSesionRepository sesiones;
    private final Clock reloj;

    @Autowired
    public VentanaServicioWhatsAppReal(ConversacionSesionRepository sesiones) {
        this(sesiones, Clock.systemUTC());
    }

    VentanaServicioWhatsAppReal(ConversacionSesionRepository sesiones, Clock reloj) {
        this.sesiones = sesiones;
        this.reloj = reloj;
    }

    @Override
    public boolean dentroDeVentana(String telefono) {
        String normalizado = WhatsAppHelpers.normalizarTelefono(telefono);
        if (normalizado.isBlank()) return false;
        Instant desde = reloj.instant().minus(ConversacionActiva.VENTANA);
        return sesiones.existsByCanalAndContactoExternoAndUltimoMensajeClienteAfter(CANAL_WHATSAPP, normalizado, desde);
    }
}
