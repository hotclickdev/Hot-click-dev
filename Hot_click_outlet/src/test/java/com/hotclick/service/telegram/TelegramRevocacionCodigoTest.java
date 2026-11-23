package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Revocación unificada: toda revocación borra chat, contexto, código y vencimiento, y un código
 * (aunque no haya vencido) nunca reactiva un vínculo REVOCADA.
 */
@DisplayName("Telegram: revocación unificada y códigos sobre vínculos REVOCADA")
class TelegramRevocacionCodigoTest {

    private final TelegramVinculacionRepository vr = mock(TelegramVinculacionRepository.class);
    private final TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
    private final TelegramVinculacionPostLinkHelper postLink = mock(TelegramVinculacionPostLinkHelper.class);
    private TelegramVinculacionService servicio;

    @BeforeEach
    void setUp() {
        servicio = new TelegramVinculacionService();
        ReflectionTestUtils.setField(servicio, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(servicio, "bot", bot);
        ReflectionTestUtils.setField(servicio, "postLink", postLink);
    }

    private static TelegramVinculacion vinculo(String estado, Long chatId) {
        Usuario u = new Usuario();
        u.setId(5L);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setEstado(estado);
        v.setChatId(chatId);
        v.setContexto("{\"x\":1}");
        v.setCodigo("ABCD2345");
        v.setCodigoExpira(LocalDateTime.now().plusMinutes(5)); // vigente
        return v;
    }

    private static void assertRevocadoLimpio(TelegramVinculacion v) {
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.REVOCADA);
        assertThat(v.getChatId()).isNull();
        assertThat(v.getContexto()).isNull();
        assertThat(v.getCodigo()).isNull();
        assertThat(v.getCodigoExpira()).isNull();
    }

    @Test
    @DisplayName("revocar() deja REVOCADA sin chat, contexto, código ni vencimiento")
    void revocarLimpiaTodo() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.ACTIVA, 88L);
        v.revocar();
        assertRevocadoLimpio(v);
    }

    @Test
    @DisplayName("/desvincular borra codigo y codigoExpira")
    void desvincularBorraCodigo() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.ACTIVA, 88L);
        servicio.desvincular(v);
        assertRevocadoLimpio(v);
        verify(vr).save(v);
        verify(bot).enviarMensaje(eq(88L), anyString());
    }

    @Test
    @DisplayName("revocarVinculacionesPrevias borra codigo y codigoExpira del chat reemplazado")
    void revocarPreviasBorraCodigo() {
        TelegramVinculacion otra = vinculo(TelegramVinculacion.ACTIVA, 99L);
        when(vr.findByChatIdAndEstadoAndUsuarioIdNot(99L, TelegramVinculacion.ACTIVA, 7L)).thenReturn(List.of(otra));
        TelegramVinculacionPostLinkHelper real = new TelegramVinculacionPostLinkHelper();
        ReflectionTestUtils.setField(real, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(real, "bot", bot);

        real.revocarVinculacionesPrevias(99L, 7L);

        assertRevocadoLimpio(otra);
        verify(vr).save(otra);
        verify(bot).enviarMensaje(eq(99L), anyString());
    }

    @Test
    @DisplayName("vincular: un código aún vigente sobre un vínculo REVOCADA se rechaza")
    void codigoVigenteSobreRevocadaSeRechaza() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.REVOCADA, null);
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));

        servicio.vincular(555L, "alguien", "ABCD2345");

        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.REVOCADA);
        assertThat(v.getChatId()).isNull();
        verify(vr, never()).save(any());
        verify(postLink, never()).revocarVinculacionesPrevias(anyLong(), any());
        verify(bot).enviarMensaje(eq(555L), org.mockito.ArgumentMatchers.contains("no existe o ya venció"));
    }

    @Test
    @DisplayName("vincular: código vigente sobre PENDIENTE vincula y anula el código")
    void codigoVigenteSobrePendienteVincula() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.PENDIENTE, null);
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));

        servicio.vincular(555L, "alguien", "abcd-2345");

        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(555L);
        assertThat(v.getCodigo()).isNull();
        assertThat(v.getCodigoExpira()).isNull();
        verify(vr).save(v);
    }

    @Test
    @DisplayName("vincular: re-vincular una ACTIVA con un código nuevo del panel sigue funcionando")
    void codigoVigenteSobreActivaRevincula() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.ACTIVA, 88L);
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));

        servicio.vincular(555L, "alguien", "ABCD2345");

        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(555L);
        assertThat(v.getCodigo()).isNull();
        verify(bot).enviarMensaje(eq(88L), anyString()); // aviso al chat anterior
    }
}
