package com.hotclick.service.shoppingassistant;

import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.classifier.QueryClassification;
import com.hotclick.rag.classifier.QueryClassifier;
import com.hotclick.rag.dto.AccionChat;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.pipeline.RagPipeline;
import com.hotclick.rag.pipeline.RagResult;
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

    static AsistenteCuotaDiaria cuotaLibre() {
        AsistenteCuotaDiaria c = mock(AsistenteCuotaDiaria.class);
        when(c.reservar(any(), anyBoolean(), any())).thenReturn(AsistenteCuotaDiaria.Reserva.OK);
        return c;
    }

    // ── Servicio: la cuota se verifica ANTES de crear sesión y del LLM ────────
    private final RagPipeline pipeline = mock(RagPipeline.class);
    private final ShoppingAssistantSessionHelper sesiones = mock(ShoppingAssistantSessionHelper.class);
    private final AsistenteCuotaDiaria cuotaMock = mock(AsistenteCuotaDiaria.class);
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
        service = new ShoppingAssistantService(pipeline, mock(com.hotclick.service.AiQuotaService.class), san, mem, cls,
            mock(AssistantMetricsService.class), sesiones, mock(ShoppingAssistantPersistence.class),
            mock(ShoppingAssistantFeedbackHandler.class), cuotaMock, firma);
    }

    private ChatResponse chat(String sesionId, boolean marketplace) {
        return service.chat(7L, "Tienda", "Busco un sillón", sesionId, null, null, marketplace, null);
    }

    @Test void sinCupo_noCreaSesion_niLlamaAlLlm_y_responde200Degradado() {
        var acciones = List.of(new AccionChat(AccionChat.BUSCAR, "Buscar productos", "/tienda/casa-luna"));
        when(cuotaMock.reservar(eq(7L), eq(false), any())).thenReturn(new AsistenteCuotaDiaria.Reserva(
            false, AsistenteCuotaDiaria.Motivo.CLIENTE, "Llegaste al límite", acciones));
        ChatResponse r = chat(null, false);
        assertThat(r.getRespuesta()).isEqualTo("Llegaste al límite");
        assertThat(r.getAcciones()).isEqualTo(acciones);
        assertThat(r.getSesionId()).isNull();
        verifyNoInteractions(pipeline, sesiones);
        // con token válido se devuelve el mismo token, sin crear nada
        String token = firma.firmar(7L, sesion);
        assertThat(chat(token, false).getSesionId()).isEqualTo(token);
        verifyNoInteractions(sesiones);
    }

    @Test void conCupo_llamaAlLlm_y_devuelveSesionFirmada() {
        when(cuotaMock.reservar(eq(7L), eq(false), any())).thenReturn(AsistenteCuotaDiaria.Reserva.OK);
        ChatResponse r = chat(null, false);
        assertThat(r.getRespuesta()).isEqualTo("ok");
        assertThat(r.getSesionId()).isEqualTo(firma.firmar(7L, sesion)).isNotEqualTo(sesion.toString());
        assertThat(firma.verificar(r.getSesionId(), 7L)).isEqualTo(sesion);
    }

    @Test void sesionSinFirma_forjada_oDeOtraTienda_seTrataComoNueva() {
        when(cuotaMock.reservar(anyLong(), anyBoolean(), any())).thenReturn(AsistenteCuotaDiaria.Reserva.OK);
        UUID otra = UUID.randomUUID();
        chat(otra.toString(), false);
        chat(otra + ".00000000000000000000000000000000", false);
        chat(firma.firmar(8L, otra), false);              // token válido pero de la tienda 8
        verify(sesiones, times(3)).resolveSession(isNull(), eq(7L));
        chat(firma.firmar(7L, otra), false);
        verify(sesiones).resolveSession(eq(otra.toString()), eq(7L));
    }

    @Test void crossStore_historialExpirarFeedback_rechazanTokenDeOtraTienda() {
        UUID s = UUID.randomUUID();
        when(sesiones.empresaDeSesion(s)).thenReturn(7L);   // la sesión es de la tienda 7
        when(sesiones.getSessionHistory(s.toString()))
            .thenReturn(Map.of("sesionId", s.toString(), "mensajes", List.of()));
        String deTienda7 = firma.firmar(7L, s);
        String forjadoComo8 = firma.firmar(8L, s);

        // request con tenant 8 y token legítimo de la 7 → nada
        assertThat(service.getSessionHistory(deTienda7, 8L)).containsEntry("sesionId", "");
        service.expireSession(deTienda7, 8L);
        service.submitFeedback(deTienda7, 0, 1, 8L);
        // token firmado para 8 sobre sesión de 7 (con o sin tenant) → nada
        assertThat(service.getSessionHistory(forjadoComo8, 8L)).containsEntry("sesionId", "");
        assertThat(service.getSessionHistory(forjadoComo8)).containsEntry("sesionId", "");
        service.expireSession(forjadoComo8);
        verify(sesiones, never()).expireSession(anyString());
        verify(sesiones, never()).getSessionHistory(anyString());

        // tenant correcto, o cliente legado sin slug → ok
        assertThat(service.getSessionHistory(deTienda7, 7L)).containsEntry("sesionId", deTienda7);
        assertThat(service.getSessionHistory(deTienda7)).containsEntry("sesionId", deTienda7);
        service.expireSession(deTienda7, 7L);
        verify(sesiones).expireSession(s.toString());
    }

    @Test void historial_expirar_feedback_exigenFirma() {
        UUID s = UUID.randomUUID();
        assertThat(service.getSessionHistory(s.toString())).containsEntry("sesionId", "");
        service.expireSession(s.toString());
        verifyNoInteractions(sesiones);
    }

    // ── Firma ────────────────────────────────────────────────────────────────
    @Test void firma_ligadaAEmpresa_y_claveDerivadaPorHmac() throws Exception {
        UUID u = UUID.randomUUID();
        String t = firma.firmar(7L, u);
        assertThat(firma.verificar(t, 7L)).isEqualTo(u);
        assertThat(firma.verificar(t, 8L)).isNull();
        assertThat(firma.verificar(t, null)).isNull();
        // clave = HMAC-SHA256(secreto, dominio); mac = HMAC(clave, "empresaId|uuid")[0..16)
        javax.crypto.Mac m = javax.crypto.Mac.getInstance("HmacSHA256");
        m.init(new javax.crypto.spec.SecretKeySpec(SECRETO_FAKE.getBytes(), "HmacSHA256"));
        byte[] k = m.doFinal(ShoppingAssistantSesionFirma.DOMINIO.getBytes());
        m.init(new javax.crypto.spec.SecretKeySpec(k, "HmacSHA256"));
        String esperado = java.util.HexFormat.of().formatHex(m.doFinal(("7|" + u).getBytes()), 0, 16);
        assertThat(t).isEqualTo(u + "." + esperado);
    }

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
        assertThat(f.verificar(f.firmar(7L, u), 7L)).isEqualTo(u);
        assertThat(firma.verificar(f.firmar(7L, u), 7L)).isNull();
    }
}
