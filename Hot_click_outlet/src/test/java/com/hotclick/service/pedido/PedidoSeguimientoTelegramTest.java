package com.hotclick.service.pedido;

import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PedidoSeguimientoTelegramTest {

    private Pedido pedido(String estado) {
        Pedido p = new Pedido();
        p.setNumeroPedido("HC-1");
        p.setEstadoPedido(estado);
        Usuario u = new Usuario();
        u.setId(7L);
        p.setUsuarioFinal(u);
        return p;
    }

    @Test
    void textoClaroPorEstado() {
        assertThat(PedidoSeguimientoTelegram.texto(pedido("ENVIADO"))).contains("HC-1").contains("va en camino");
    }

    @Test
    void avisaSoloConVinculacionActiva() {
        var repo = mock(TelegramVinculacionRepository.class);
        var bot = mock(TelegramClienteBotService.class);
        when(bot.isConfigured()).thenReturn(true);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setChatId(99L);
        when(repo.findByUsuarioId(7L)).thenReturn(Optional.of(v));
        new PedidoSeguimientoTelegram(repo, bot).avisar(pedido("ENTREGADO"));
        verify(bot).enviarMensaje(eq(99L), contains("entregado"));

        v.setEstado(TelegramVinculacion.REVOCADA);
        reset(bot);
        when(bot.isConfigured()).thenReturn(true);
        new PedidoSeguimientoTelegram(repo, bot).avisar(pedido("ENTREGADO"));
        verify(bot, never()).enviarMensaje(anyLong(), anyString());
    }
}