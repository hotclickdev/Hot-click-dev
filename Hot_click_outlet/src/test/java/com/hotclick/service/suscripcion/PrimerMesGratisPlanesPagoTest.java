package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.TrialEmprendedorRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Primer mes gratis de PYME y NEGOCIO_PLUS (V244): politica, alta ONVO, cierre del trial, config y migracion. */
@ExtendWith(MockitoExtension.class)
@DisplayName("Primer mes gratis PYME / NEGOCIO_PLUS")
class PrimerMesGratisPlanesPagoTest {

    static final LocalDate HOY = LocalDate.now(Constants.ZONA_CR);

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionPlanSupport planSupport;
    @Mock TrialEmprendedorRepository trialRepo;
    @Mock CacheManager cacheManager;

    SuscripcionOnvoChangeService service;
    TrialPlanesPagoService politica;
    Empresa empresa;
    Plan planEmprendedor;
    Plan planPyme;

    private static TrialPlanesPagoService politica(int dias, String planes) {
        return new TrialPlanesPagoService(new TrialPlanesPagoConfig(dias, planes));
    }

    @BeforeEach
    void setUp() {
        politica = politica(30, "PYME,NEGOCIO_PLUS");
        service = new SuscripcionOnvoChangeService(
            suscripcionRepo, empresaRepo, planRepo, onvoBilling, onvoService, planSupport, null);
        ReflectionTestUtils.setField(service, "self", service);
        ReflectionTestUtils.setField(service, "trialPlanes", politica);
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");
        ReflectionTestUtils.setField(service, "environment", env);

        planEmprendedor = new Plan();
        planEmprendedor.setId(1L);
        planEmprendedor.setNombre("EMPRENDEDOR");
        planPyme = new Plan();
        planPyme.setId(2L);
        planPyme.setNombre("PYME");

        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombreEmpresa("Demo");
        empresa.setCorreoEmpresa("demo@negocio.cr");
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setPlan(planEmprendedor);
        empresa.setEstadoPlan("ACTIVO");
        empresa.setEstadoEmpresa("ACTIVO");

        lenient().when(planRepo.findById(1L)).thenReturn(Optional.of(planEmprendedor));
        lenient().when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        lenient().when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(planPyme));
        lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        lenient().when(empresaRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(empresa));
        lenient().when(empresaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.empty());
        lenient().when(suscripcionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(onvoBilling.getPriceIdForPlan("PYME")).thenReturn("price_pyme");
        lenient().when(onvoBilling.crearCustomer(any(), any(), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoCustomer("cus_1"));
        lenient().when(onvoService.getPublishableKey()).thenReturn("pk_test");
        lenient().when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_1", "item_1"));
    }

    private void emprendedorConDias(int dias) {
        LocalDate fin = HOY.plusDays(dias);
        empresa.setTrialEmprendedorPos(4);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        empresa.setTrialEmprendedorHasta(fin);
        empresa.setTrialHasta(fin);
    }

    // ---------------------------------------------------------------- politica (reglas 1 a 5)

    @Test
    @DisplayName("Negocio nuevo a PYME o NEGOCIO_PLUS: N dias (30)")
    void negocioNuevoRecibeN() {
        assertThat(politica.diasTrial(empresa, "PYME", HOY)).isEqualTo(30);
        assertThat(politica.diasTrial(empresa, "NEGOCIO_PLUS", HOY)).isEqualTo(30);
    }

    @Test
    @DisplayName("Ya uso el primer mes gratis (cancelo o lo suspendieron y vuelve): 0 dias")
    void yaUsadoNoSeRepite() {
        empresa.setPrimerMesGratisUsadoEn(LocalDateTime.now());
        assertThat(politica.diasTrial(empresa, "PYME", HOY)).isZero();
        assertThat(politica.elegible(empresa, "PYME")).isFalse();
    }

    @Test
    @DisplayName("Viene de Emprendedor con 60 dias: 60; con 10 dias: 30 (max(restantes, N))")
    void maxConEmprendedor() {
        emprendedorConDias(60);
        assertThat(politica.diasTrial(empresa, "PYME", HOY)).isEqualTo(60);
        emprendedorConDias(10);
        assertThat(politica.diasTrial(empresa, "PYME", HOY)).isEqualTo(30);
    }

    @Test
    @DisplayName("Ya usado pero con dias de Emprendedor: conserva los de Emprendedor (comportamiento previo)")
    void usadoConservaEmprendedor() {
        emprendedorConDias(10);
        empresa.setPrimerMesGratisUsadoEn(LocalDateTime.now());
        assertThat(politica.diasTrial(empresa, "PYME", HOY)).isEqualTo(10);
    }

    @Test
    @DisplayName("N=0 desactiva; plan fuera de la lista no recibe; EMPRENDEDOR nunca recibe esta regla")
    void desactivadoYFueraDeLista() {
        assertThat(politica(0, "PYME,NEGOCIO_PLUS").diasTrial(empresa, "PYME", HOY)).isZero();
        assertThat(politica(30, "PYME").diasTrial(empresa, "NEGOCIO_PLUS", HOY)).isZero();
        assertThat(politica.diasTrial(empresa, "EMPRENDEDOR", HOY)).isZero();
        assertThat(politica(30, "").diasTrial(empresa, "PYME", HOY)).isZero();
    }

    @Test
    @DisplayName("Sin cupo: la politica no lleva contador (cualquier negocio nuevo recibe N)")
    void sinCupo() {
        for (int i = 0; i < 200; i++) {
            assertThat(politica.diasTrial(new Empresa(), "PYME", HOY)).isEqualTo(30);
        }
    }

    // ---------------------------------------------------------------- alta ONVO

    @Test
    @DisplayName("Alta PYME de un negocio nuevo: ONVO recibe 30, trialDias=30, queda marcado y con fechaFin")
    void altaPymeConPrimerMes() {
        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("trialDias")).isEqualTo(30);
        verify(onvoBilling).crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap(), eq(30));
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        assertThat(empresa.getPrimerMesGratisUsadoEn()).isNotNull();
        ArgumentCaptor<Suscripcion> cap = ArgumentCaptor.forClass(Suscripcion.class);
        verify(suscripcionRepo).save(cap.capture());
        assertThat(cap.getValue().getFechaFin()).isEqualTo(HOY.plusDays(30));
        // El plan vigente no cambia hasta que ONVO confirme la tarjeta o el cobro.
        assertThat(empresa.getPlanSaas()).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("Re-suscripcion tras cancelar: cobro inmediato (sin trialPeriodDays) y no se marca de nuevo")
    void reSuscripcionSinDiasGratis() {
        LocalDateTime usado = LocalDateTime.now().minusDays(90);
        empresa.setPrimerMesGratisUsadoEn(usado);
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_2", "item_1"));

        Map<String, Object> out = service.cambiarPlan(10L, 2L);

        assertThat(out).doesNotContainKey("trialDias");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        assertThat(empresa.getPrimerMesGratisUsadoEn()).isEqualTo(usado);
    }

