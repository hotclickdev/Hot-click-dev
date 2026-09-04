package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.service.email.NotificacionNegocioEmailSender;
import com.hotclick.service.whatsapp.WhatsAppHelpers;
import com.hotclick.service.whatsapp.WhatsAppMessageSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Aviso al vendedor cuando pide cambiar una cuenta de cobro ya guardada.
 * SMS si Twilio está en env; si no, WhatsApp y/o email. Nunca el número completo.
 */
@Service
public class MetodoCobroNotificacionService {

    private static final Logger log = LoggerFactory.getLogger(MetodoCobroNotificacionService.class);

    private final TwilioSmsClient twilioSmsClient;
    private final WhatsAppMessageSender whatsAppMessageSender;
    private final NotificacionNegocioEmailSender negocioEmailSender;

    public MetodoCobroNotificacionService(
            TwilioSmsClient twilioSmsClient,
            WhatsAppMessageSender whatsAppMessageSender,
            NotificacionNegocioEmailSender negocioEmailSender) {
        this.twilioSmsClient = twilioSmsClient;
        this.whatsAppMessageSender = whatsAppMessageSender;
        this.negocioEmailSender = negocioEmailSender;
    }

    public void avisarCambioPendiente(Empresa empresa, Usuario pide, String tipoCuenta, String mascaraNueva) {
        String texto = textoAviso(tipoCuenta, mascaraNueva);
        String telefono = telefonoDestino(empresa, pide);
        boolean smsOk = enviarSmsSiPuede(telefono, texto);
        if (!smsOk) {
            enviarWhatsApp(empresa, pide, telefono, texto);
            enviarEmail(pide, tipoCuenta, mascaraNueva);
        }
    }

    boolean enviarSmsSiPuede(String telefono, String texto) {
        if (!twilioSmsClient.configurado()) {
            return false;
        }
        String e164 = WhatsAppHelpers.normalizarTelefono(telefono);
        if (e164.isBlank()) {
            return false;
        }
        return twilioSmsClient.enviar(e164, texto);
    }

    private void enviarWhatsApp(Empresa empresa, Usuario pide, String telefono, String texto) {
        if (telefono == null || telefono.isBlank()) {
            return;
        }
        Long empresaId = empresa != null ? empresa.getId() : null;
        Long usuarioId = pide != null ? pide.getId() : null;
        whatsAppMessageSender.enviarTextoFijo(telefono, empresaId, usuarioId, texto);
    }

    private void enviarEmail(Usuario pide, String tipoCuenta, String mascaraNueva) {
        if (pide == null || pide.getCorreo() == null || pide.getCorreo().isBlank()) {
            return;
        }
        try {
            negocioEmailSender.enviarCambioCobroPendiente(
                    pide.getCorreo(), pide.getNombre(), tipoCuenta, mascaraNueva);
        } catch (Exception e) {
            log.error("[cobro-notif] email de cambio de cobro falló: {}", e.getMessage());
        }
    }

    static String textoAviso(String tipoCuenta, String mascaraNueva) {
        return "HotClick: pediste cambiar tu " + tipoCuenta + " a " + mascaraNueva
                + ". La cuenta vigente no cambia hasta que un admin lo apruebe.";
    }

    static String telefonoDestino(Empresa empresa, Usuario pide) {
        if (pide != null && pide.getTelefono() != null && !pide.getTelefono().isBlank()) {
            return pide.getTelefono();
        }
        if (empresa != null) {
            return empresa.getTelefonoEmpresa();
        }
        return null;
    }
}
