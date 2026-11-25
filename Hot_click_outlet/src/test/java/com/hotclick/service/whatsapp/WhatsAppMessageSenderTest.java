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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WhatsAppMessageSender — ventana 24 h, plantilla, SIMULADO y fallback")
class WhatsAppMessageSenderTest {

    @Mock WhatsAppClaudeTextClient claudeTextClient;
    @Mock WhatsAppMetaApiClient metaApiClient;
    @Mock WaMensajeLogRepository logRepo;
    @Mock VentanaServicioWhatsApp ventana;

    @InjectMocks WhatsAppMessageSender sender;

    private static final Map<String, String> CTX = Map.of(
        "nombre", "Ana", "numeroPedido", "ORD-1", "total", "12.500");

    @Test
    @DisplayName("fuera de ventana usa la plantilla de Meta y anota su nombre en variante")
    void fueraDeVentanaUsaPlantilla() {
        when(ventana.dentroDeVentana("50600000004")).thenReturn(false);
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApiPlantilla(anyString(), any(), anyList())).thenReturn("wamid.t");

        sender.enviar(usuario(), 3L, "ORD-1", WaPlantilla.CONFIRMACION_CALIDO, CTX);

        verify(metaApiClient).llamarMetaApiPlantilla("50600000004", PlantillaMeta.PAGO_CONFIRMADO,
            List.of("Ana", "ORD-1", "12.500"));
        verify(metaApiClient, never()).llamarMetaApi(anyString(), anyString());
        ArgumentCaptor<WaMensajeLog> captor = ArgumentCaptor.forClass(WaMensajeLog.class);
        verify(logRepo).save(captor.capture());
        assertThat(captor.getValue().getEstado()).isEqualTo("ENVIADO");
        assertThat(captor.getValue().getVariante()).isEqualTo("hotclick_pago_confirmado_v1");
        assertThat(captor.getValue().getTextoEnviado()).contains("Ana").contains("ORD-1").doesNotContain("{{");
    }

    @Test
    @DisplayName("dentro de ventana manda texto libre fijo, sin IA")
    void dentroDeVentanaTextoLibre() {
        when(ventana.dentroDeVentana(anyString())).thenReturn(true);
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApi(anyString(), anyString())).thenReturn("wamid.abc");

        sender.enviar(usuario(), 3L, "ORD-1", WaPlantilla.CONFIRMACION_CALIDO, CTX);

        verify(metaApiClient).llamarMetaApi(org.mockito.ArgumentMatchers.eq("50600000004"),
            org.mockito.ArgumentMatchers.contains("ORD-1"));
        verify(metaApiClient, never()).llamarMetaApiPlantilla(anyString(), any(), anyList());
        verify(claudeTextClient, never()).generarTexto(any(), any(), anyLong());
    }

    @Test
    @DisplayName("sin bean de ventana (default) siempre usa plantilla")
    void sinVentanaSiemprePlantilla() {
        sender = new WhatsAppMessageSender();
        org.springframework.test.util.ReflectionTestUtils.setField(sender, "metaApiClient", metaApiClient);
        org.springframework.test.util.ReflectionTestUtils.setField(sender, "logRepo", logRepo);
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApiPlantilla(anyString(), any(), anyList())).thenReturn("wamid.g");

        sender.enviar(usuario(), 3L, "ORD-1", WaPlantilla.GUIA_BREVE,
            Map.of("nombre", "Ana", "numeroPedido", "ORD-1", "courier", "Correos CR", "guia", "G1"));

        verify(metaApiClient).llamarMetaApiPlantilla("50600000004", PlantillaMeta.GUIA_ASIGNADA,
            List.of("Ana", "ORD-1", "Correos CR", "G1"));
    }

    @Test
    @DisplayName("CRM dentro de ventana personaliza con Claude")
    void crmDentroDeVentanaUsaClaude() {
        when(ventana.dentroDeVentana(anyString())).thenReturn(true);
        when(claudeTextClient.generarTexto(any(), any(), anyLong())).thenReturn("Hola Ana, texto IA");
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApi(anyString(), anyString())).thenReturn("wamid.c");

        sender.enviar(usuario(), 3L, null, WaPlantilla.REACTIVACION_NOVEDAD, CTX, true);

        verify(metaApiClient).llamarMetaApi("50600000004", "Hola Ana, texto IA");
    }

    @Test
    @DisplayName("escenario sin plantilla (reactivación) fuera de ventana sale como texto libre")
    void escenarioSinPlantillaTextoLibre() {
        when(ventana.dentroDeVentana(anyString())).thenReturn(false);
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApi(anyString(), anyString())).thenReturn("wamid.r");

        sender.enviar(usuario(), 3L, null, WaPlantilla.REACTIVACION_NOVEDAD, CTX);

        verify(metaApiClient).llamarMetaApi(anyString(), anyString());
    }

    @Test
    @DisplayName("sin credenciales guarda SIMULADO y no llama a Meta")
    void simuladoNoLlamaMeta() {
        when(ventana.dentroDeVentana(anyString())).thenReturn(false);
        when(metaApiClient.credencialesConfiguradas()).thenReturn(false);

        sender.enviar(usuario(), 3L, "ORD-1", WaPlantilla.CONFIRMACION_CALIDO, CTX);

        ArgumentCaptor<WaMensajeLog> captor = ArgumentCaptor.forClass(WaMensajeLog.class);
        verify(logRepo).save(captor.capture());
        assertThat(captor.getValue().getEstado()).isEqualTo("SIMULADO");
        verify(metaApiClient, never()).llamarMetaApi(anyString(), anyString());
        verify(metaApiClient, never()).llamarMetaApiPlantilla(anyString(), any(), anyList());
    }

    @Test
    @DisplayName("traspaso a asesor por plantilla directa")
    void traspasoAsesor() {
        when(ventana.dentroDeVentana(anyString())).thenReturn(false);
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApiPlantilla(anyString(), any(), anyList())).thenReturn("wamid.x");

        sender.enviarPlantilla("0000-0004", 3L, 8L, null, PlantillaMeta.TRASPASO_ASESOR, Map.of("nombre", "Ana"));

        verify(metaApiClient).llamarMetaApiPlantilla("50600000004", PlantillaMeta.TRASPASO_ASESOR, List.of("Ana"));
    }

    @Test
    @DisplayName("si Meta falla el registro queda en ERROR sin propagar")
    void metaFallaQuedaError() {
        when(ventana.dentroDeVentana(anyString())).thenReturn(false);
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        when(metaApiClient.llamarMetaApiPlantilla(anyString(), any(), anyList()))
            .thenThrow(new IllegalStateException("plantilla no aprobada"));

        sender.enviar(usuario(), 3L, "ORD-1", WaPlantilla.CONFIRMACION_CALIDO, CTX);

        ArgumentCaptor<WaMensajeLog> captor = ArgumentCaptor.forClass(WaMensajeLog.class);
        verify(logRepo).save(captor.capture());
        assertThat(captor.getValue().getEstado()).isEqualTo("ERROR");
    }

    private static Usuario usuario() {
        Usuario u = new Usuario();
        u.setId(8L);
        u.setTelefono("0000-0004");
        return u;
    }
}
