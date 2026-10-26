package com.hotclick.service.shoppingassistant;

import com.hotclick.rag.classifier.AssistantMetricsService;
import com.hotclick.rag.classifier.QueryClassification;
import com.hotclick.rag.classifier.QueryClassifier;
import com.hotclick.rag.dto.ChatResponse;
import com.hotclick.rag.pipeline.RagPipeline;
import com.hotclick.rag.pipeline.RagResult;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.customermemory.CustomerMemoryDto;
import com.hotclick.service.customermemory.CustomerMemoryService;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

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
        when(c.reservar(any(), anyBoolean())).thenReturn(true);
        return c;
    }

    static JdbcTemplate h2Real() {
        DriverManagerDataSource ds = new DriverManagerDataSource(
            "jdbc:h2:mem:cuota" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        JdbcTemplate j = new JdbcTemplate(ds);
        j.execute("CREATE TABLE hot_click_rate_limit_tb (bucket_key VARCHAR(255) PRIMARY KEY, "
            + "count INT NOT NULL, window_start BIGINT NOT NULL, expires_at BIGINT NOT NULL)");
        return j;
    }

    private final JdbcTemplate jdbc = h2Real();
    private final AiQuotaService quota = mock(AiQuotaService.class);

    private ShoppingAssistantCuota cuota(int porTienda, int global) {
        return new ShoppingAssistantCuota(jdbc, quota, porTienda, global);
    }

    private int contador(String clave) {
        List<Integer> c = jdbc.queryForList(
            "SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key = ?", Integer.class, clave);
        return c.isEmpty() ? 0 : c.get(0);
    }

    // ── Servicio: la cuota se verifica ANTES de crear sesión y del LLM ────────
    private final RagPipeline pipeline = mock(RagPipeline.class);
    private final ShoppingAssistantSessionHelper sesiones = mock(ShoppingAssistantSessionHelper.class);
    private final ShoppingAssistantCuota cuotaMock = mock(ShoppingAssistantCuota.class);
    private final ShoppingAssistantSesionFirma firma = firmaTest();
    private final UUID sesion = UUID.randomUUID();
    private ShoppingAssistantService service;

    @BeforeEach
    void setUp() {
        when(quota.verificarYReservar(anyLong())).thenReturn(true);
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

    @Test void sinCupo_noCreaSesion_niLlamaAlLlm_y_responde200Degradado() {
        when(cuotaMock.reservar(7L, false)).thenReturn(false);
        ChatResponse r = chat(null, false);
        assertThat(r.getRespuesta()).isEqualTo(ShoppingAssistantCuota.RESPUESTA_AGOTADA);
        assertThat(r.getSesionId()).isNull();
        verifyNoInteractions(pipeline, sesiones);
        // con token válido se devuelve el mismo token, sin crear nada
        String token = firma.firmar(7L, sesion);
        assertThat(chat(token, false).getSesionId()).isEqualTo(token);
        verifyNoInteractions(sesiones);
    }

    @Test void conCupo_llamaAlLlm_y_devuelveSesionFirmada() {
        when(cuotaMock.reservar(7L, false)).thenReturn(true);
        ChatResponse r = chat(null, false);
        assertThat(r.getRespuesta()).isEqualTo("ok");
        assertThat(r.getSesionId()).isEqualTo(firma.firmar(7L, sesion)).isNotEqualTo(sesion.toString());
        assertThat(firma.verificar(r.getSesionId(), 7L)).isEqualTo(sesion);
    }

    @Test void sesionSinFirma_forjada_oDeOtraTienda_seTrataComoNueva() {
        when(cuotaMock.reservar(anyLong(), anyBoolean())).thenReturn(true);
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

    // ── Cuota con JdbcTemplate REAL (H2) ─────────────────────────────────────
    @Test void limitePorTienda_niega_y_noConsumeGlobalNiPlan() {
        ShoppingAssistantCuota c = cuota(2, 100);
        assertThat(c.reservar(7L, false)).isTrue();
        assertThat(c.reservar(7L, false)).isTrue();
        assertThat(c.reservar(7L, false)).isFalse();
        assertThat(contador("asistente:global")).isEqualTo(2);
        verify(quota, times(2)).verificarYReservar(7L);
        assertThat(c.reservar(8L, false)).isTrue();   // otra tienda no se ve afectada
    }

    @Test void topeGlobal_niega_y_devuelveElCupoDeTienda() {
        ShoppingAssistantCuota c = cuota(100, 1);
        assertThat(c.reservar(7L, false)).isTrue();
        assertThat(c.reservar(8L, false)).isFalse();
        assertThat(contador("asistente:empresa:8")).isZero();
        assertThat(contador("asistente:global")).isEqualTo(1);
        verify(quota, never()).verificarYReservar(8L);
    }

    @Test void planAgotado_niega_y_devuelveTiendaYGlobal_marketplaceNoUsaPlan() {
        when(quota.verificarYReservar(7L)).thenReturn(false);
        ShoppingAssistantCuota c = cuota(100, 100);
        assertThat(c.reservar(7L, false)).isFalse();
        assertThat(contador("asistente:empresa:7")).isZero();
        assertThat(contador("asistente:global")).isZero();
        assertThat(c.reservar(null, true)).isTrue();
        assertThat(contador("asistente:empresa:marketplace")).isEqualTo(1);
        verify(quota, times(1)).verificarYReservar(anyLong());
        assertThat(c.reservar(null, false)).isFalse();  // tenant sin empresa → niega
    }

    @Test void ventanaVencida_seReiniciaAtomicamente() {
        long viejo = System.currentTimeMillis() / 1000 - ShoppingAssistantCuota.DIA_SEGUNDOS - 5;
        jdbc.update("INSERT INTO hot_click_rate_limit_tb VALUES ('asistente:empresa:7', 2, ?, ?)", viejo, viejo);
        jdbc.update("INSERT INTO hot_click_rate_limit_tb VALUES ('asistente:global', 2, ?, ?)", viejo, viejo);
        ShoppingAssistantCuota c = cuota(2, 2);
        assertThat(c.reservar(7L, false)).isTrue();
        assertThat(contador("asistente:empresa:7")).isEqualTo(1);
        Long ws = jdbc.queryForObject(
            "SELECT window_start FROM hot_click_rate_limit_tb WHERE bucket_key='asistente:global'", Long.class);
        assertThat(ws).isGreaterThan(viejo);
    }

    @Test void concurrencia_noSuperaElLimite() throws Exception {
        ShoppingAssistantCuota c = cuota(10, 1000);
        ExecutorService ex = Executors.newFixedThreadPool(8);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        List<Future<?>> fs = new java.util.ArrayList<>();
        for (int i = 0; i < 40; i++) {
            fs.add(ex.submit(() -> { go.await(); if (c.reservar(null, true)) ok.incrementAndGet(); return null; }));
        }
        go.countDown();
        for (Future<?> f : fs) f.get(20, TimeUnit.SECONDS);
        ex.shutdown();
        assertThat(ok.get()).isLessThanOrEqualTo(10);
        assertThat(contador("asistente:empresa:marketplace")).isLessThanOrEqualTo(10);
    }

    @Test void errorDeBdReal_failClosed_sinTabla() {
        jdbc.execute("DROP TABLE hot_click_rate_limit_tb");
        assertThat(cuota(300, 3000).reservar(7L, false)).isFalse();
        assertThat(cuota(300, 3000).reservar(null, true)).isFalse();
        verify(quota, never()).verificarYReservar(anyLong());
    }

    @Test void errorDeBdReal_failClosed_conexionCaida() {
        JdbcTemplate caido = new JdbcTemplate(new DriverManagerDataSource(
            "jdbc:h2:tcp://127.0.0.1:1/noexiste", "sa", ""));
        assertThat(new ShoppingAssistantCuota(caido, quota, 300, 3000).reservar(null, true)).isFalse();
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