    @Test
    @DisplayName("Ex-Emprendedor con 60 dias: ONVO recibe 60")
    void altaDesdeEmprendedor() {
        emprendedorConDias(60);
        service.cambiarPlan(10L, 2L);
        verify(onvoBilling).crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap(), eq(60));
    }

    @Test
    @DisplayName("Ex-Emprendedor con 10 dias: ONVO recibe 30 y la fila vence a los 30, no a los 10")
    void altaDesdeEmprendedorPocosDias() {
        emprendedorConDias(10);
        service.cambiarPlan(10L, 2L);
        verify(onvoBilling).crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap(), eq(30));
        ArgumentCaptor<Suscripcion> cap = ArgumentCaptor.forClass(Suscripcion.class);
        verify(suscripcionRepo).save(cap.capture());
        assertThat(cap.getValue().getFechaFin()).isEqualTo(HOY.plusDays(30));
    }

    @Test
    @DisplayName("N=0: el alta PYME cobra de inmediato y no marca al negocio")
    void altaConNCero() {
        ReflectionTestUtils.setField(service, "trialPlanes", politica(0, "PYME,NEGOCIO_PLUS"));
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_pyme"), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_3", "item_1"));
        Map<String, Object> out = service.cambiarPlan(10L, 2L);
        assertThat(out).doesNotContainKey("trialDias");
        assertThat(empresa.getPrimerMesGratisUsadoEn()).isNull();
    }

    @Test
    @DisplayName("subidaCobrada: el reemplazo fija 0 dias antes de consultar la politica")
    void subidaCobradaSinMesNuevo() throws Exception {
        String fuente = Files.readString(Path.of(
            "src/main/java/com/hotclick/service/suscripcion/SuscripcionOnvoChangeService.java"));
        assertThat(fuente).containsPattern("int diasTrial = subidaCobrada \\? 0\\s+: conPrimerMes\\(");
    }

    // ---------------------------------------------------------------- cerrarTrial

    private TrialEmprendedorService trialService() {
        return new TrialEmprendedorService(trialRepo, empresaRepo, suscripcionRepo, planRepo, cacheManager, 8);
    }

    private Suscripcion subTrial(Plan pendiente, LocalDate fechaFin) {
        Suscripcion sub = new Suscripcion();
        sub.setEstado("TRIAL");
        sub.setPlan(planEmprendedor);
        sub.setPlanPendiente(pendiente);
        sub.setOnvoSubscriptionId("sub_1");
        sub.setFechaFin(fechaFin);
        return sub;
    }

    @Test
    @DisplayName("cerrarTrial no manda a PAST_DUE a un ex-Emprendedor en su primer mes gratis de PYME")
    void cerrarTrialRespetaPrimerMes() {
        emprendedorConDias(0);
        empresa.setTrialEmprendedorHasta(HOY.minusDays(1));
        Suscripcion sub = subTrial(planPyme, HOY.plusDays(20));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));

        assertThat(trialService().cerrarTrial(10L, HOY)).isFalse();

        assertThat(empresa.getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_TRIAL);
        assertThat(sub.getEstado()).isEqualTo("TRIAL");
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("cerrarTrial vuelve a aplicar cuando el mes gratis de PYME ya vencio sin cobro")
    void cerrarTrialAplicaTrasMesGratis() {
        emprendedorConDias(0);
        empresa.setTrialEmprendedorHasta(HOY.minusDays(40));
        Suscripcion sub = subTrial(planPyme, HOY.minusDays(1));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));

        assertThat(trialService().cerrarTrial(10L, HOY)).isTrue();
        assertThat(empresa.getEstadoPlan()).isEqualTo("PAST_DUE");
    }

    @Test
    @DisplayName("cerrarTrial sigue cerrando el trial Emprendedor normal (sin plan de pago elegido)")
    void cerrarTrialEmprendedorNormal() {
        emprendedorConDias(0);
        empresa.setTrialEmprendedorHasta(HOY.minusDays(1));
        Suscripcion sub = subTrial(null, HOY.minusDays(1));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));

        assertThat(trialService().cerrarTrial(10L, HOY)).isTrue();
        assertThat(empresa.getEstadoPlan()).isEqualTo("PAST_DUE");
    }

    // ---------------------------------------------------------------- config y verificacion ONVO

    @Test
    @DisplayName("Config: valida dias (0..365) y planes (solo PYME/NEGOCIO_PLUS); oferta generica por plan")
    void configValida() {
        assertThatThrownBy(() -> new TrialPlanesPagoConfig(-1, "PYME")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TrialPlanesPagoConfig(366, "PYME")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TrialPlanesPagoConfig(30, "PYME,EMPRENDEDOR")).isInstanceOf(IllegalStateException.class);
        TrialPlanesPagoConfig c = new TrialPlanesPagoConfig(30, " pyme , negocio_plus ");
        assertThat(c.diasOferta("PYME")).isEqualTo(30);
        assertThat(c.diasOferta("NEGOCIO_PLUS")).isEqualTo(30);
        assertThat(c.diasOferta("EMPRENDEDOR")).isZero();
        assertThat(new TrialPlanesPagoConfig(0, "PYME").diasOferta("PYME")).isZero();
        assertThat(new TrialPlanesPagoConfig(30, "PYME").diasOferta("NEGOCIO_PLUS")).isZero();
    }

    @Test
    @DisplayName("ONVO: trialing con metodo de pago se acepta para NEGOCIO_PLUS igual que para PYME")
    void verificadorAceptaTrialDeNegocioPlus() {
        for (String plan : new String[] {"PYME", "NEGOCIO_PLUS"}) {
            var ok = OnvoBillingVerificador.trialConMetodo(OnvoBillingMediosTest.trialConMetodo(), OnvoBillingMediosTest.SUB,
                "test", p -> plan, (pl, pr) -> new OnvoBillingVerificador.PrecioEsperado("USD", 4900));
            assertThat(ok.aceptado()).as(plan).isTrue();
            assertThat(ok.planNombre()).isEqualTo(plan);
        }
    }

    // ---------------------------------------------------------------- migracion

    @Test
    @DisplayName("V244 es aditiva e idempotente y Actualizado.sql lleva el mismo SQL")
    void migracionV244() throws IOException {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V244__primer_mes_gratis_planes.sql")).lines()
            .filter(l -> !l.trim().startsWith("--")).collect(java.util.stream.Collectors.joining("\n")).toUpperCase();
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS PRIMER_MES_GRATIS_USADO_EN TIMESTAMP");
        assertThat(sql).doesNotContain("DROP ").doesNotContain("DELETE ").doesNotContain("TRUNCATE")
            .doesNotContain("NOT NULL").doesNotContain("UPDATE ");
        assertThat(Files.readString(Path.of("Actualizado.sql")))
            .contains("V244").contains("primer_mes_gratis_usado_en");
    }
}
