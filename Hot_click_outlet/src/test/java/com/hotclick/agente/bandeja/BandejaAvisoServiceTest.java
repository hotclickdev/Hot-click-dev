package com.hotclick.agente.bandeja;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BandejaAvisoServiceTest {

    private TelegramVinculacionRepository repo;
    private TelegramClienteBotService bot;
    private BandejaAvisoService aviso;

    @BeforeEach
    void init() {
        repo = mock(TelegramVinculacionRepository.class);
        bot = mock(TelegramClienteBotService.class);
        when(bot.isConfigured()).thenReturn(true);
        aviso = new BandejaAvisoService(repo, bot);
    }

    private TelegramVinculacion vinculo(String estado, Long chat) {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setEstado(estado);
        v.setChatId(chat);
        return v;
    }

    @Test
    void conVinculacionActivaEnviaAvisoSinDatosDeLaPersona() {
        when(repo.findByUsuarioId(5L)).thenReturn(Optional.of(vinculo(TelegramVinculacion.ACTIVA, 555L)));

        assertThat(aviso.avisarAsignacion(5L, "WHATSAPP")).isTrue();

        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(bot).enviarMensaje(eq(555L), texto.capture(), any(), eq(false));
        assertThat(texto.getValue()).contains("WhatsApp").contains("Bandeja");
    }

    @Test
    void sinVinculacionOVinculacionRevocadaNoEnvia() {
        when(repo.findByUsuarioId(5L)).thenReturn(Optional.empty());
        assertThat(aviso.avisarAsignacion(5L, "WHATSAPP")).isFalse();
        when(repo.findByUsuarioId(6L)).thenReturn(Optional.of(vinculo(TelegramVinculacion.REVOCADA, null)));
        assertThat(aviso.avisarAsignacion(6L, "WHATSAPP")).isFalse();
        verify(bot, never()).enviarMensaje(anyLong(), any(), any(), anyBoolean());
    }

    @Test
    void unFalloDeTelegramNoSePropaga() {
        when(repo.findByUsuarioId(5L)).thenReturn(Optional.of(vinculo(TelegramVinculacion.ACTIVA, 555L)));
        doThrow(new RuntimeException("caído")).when(bot).enviarMensaje(anyLong(), any(), any(), anyBoolean());
        assertThat(aviso.avisarAsignacion(5L, "INSTAGRAM")).isFalse();
    }

    @Test
    void textosPorCanal() {
        assertThat(BandejaAvisoService.textoAviso("INSTAGRAM")).contains("Instagram");
        assertThat(BandejaAvisoService.textoAviso("MESSENGER")).contains("Messenger");
        assertThat(BandejaAvisoService.textoAviso(null)).contains("un canal");
    }
}
