package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.exception.PedidoYaCanceladoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** BAJO-05: confirmar en Telegram la cancelación de un pedido ya cancelado avisa claro y no hace nada más. */
@DisplayName("[Telegram] BAJO-05 cancelar un pedido ya cancelado → «Este pedido ya está cancelado.»")
class TelegramCancelarRepetidoTest {

    @Test
    void cancelarRepetido_mensajeClaro_sinEfectos() throws Exception {
        TelegramFlujoSupport support = mock(TelegramFlujoSupport.class);
        TelegramFlujoService flujo = mock(TelegramFlujoService.class);
        TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
        PedidoRepository pedidos = mock(PedidoRepository.class);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        TelegramFlujoAccionHandler h = new TelegramFlujoAccionHandler();
        ReflectionTestUtils.setField(h, "support", support);
        ReflectionTestUtils.setField(h, "flujo", flujo);
        ReflectionTestUtils.setField(h, "bot", bot);
        ReflectionTestUtils.setField(h, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(h, "objectMapper", mapper);

        Empresa empresa = new Empresa();
        empresa.setId(9L);
        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        when(pedidos.findById(33L)).thenReturn(Optional.of(pedido));
        when(support.ahora()).thenReturn(LocalDateTime.now(Constants.ZONA_CR));
        when(flujo.cambiarEstadoPedidoTx(anyLong(), any(), any())).thenThrow(new PedidoYaCanceladoException());

        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(4242L);
        v.setEmpresaActivaId(9L);
        v.setContexto(TelegramFlujoEstado.nuevaAccion(LocalDateTime.now(Constants.ZONA_CR),
            AccionPropuestaTelegram.PEDIDO_ESTADO, 33L, Map.of("nuevoEstado", Constants.PEDIDO_CANCELADO),
            "Cancelar pedido").serializar(mapper));

        h.callback(v, 9L, "ok"); // no propaga la excepción

        verify(bot).enviarMensaje(4242L, "Este pedido ya está cancelado.");
        verifyNoMoreInteractions(bot); // ni ✅ ni el texto genérico
        verify(flujo, times(1)).cambiarEstadoPedidoTx(33L, Constants.PEDIDO_CANCELADO, null);
        verifyNoMoreInteractions(flujo);
        verify(pedidos, never()).save(any());
        verify(support).limpiar(v);
    }
}
