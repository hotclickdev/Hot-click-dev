package com.hotclick.service.whatsapp;

import com.hotclick.model.Usuario;
import com.hotclick.model.WaMensajeLog;
import com.hotclick.repository.WaMensajeLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WhatsAppMessageSender — SIMULADO vs PRODUCCION")
class WhatsAppMessageSenderTest {

    @Mock WhatsAppGeminiTextClient geminiTextClient;
    @Mock WhatsAppMetaApiClient metaApiClient;
    @Mock WaMensajeLogRepository logRepo;

    @InjectMocks WhatsAppMessageSender sender;

    @Test
    @DisplayName("sin credenciales guarda SIMULADO y no llama a Meta")
    void simuladoNoLlamaMeta() {
        when(geminiTextClient.generarTexto(any(), any())).thenReturn("Hola pedido");
        when(metaApiClient.credencialesConfiguradas()).thenReturn(false);

        sender.enviar(usuario(), 3L, "ORD-1", WaPlantilla.CONFIRMACION_CALIDO, Map.of());

        ArgumentCaptor<WaMensajeLog> captor = ArgumentCaptor.forClass(WaMensajeLog.class);
        verify(logRepo).save(captor.capture());
        assertThat(captor.getValue().getEstado()).isEqualTo("SIMULADO");
        verify(metaApiClient, never()).llamarMetaApi(anyString(), anyString());
    }

    @Test
    @DisplayName("con credenciales llama a Meta y marca ENVIADO")
    void produccionLlamaMeta() {
        when(geminiTextClient.generarTexto(any(), any())).thenReturn("Hola pedido");
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApi(anyString(), anyString())).thenReturn("wamid.abc");

        sender.enviar(usuario(), 3L, "ORD-1", WaPlantilla.CONFIRMACION_CALIDO, Map.of());

        verify(metaApiClient).llamarMetaApi("50688887777", "Hola pedido");
        ArgumentCaptor<WaMensajeLog> captor = ArgumentCaptor.forClass(WaMensajeLog.class);
        verify(logRepo).save(captor.capture());
        assertThat(captor.getValue().getEstado()).isEqualTo("ENVIADO");
        assertThat(captor.getValue().getMetaMessageId()).isEqualTo("wamid.abc");
    }

    private static Usuario usuario() {
        Usuario u = new Usuario();
        u.setId(8L);
        u.setTelefono("8888-7777");
        return u;
    }
}
