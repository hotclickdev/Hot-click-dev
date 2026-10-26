package com.hotclick.service.shoppingassistant;

import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.classifier.QueryClassification;
import com.hotclick.rag.classifier.QueryClassifier;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.pipeline.RagPipeline;
import com.hotclick.rag.pipeline.RagResult;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.customermemory.CustomerMemoryDto;
import com.hotclick.service.customermemory.CustomerMemoryService;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** ALTO-1: cuota/tope de costo del asistente público + sesión firmada. */
class ShoppingAssistantCuotaTest {

    static final String SECRETO_FAKE = "fake-test-secret-not-real-0123456789abcdef";

    static ShoppingAssistantSesionFirma firmaTest() {
        ShoppingAssistantSesionFirma f = new ShoppingAssistantSesionFirma(SECRETO_FAKE, new MockEnvironment());
        f.init();
        return f;
    }

    static ShoppingAssistantCuota cuotaLibre() {
        ShoppingAssistantCuota c = mock(ShoppingAssistantCuota.class);
        when(c.reservar(anyLong(), anyBoolean())).thenReturn(true);
        return c;
    }

    private final RateLimiter rl = mock(RateLimiter.class);
    private final AiQuotaService quota = mock(AiQuotaService.class);
    private final ShoppingAssistantCuota cuota = new ShoppingAssistantCuota(rl, quota, 300, 3000);

    // ── Servicio: la cuota se verifica ANTES del LLM ─────────────────────────
    private final RagPipeline pipeline = mock(RagPipeline.class);
    private final ShoppingAssistantSessionHelper sesiones = mock(ShoppingAssistantSessionHelper.class);
    private final ShoppingAssistantCuota cuotaMock = mock(ShoppingAssistantCuota.class);
    private final ShoppingAssistantSesionFirma firma = firmaTest();
    private final UUID sesion = UUID.randomUUID();
    private ShoppingAssistantService service;

    @BeforeEach
    void setUp() {
        InputSanitizer san = mock(InputSanitizer.class);
        when(san.cleanWithLimit(anyString(), anyInt())).thenAnswer(i -> i.getArgument(0));
        QueryClassifier cls = mock(QueryClassifier.class);
        when(cls.classify(anyString(), any())).thenReturn(QueryClassification.PRODUCTO);
        CustomerMemoryService mem = mock(CustomerMemoryService.class);
        when(mem.getOrCreate(any())).thenReturn(CustomerMemoryDto.empty(null));
        when(sesiones.resolveSession(any(), anyLong())).thenReturn(sesion);
        when(sesiones.loadHistory(any())).thenReturn(List.of());
        when(pipeline.ejecutar(anyString(), anyLong(), any(), any(), any(), any(), anyBoolean(), any()))
            .thenReturn(new RagResult("ok", List.of(), List.of(), List.of(), 10, 10));
        service = new ShoppingAssistantService(pipeline, quota, san, mem, cls,
            mock(AssistantMetricsService.class), sesiones, mock(ShoppingAssistantPersistence.class),
            mock(ShoppingAssistantFeedbackHandler.class), cuotaMock, firma);
    }

    private ChatResponse chat(String sesionId, boolean marketplace) {
        return service.chat(7L, "Tienda", "Busco un sillón", sesionId, null, null, marketplace, null);
    }

    @Test void sinCupo_noLlamaAlLlm_y_responde200Degradado() {
        when(cuotaMock.reservar(7L, false)).thenReturn(false);
        ChatResponse r = chat(null, false);
        assertThat(r.getRespuesta()).isEqualTo(ShoppingAssistantCuota.RESPUESTA_AGOTADA);
        assertThat(firma.verificar(r.getSesionId())).isEqualTo(sesion);
        verifyNoInteractions(pipeline);
    }

    @Test void conCupo_llamaAlLlm_y_devuelveSesionFirmada() {
        when(cuotaMock.reservar(7L, false)).thenReturn(true);
        ChatResponse r = chat(null, false);
        assertThat(r.getRespuesta()).isEqualTo("ok");
        assertThat(r.getSesionId()).isEqualTo(firma.firmar(sesion)).isNotEqualTo(sesion.toString());
    }

    @Test void sesionSinFirma_oForjada_seTrataComoNueva() {
        when(cuotaMock.reservar(anyLong(), anyBoolean())).thenReturn(true);
        UUID otra = UUID.randomUUID();
        chat(otra.toString(), false);
        chat(otra + ".00000000000000000000000000000000", false);
        verify(sesiones, times(2)).resolveSession(isNull(), eq(7L));
        chat(firma.firmar(otra), false);
        verify(sesiones).resolveSession(eq(otra.toString()), eq(7L));
    }

    @Test void historial_expirar_feedback_exigenFirma() {
        UUID s = UUID.randomUUID();
        assertThat(service.getSessionHistory(s.toString())).containsEntry("sesionId", "");
        service.expireSession(s.toString());
        verifyNoInteractions(sesiones);
        when(sesiones.getSessionHistory(s.toString())).thenReturn(Map.of("sesionId", s.toString(), "mensajes", List.of()));
        assertThat(service.getSessionHistory(firma.firmar(s))).containsEntry("sesionId", firma.firmar(s));
    }

    // ── Cuota: global, por tienda, plan ──────────────────────────────────────
    @Test void topeGlobal_agotado_niga_sinTocarPlan() {
        when(rl.tryAcquire(eq("asistente:global"), eq(3000), anyInt())).thenReturn(false);
        assertThat(cuota.reservar(7L, false)).isFalse();
        verifyNoInteractions(quota);
    }

    @Test void limitePorTienda_agotado_niega() {
        when(rl.tryAcquire(eq("asistente:global"), anyInt(), anyInt())).thenReturn(true);
        when(rl.tryAcquire(eq("asistente:empresa:7"), eq(300), eq(86_400))).thenReturn(false);
        assertThat(cuota.reservar(7L, false)).isFalse();
        verifyNoInteractions(quota);
    }

    @Test void tenant_usaVerificarYReservar_marketplaceNo() {
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(quota.verificarYReservar(7L)).thenReturn(false);
        assertThat(cuota.reservar(7L, false)).isFalse();
        assertThat(cuota.reservar(7L, true)).isTrue();
        verify(quota, times(1)).verificarYReservar(7L);
    }

    @Test void errorVerificando_failClosed() {
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenThrow(new RuntimeException("db"));
        assertThat(cuota.reservar(7L, true)).isFalse();
    }

    // ── Firma: fail-closed sin secreto fuera de dev/test ─────────────────────
    @Test void sinSecreto_enProd_failClosed_enTest_claveEfimera() {
        MockEnvironment prod = new MockEnvironment();
        prod.setActiveProfiles("prod");
        assertThatThrownBy(() -> new ShoppingAssistantSesionFirma("", prod).init())
            .isInstanceOf(IllegalStateException.class);
        MockEnvironment test = new MockEnvironment();
        test.setActiveProfiles("test");
        ShoppingAssistantSesionFirma f = new ShoppingAssistantSesionFirma("", test);
        f.init();
        UUID u = UUID.randomUUID();
        assertThat(f.verificar(f.firmar(u))).isEqualTo(u);
        assertThat(firma.verificar(f.firmar(u))).isNull();
    }
}
