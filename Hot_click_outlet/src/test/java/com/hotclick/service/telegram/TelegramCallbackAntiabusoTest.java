package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** TG3: los botones (callback_query) también pasan por antiabuso. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TelegramCallbackAntiabusoTest {

    @Mock TelegramClienteBotService bot;
    @Mock TelegramRateLimitService rateLimit;
    @Mock TelegramVinculacionService vinculacion;
    @Mock TelegramEmpresaContextService empresaContext;
    @Mock TelegramMenuBuilder menuBuilder;
    @Mock TelegramDatosQueryService datosQuery;
    @Mock TelegramStockCheckService stockCheck;
    @Mock TelegramVinculacionRepository vinculacionRepository;
    @Mock TelegramFlujoService telegramFlujoService;
    @Mock TelegramAbusoService abuso;
    @InjectMocks TelegramCallbackHandler handler;

    @Test
    void callbackConInyeccionSeRechazaAntesDeProcesar() throws Exception {
        JsonNode cb = new ObjectMapper().readTree(
            "{\"id\":\"c1\",\"data\":\"emp:1' or 1=1\",\"message\":{\"message_id\":5,\"chat\":{\"id\":77}}}");
        TelegramVinculacion v = new TelegramVinculacion();
        v.setChatId(77L);
        when(rateLimit.permitidoPorRateLimit(77L)).thenReturn(true);
        when(vinculacion.vinculacionActiva(77L)).thenReturn(Optional.of(v));
        when(abuso.rechazarSiPausadoOBloqueado(v)).thenReturn(false);
        when(abuso.rechazarSiInyeccion(77L, "emp:1' or 1=1")).thenReturn(true);

        try {
            handler.procesarCallback(cb);
        } finally {
            TelegramTurno.cerrarYTomarSiDirty();
        }

        verify(abuso).rechazarSiInyeccion(77L, "emp:1' or 1=1");
        verifyNoInteractions(empresaContext, stockCheck, datosQuery, telegramFlujoService);
    }
}
