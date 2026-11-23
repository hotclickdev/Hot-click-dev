package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Los avisos de vinculación (bienvenida y reemplazo) salen DESPUÉS del commit de la transacción exterior
 * (como la del webhook, {@code procesarUpdate}) y fuera de cualquier transacción; con rollback no salen.
 */
@DisplayName("Telegram vincular: avisos solo tras el commit y sin transacción activa")
class TelegramVinculacionAfterCommitTest {

    private final TelegramVinculacionRepository vr = mock(TelegramVinculacionRepository.class);
    private final TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
    private final TelegramVinculacionPostLinkHelper postLink = mock(TelegramVinculacionPostLinkHelper.class);
    private final List<Boolean> txActivaAlEnviar = new ArrayList<>();
    private TelegramVinculacionService servicio;
    private TransactionTemplate exterior;

    @BeforeEach
    void setUp() {
        DataSourceTransactionManager tm = new DataSourceTransactionManager(
            new DriverManagerDataSource("jdbc:h2:mem:afterCommit593;DB_CLOSE_DELAY=-1", "sa", ""));
        exterior = new TransactionTemplate(tm);

        servicio = new TelegramVinculacionService();
        ReflectionTestUtils.setField(servicio, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(servicio, "bot", bot);
        ReflectionTestUtils.setField(servicio, "postLink", postLink);
        ReflectionTestUtils.setField(servicio, "transactionManager", tm);
        TelegramVinculacionCanje canje = new TelegramVinculacionCanje();
        ReflectionTestUtils.setField(canje, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(canje, "postLink", postLink);
        ReflectionTestUtils.setField(servicio, "canjeAtomico", canje);

        Usuario u = new Usuario();
        u.setId(5L);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setId(11L);
        v.setUsuario(u);
        v.setChatId(88L); // chat anterior: se le avisa
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setCodigo("ABCD2345");
        when(vr.findByCodigo("ABCD2345")).thenReturn(Optional.of(v));
        when(vr.canjearCodigo(eq(11L), eq("ABCD2345"), anyLong(), any(), any())).thenAnswer(i -> {
            v.setChatId(i.getArgument(2));
            v.setEstado(TelegramVinculacion.ACTIVA);
            v.setCodigo(null);
            return 1;
        });
        when(vr.findById(11L)).thenReturn(Optional.of(v));
        when(postLink.revocarVinculacionesPrevias(anyLong(), any())).thenReturn(List.of());
        doAnswer(i -> { txActivaAlEnviar.add(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()); return null; })
            .when(bot).enviarMensaje(anyLong(), anyString());
        doAnswer(i -> { txActivaAlEnviar.add(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()); return null; })
            .when(postLink).enviarBienvenidaYMenu(anyLong(), any(), any());
    }

    @Test
    @DisplayName("tx exterior que commitea: avisos salen tras el commit, sin transacción activa")
    void commitEnviaFueraDeTransaccion() {
        exterior.executeWithoutResult(st -> {
            servicio.vincular(555L, "alguien", "ABCD2345");
            // Dentro de la transacción todavía no salió nada (la fila seguiría bloqueada).
            verify(bot, never()).enviarMensaje(eq(88L), anyString());
            verify(postLink, never()).enviarBienvenidaYMenu(anyLong(), any(), any());
        });

        verify(bot).enviarMensaje(eq(88L), org.mockito.ArgumentMatchers.contains("otro Telegram"));
        verify(postLink).enviarBienvenidaYMenu(eq(555L), any(), any());
        assertThat(txActivaAlEnviar).hasSize(2).containsOnly(false);
    }

    @Test
    @DisplayName("tx exterior marcada rollbackOnly tras el canje: no hay bienvenida ni aviso de reemplazo")
    void rollbackOnlyNoAvisa() {
        exterior.executeWithoutResult(st -> {
            servicio.vincular(555L, "alguien", "ABCD2345");
            st.setRollbackOnly();
        });

        verify(bot, never()).enviarMensaje(eq(88L), anyString());
        verify(postLink, never()).enviarBienvenidaYMenu(anyLong(), any(), any());
        assertThat(txActivaAlEnviar).isEmpty();
    }

    @Test
    @DisplayName("excepción tras el canje exitoso: rollback, no hay avisos")
    void excepcionNoAvisa() {
        assertThatThrownBy(() -> exterior.executeWithoutResult(st -> {
            servicio.vincular(555L, "alguien", "ABCD2345");
            throw new IllegalStateException("falla posterior");
        })).isInstanceOf(IllegalStateException.class);

        verify(bot, never()).enviarMensaje(eq(88L), anyString());
        verify(postLink, never()).enviarBienvenidaYMenu(anyLong(), any(), any());
    }

    @Test
    @DisplayName("código inválido dentro de una tx: el mensaje de error sale de inmediato (no espera al commit)")
    void codigoInvalidoSaleYa() {
        when(vr.findByCodigo("ZZZZ9999")).thenReturn(Optional.empty());
        exterior.executeWithoutResult(st -> {
            servicio.vincular(555L, "alguien", "ZZZZ9999");
            verify(bot).enviarMensaje(eq(555L), org.mockito.ArgumentMatchers.contains("no existe o ya venció"));
        });
    }

    @Test
    @DisplayName("sin transacción: los avisos salen de inmediato")
    void sinTransaccionEnviaAhora() {
        servicio.vincular(555L, "alguien", "ABCD2345");
        verify(postLink).enviarBienvenidaYMenu(eq(555L), any(), any());
    }
}
