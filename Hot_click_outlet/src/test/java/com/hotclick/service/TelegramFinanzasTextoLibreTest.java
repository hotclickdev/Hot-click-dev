package com.hotclick.service;

import com.hotclick.service.telegram.TelegramDatosQueryService;
import com.hotclick.service.telegram.TelegramMenuBuilder;
import com.hotclick.service.telegram.TelegramVinculacionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** B2: con la IA caída, el texto libre sobre finanzas solo responde con datos si quien escribe es el dueño. */
@DisplayName("Telegram texto libre (IA caída): finanzas solo para el dueño")
class TelegramFinanzasTextoLibreTest {

    private static final long CHAT = 88L, EMPRESA = 3L;

    private final AiCopilotService ia = mock(AiCopilotService.class);
    private final TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
    private final TelegramDatosQueryService datos = mock(TelegramDatosQueryService.class);
    private final TelegramVinculacionService vinc = mock(TelegramVinculacionService.class);
    private final TelegramMenuBuilder menu = mock(TelegramMenuBuilder.class);
    private final TelegramBotUpdateService svc = new TelegramBotUpdateService();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(svc, "aiCopilotService", ia);
        ReflectionTestUtils.setField(svc, "bot", bot);
        ReflectionTestUtils.setField(svc, "datosQueryService", datos);
        ReflectionTestUtils.setField(svc, "vinculacionService", vinc);
        ReflectionTestUtils.setField(svc, "menuBuilder", menu);
        when(ia.chatSyncConAcciones(anyLong(), anyString(), any(), anyBoolean(), anyBoolean())).thenReturn(null); // IA caída
        when(datos.mensajeFinanzasMes(EMPRESA)).thenReturn("FINANZAS-REALES");
        when(vinc.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("no-dueño pregunta por ganancias: NO se llama mensajeFinanzasMes ni se envía el dato")
    void noDuenoNoRecibeFinanzas() {
        for (String texto : new String[]{"cuánta ganancia hice", "finanzas del mes", "dame la utilidad", "ticket promedio"}) {
            svc.responderConIa(CHAT, EMPRESA, texto, "Ana", false, false);
        }
        verify(datos, never()).mensajeFinanzasMes(any());
        verify(bot, never()).enviarMensaje(eq(CHAT), contains("FINANZAS-REALES"), any());
        verify(bot, org.mockito.Mockito.times(4)).enviarMensaje(CHAT, "Las finanzas del negocio solo las puede consultar el dueño.");
    }

    @Test
    @DisplayName("un ADMIN que gestiona (puedeGestionar=true) pero no es dueño tampoco recibe finanzas")
    void adminNoRecibeFinanzas() {
        svc.responderConIa(CHAT, EMPRESA, "cuánta ganancia hice", "Ana", true, false);
        verify(datos, never()).mensajeFinanzasMes(any());
    }

    @Test
    @DisplayName("el dueño sí recibe las finanzas en el fallback")
    void duenoRecibeFinanzas() {
        svc.responderConIa(CHAT, EMPRESA, "cuánta ganancia hice", "Ana", true, true);
        verify(bot).enviarMensaje(eq(CHAT), contains("FINANZAS-REALES"), any());
    }
}
