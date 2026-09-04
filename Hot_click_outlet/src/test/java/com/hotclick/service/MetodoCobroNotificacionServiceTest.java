package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.service.email.NotificacionNegocioEmailSender;
import com.hotclick.service.whatsapp.WhatsAppMessageSender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MetodoCobroNotificacionService")
class MetodoCobroNotificacionServiceTest {

    @Mock TwilioSmsClient twilioSmsClient;
    @Mock WhatsAppMessageSender whatsAppMessageSender;
    @Mock NotificacionNegocioEmailSender negocioEmailSender;
    @InjectMocks MetodoCobroNotificacionService service;

    @Test
    @DisplayName("con Twilio en env manda SMS y no cae a WhatsApp/email")
    void sms_si_twilio_configurado() {
        when(twilioSmsClient.configurado()).thenReturn(true);
        when(twilioSmsClient.enviar(anyString(), anyString())).thenReturn(true);

        service.avisarCambioPendiente(empresa(), usuario(), "SINPE Móvil", "••••-1111");

        verify(twilioSmsClient).enviar(eq("50688887777"), anyString());
        verify(whatsAppMessageSender, never()).enviarTextoFijo(any(), any(), any(), any());
        verify(negocioEmailSender, never()).enviarCambioCobroPendiente(any(), any(), any(), any());
    }

    @Test
    @DisplayName("sin Twilio avisa por WhatsApp y email")
    void fallback_whatsapp_y_email() {
        when(twilioSmsClient.configurado()).thenReturn(false);

        service.avisarCambioPendiente(empresa(), usuario(), "SINPE Móvil", "••••-1111");

        verify(twilioSmsClient, never()).enviar(any(), any());
        verify(whatsAppMessageSender).enviarTextoFijo(eq("8888-7777"), eq(9L), eq(4L), anyString());
        verify(negocioEmailSender).enviarCambioCobroPendiente(
                eq("ana@taller.cr"), eq("Ana"), eq("SINPE Móvil"), eq("••••-1111"));
    }

    @Test
    @DisplayName("el aviso usa máscara, no el número completo")
    void texto_solo_mascara() {
        String texto = MetodoCobroNotificacionService.textoAviso("SINPE Móvil", "••••-1111");
        assertThat(texto).contains("••••-1111");
        assertThat(texto).doesNotContain("88881111");
    }

    private static Empresa empresa() {
        Empresa e = new Empresa();
        e.setId(9L);
        e.setTelefonoEmpresa("22223333");
        return e;
    }

    private static Usuario usuario() {
        Usuario u = new Usuario();
        u.setId(4L);
        u.setNombre("Ana");
        u.setCorreo("ana@taller.cr");
        u.setTelefono("8888-7777");
        return u;
    }
}
