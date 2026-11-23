package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramBotUpdateService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Roles separados: el chat del panel conserva el menú; el no vinculado solo ve el flujo del comprador. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Bot: separación de roles dueño/equipo vs comprador")
class TelegramCompradorRolesTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final long CHAT = 4242L;

    // Handler de mensajes
    @Mock TelegramClienteBotService bot;
    @Mock TelegramRateLimitService rateLimit;
    @Mock TelegramVinculacionService vinculacion;
    @Mock TelegramEmpresaContextService empresaContext;
    @Mock TelegramFlujoService telegramFlujoService;
    @Mock TelegramAbusoService abuso;
    @Mock TelegramCompradorService compradores;
    @Mock TelegramMessageRoutingHelper routing;
    @InjectMocks TelegramMessageHandler mensajes;

    // Helper de /start (real, con sus colaboradores simulados)
    @Mock TelegramMenuBuilder menuBuilder;
    @Mock TelegramStockCheckService stockCheck;
    @Mock TelegramVinculacionRepository vinculacionRepository;
    @Mock TelegramPlanConsulta planConsulta;
    @Mock TelegramBotUpdateService self;

    // Callbacks
    @Mock TelegramDatosQueryService datosQuery;
    @InjectMocks TelegramCallbackHandler callbacks;

    private static JsonNode json(String s) throws Exception { return JSON.readTree(s); }

    private TelegramVinculacion vinculado() {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(CHAT);
        return v;
    }

    private TelegramMessageRoutingHelper helperReal() {
        TelegramMessageRoutingHelper h = new TelegramMessageRoutingHelper();
        ReflectionTestUtils.setField(h, "bot", bot);
        ReflectionTestUtils.setField(h, "vinculacion", vinculacion);
        ReflectionTestUtils.setField(h, "menuBuilder", menuBuilder);
        ReflectionTestUtils.setField(h, "compradores", compradores);
        return h;
    }

    @Test
    @DisplayName("/start t_{slug} en un chat NO vinculado abre el catálogo del comprador")
    void startTiendaAbreCatalogo() throws Exception {
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
        helperReal().manejarStart(CHAT, json("{\"from\":{\"username\":\"x\"}}"), "/start t_mi-tienda");
        verify(compradores).iniciarDesdeStart(CHAT, "t_mi-tienda");
        verify(vinculacion, never()).vincular(anyLong(), any(), anyString());
    }

    @Test
    @DisplayName("/start t_{slug} en un chat VINCULADO al panel NO entra al checkout: sigue el menú del negocio")
    void chatVinculadoNoEntraAlCheckout() throws Exception {
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.of(vinculado()));
        helperReal().manejarStart(CHAT, json("{}"), "/start t_mi-tienda");
        verify(compradores, never()).iniciarDesdeStart(anyLong(), anyString());
        verify(bot).enviarMensaje(eq(CHAT), contains("vinculado"));
    }

    @Test
    @DisplayName("/start con el código de vinculación de 8 caracteres sigue vinculando al panel")
    void codigoDeOchoVinculaAlPanel() throws Exception {
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
        helperReal().manejarStart(CHAT, json("{\"from\":{\"username\":\"x\"}}"), "/start ABCD2345");
        verify(vinculacion).vincular(CHAT, "x", "ABCD2345");
        verify(compradores, never()).iniciarDesdeStart(anyLong(), anyString());
    }

    @Test
    @DisplayName("el payload de tienda es inequívoco: un código de 8 no lo es")
    void payloadInequivoco() {
        org.junit.jupiter.api.Assertions.assertTrue(TelegramCompradorService.esStartTienda("t_mi-tienda"));
        org.junit.jupiter.api.Assertions.assertFalse(TelegramCompradorService.esStartTienda("ABCD2345"));
        org.junit.jupiter.api.Assertions.assertFalse(TelegramCompradorService.esStartTienda("t_"));
        org.junit.jupiter.api.Assertions.assertFalse(TelegramCompradorService.esStartTienda("t_../x"));
    }

    @Test
    @DisplayName("chat no vinculado: callbacks de inventario, finanzas, venta, producto y clientes NO se atienden")
    void noVinculadoNoUsaCallbacksDelNegocio() throws Exception {
        when(rateLimit.permitidoPorRateLimit(CHAT)).thenReturn(true);
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
        for (String data : new String[] {"inv", "inv:mod", "fin", "ventas", "vta:ini", "prd:ini", "cli:pg:0", "acn:ok", "emp:1", "chk:1"}) {
            callbacks.procesarCallback(json("{\"id\":\"c\",\"data\":\"" + data + "\",\"message\":{\"message_id\":5,\"chat\":{\"id\":" + CHAT + "}}}"));
        }
        verify(compradores, never()).procesarCallback(anyLong(), anyString());
        verifyNoInteractions(datosQuery, stockCheck, telegramFlujoService, empresaContext);
        verify(bot, times(10)).enviarMensaje(eq(CHAT), eq(TelegramVinculacionService.MENSAJE_NO_VINCULADO));
    }

    @Test
    @DisplayName("chat no vinculado: los botones del pedido (c:) sí van al flujo del comprador")
    void noVinculadoUsaBotonesDelComprador() throws Exception {
        when(rateLimit.permitidoPorRateLimit(CHAT)).thenReturn(true);
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
        callbacks.procesarCallback(json("{\"id\":\"c\",\"data\":\"c:p:0\",\"message\":{\"message_id\":5,\"chat\":{\"id\":" + CHAT + "}}}"));
        verify(compradores).procesarCallback(CHAT, "c:p:0");
        verifyNoInteractions(datosQuery, stockCheck, telegramFlujoService);
    }

    @Test
    @DisplayName("la ubicación de Telegram solo llega al flujo del comprador (no vinculado); un chat del panel la ignora")
    void ubicacionSoloParaElComprador() throws Exception {
        when(rateLimit.permitidoPorRateLimit(CHAT)).thenReturn(true);
        String loc = "{\"chat\":{\"id\":" + CHAT + ",\"type\":\"private\"},\"location\":{\"latitude\":9.93,\"longitude\":-84.08}}";

        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
        mensajes.procesarMensaje(json(loc));
        verify(compradores).procesarUbicacion(eq(CHAT), any(JsonNode.class));

        reset(compradores);
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.of(vinculado()));
        mensajes.procesarMensaje(json(loc));
        verify(compradores, never()).procesarUbicacion(anyLong(), any());
        verifyNoInteractions(telegramFlujoService);
    }

    @Test
    @DisplayName("las fotos de un comprador siguen rechazadas")
    void fotosRechazadas() throws Exception {
        when(rateLimit.permitidoPorRateLimit(CHAT)).thenReturn(true);
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
        mensajes.procesarMensaje(json("{\"chat\":{\"id\":" + CHAT + ",\"type\":\"private\"},\"photo\":[{\"file_id\":\"f\"}]}"));
        verify(bot).enviarMensaje(eq(CHAT), contains("solo acepto mensajes de texto"));
        verifyNoInteractions(compradores);
    }

    @Test
    @DisplayName("texto suelto de un chat no vinculado sin sesión de comprador: mensaje de no vinculado")
    void textoSueltoSinSesion() throws Exception {
        when(rateLimit.permitidoPorRateLimit(CHAT)).thenReturn(true);
        when(vinculacion.vinculacionActiva(CHAT)).thenReturn(Optional.empty());
        when(compradores.tieneSesionActiva(CHAT)).thenReturn(false);
        when(routing.manejarStart(anyLong(), any(), anyString())).thenReturn(false);
        mensajes.procesarMensaje(json("{\"chat\":{\"id\":" + CHAT + ",\"type\":\"private\"},\"text\":\"hola\"}"));
        verify(bot).enviarMensaje(CHAT, TelegramVinculacionService.MENSAJE_NO_VINCULADO);
        verify(compradores, never()).procesarTexto(anyLong(), anyString());
    }

    private static String contains(String s) { return org.mockito.ArgumentMatchers.contains(s); }
}
