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
        TelegramVinculacionCanje canje = new TelegramVinculacionCanje();
        ReflectionTestUtils.setField(canje, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(canje, "postLink", postLink);
        ReflectionTestUtils.setField(servicio, "canjeAtomico", canje);
    }

    private static TelegramVinculacion vinculo(String estado, Long chatId) {
        Usuario u = new Usuario();
        u.setId(5L);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setId(11L);
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
        verify(vr).revocarPorId(11L); // UPDATE atómico: no pisa un canje concurrente ni depende de la versión leída
        verify(vr, never()).save(any());
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

        List<Long> aAvisar = real.revocarVinculacionesPrevias(99L, 7L);

        assertRevocadoLimpio(otra);
        verify(vr).revocarPorId(11L);
        assertThat(aAvisar).containsExactly(99L);
        verify(bot, never()).enviarMensaje(anyLong(), anyString()); // el aviso sale después del commit, no aquí
    }

    /** Simula el UPDATE condicional de la base: gana (1 fila) y deja la fila ACTIVA sin código. */
    private void claimGana(TelegramVinculacion v) {
        when(vr.canjearCodigo(eq(11L), eq("ABCD2345"), anyLong(), any(), any())).thenAnswer(i -> {
            v.setChatId(i.getArgument(2));
            v.setTelegramUsername(i.getArgument(3));
            v.setEstado(TelegramVinculacion.ACTIVA);
            v.setCodigo(null);
            v.setCodigoExpira(null);
            return 1;
        });
        when(vr.findById(11L)).thenReturn(Optional.of(v));
        when(postLink.revocarVinculacionesPrevias(anyLong(), any())).thenReturn(List.of());
    }

    @Test
    @DisplayName("vincular: código sobre un vínculo REVOCADA (la base responde 0 filas) se rechaza: ni ACTIVA, ni avisos, ni bienvenida")
    void codigoVigenteSobreRevocadaSeRechaza() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.REVOCADA, null);
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));
        when(vr.canjearCodigo(anyLong(), anyString(), anyLong(), any(), any())).thenReturn(0);

        servicio.vincular(555L, "alguien", "ABCD2345");

        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.REVOCADA);
        assertThat(v.getChatId()).isNull();
        verify(vr, never()).save(any());
        verify(postLink, never()).revocarVinculacionesPrevias(anyLong(), any());
        verify(postLink, never()).enviarBienvenidaYMenu(anyLong(), any(), any());
        verify(bot).enviarMensaje(eq(555L), org.mockito.ArgumentMatchers.contains("no existe o ya venció"));
    }

    @Test
    @DisplayName("vincular: código vencido / ya canjeado (claim = 0 filas) → mensaje de inválido y NO se avisa al chat anterior")
    void claimSinFilasNoQuedaActivaNiAvisa() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.ACTIVA, 88L);
        v.setCodigoExpira(LocalDateTime.now().minusMinutes(1));
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));
        when(vr.canjearCodigo(anyLong(), anyString(), anyLong(), any(), any())).thenReturn(0);

        servicio.vincular(555L, "alguien", "ABCD2345");

        verify(vr, never()).findById(any());
        verify(vr, never()).save(any());
        verify(bot, never()).enviarMensaje(eq(88L), anyString()); // avisarChatReemplazado NO se llama
        verify(postLink, never()).enviarBienvenidaYMenu(anyLong(), any(), any());
        verify(bot).enviarMensaje(eq(555L), org.mockito.ArgumentMatchers.contains("no existe o ya venció"));
    }

    @Test
    @DisplayName("vincular: si el canje lanza (rollback), se trata como código inválido: sin avisos ni bienvenida")
    void canjeQueFallaNoAvisaNiBienvenida() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.ACTIVA, 88L);
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));
        when(vr.canjearCodigo(anyLong(), anyString(), anyLong(), any(), any()))
            .thenThrow(new org.springframework.dao.CannotAcquireLockException("lock"));

        servicio.vincular(555L, "alguien", "ABCD2345");

        verify(bot, never()).enviarMensaje(eq(88L), anyString());
        verify(postLink, never()).enviarBienvenidaYMenu(anyLong(), any(), any());
        verify(bot).enviarMensaje(eq(555L), org.mockito.ArgumentMatchers.contains("no existe o ya venció"));
    }

    @Test
    @DisplayName("vincular: código vigente sobre PENDIENTE vincula y anula el código")
    void codigoVigenteSobrePendienteVincula() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.PENDIENTE, null);
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));
        claimGana(v);

        servicio.vincular(555L, "alguien", "abcd-2345");

        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(555L);
        assertThat(v.getCodigo()).isNull();
        assertThat(v.getCodigoExpira()).isNull();
        verify(vr).save(v);
        verify(postLink).enviarBienvenidaYMenu(eq(555L), eq(v), any());
    }

    @Test
    @DisplayName("vincular: re-vincular una ACTIVA avisa al chat anterior DESPUÉS del canje (fuera de la transacción)")
    void codigoVigenteSobreActivaRevincula() {
        TelegramVinculacion v = vinculo(TelegramVinculacion.ACTIVA, 88L);
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));
        claimGana(v);

        servicio.vincular(555L, "alguien", "ABCD2345");

        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(555L);
        assertThat(v.getCodigo()).isNull();
        org.mockito.InOrder orden = org.mockito.Mockito.inOrder(vr, bot, postLink);
        orden.verify(vr).canjearCodigo(eq(11L), eq("ABCD2345"), eq(555L), eq("alguien"), any());
        orden.verify(vr).save(v);
        orden.verify(bot).enviarMensaje(eq(88L), anyString()); // aviso al chat anterior, tras el canje
        orden.verify(postLink).enviarBienvenidaYMenu(eq(555L), eq(v), any());
    }
}
