package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.billing.BillingLedgerWriter;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** MEDIO-1 (factura del período actual), MEDIO-2 (trial en Completar pago), MEDIO-3 (reconciliación fail-closed). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OnvoBillingMediosTest {

    static final String SUB = "cmw2p0wx";
    static final String CUS = "cmw2p0ws";
    static final String INICIO = "2026-11-04T22:33:30.285Z";
    static final String FIN = "2026-12-04T22:33:30.285Z";

    static Map<String, Object> subOnvo(String status) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", SUB);
        m.put("mode", "test");
        m.put("status", status);
        m.put("customerId", CUS);
        m.put("currentPeriodStart", INICIO);
        m.put("currentPeriodEnd", FIN);
        m.put("latestInvoiceId", "inv_open_sig"); // ONVO: apunta a la open del período siguiente
        m.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        return m;
    }

    static Map<String, Object> factura(String id, String status, String inicio, String fin) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("mode", "test");
        m.put("status", status);
        m.put("currency", "USD");
        m.put("total", 2400);
        m.put("subscriptionId", SUB);
        m.put("customerId", CUS);
        m.put("periodStart", inicio);
        m.put("periodEnd", fin);
        return m;
    }

    /** Forma real de la evidencia: [open del período siguiente, paid del alta]. */
    static List<Map<?, ?>> listadoEvidencia() {
        return List.of(
            factura("inv_open_sig", "open", FIN, "2027-01-04T22:33:30.285Z"),
            factura("inv_paid_alta", "paid", INICIO, FIN));
    }

    @Nested
    @DisplayName("MEDIO-1 factura del período actual")
    class FacturaPeriodo {
        @Test
        @DisplayName("latestInvoiceId=open del período siguiente: se elige la paid del período actual")
        void eligePaidDelPeriodoActual() {
            Map<?, ?> f = OnvoBillingClient.facturaDelPeriodoActual(listadoEvidencia(), subOnvo("active"));
            assertThat(f.get("id")).isEqualTo("inv_paid_alta");
        }

        @Test
        @DisplayName("solo hay factura del período siguiente: null (no se toma la open por la actual)")
        void sinFacturaDelPeriodo() {
            assertThat(OnvoBillingClient.facturaDelPeriodoActual(
                List.of(factura("inv_open_sig", "open", FIN, "2027-01-04T22:33:30.285Z")), subOnvo("active"))).isNull();
        }

        @Test
        @DisplayName("factura de otra suscripción no cuenta")
        void otraSuscripcion() {
            Map<String, Object> ajena = factura("inv_x", "paid", INICIO, FIN);
            ajena.put("subscriptionId", "otra");
            assertThat(OnvoBillingClient.facturaDelPeriodoActual(List.of(ajena), subOnvo("active"))).isNull();
        }
    }

    // ---------------------------------------------------------------- servicio de cambio (MEDIO-1 y MEDIO-2)

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionPlanSupport planSupport;

    SuscripcionOnvoChangeService service;
    Empresa empresa;
    Plan planEmprendedor;
    Plan planPyme;
    Suscripcion sub;

    @BeforeEach
    void setUp() throws Exception {
        service = new SuscripcionOnvoChangeService(
            suscripcionRepo, empresaRepo, planRepo, onvoBilling, onvoService, planSupport, null);
        set(service, "self", service);
        var env = new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("test");
        set(service, "environment", env);

        empresa = new Empresa();
        empresa.setId(20L);
        empresa.setPlanSaas("EMPRENDEDOR");
        planEmprendedor = new Plan();
        planEmprendedor.setId(1L);
        planEmprendedor.setNombre("EMPRENDEDOR");
        planPyme = new Plan();
        planPyme.setId(2L);
        planPyme.setNombre("PYME");
        empresa.setPlan(planEmprendedor);

        sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(planEmprendedor);
        sub.setOnvoSubscriptionId(SUB);
        sub.setOnvoCustomerId(CUS);
        sub.setOnvoPriceId("price_pyme");
        when(empresaRepo.findById(20L)).thenReturn(Optional.of(empresa));
        when(empresaRepo.findByIdForUpdate(20L)).thenReturn(Optional.of(empresa));
        when(suscripcionRepo.findActivaByEmpresaId(20L)).thenReturn(Optional.of(sub));
        when(suscripcionRepo.findActivasByEmpresaId(20L)).thenReturn(List.of(sub));
        when(suscripcionRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(planRepo.findById(1L)).thenReturn(Optional.of(planEmprendedor));
        when(planRepo.findById(2L)).thenReturn(Optional.of(planPyme));
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(planPyme));
        when(onvoBilling.planParaPriceId("price_pyme")).thenReturn("PYME");
        when(onvoBilling.getPriceIdForPlan("PYME")).thenReturn("price_pyme");
        when(onvoService.getPublishableKey()).thenReturn("pk_test");
    }

    private static void set(Object o, String campo, Object v) throws Exception {
        var f = o.getClass().getDeclaredField(campo);
        f.setAccessible(true);
        f.set(o, v);
    }

    @Test
    @DisplayName("MEDIO-1: Completar pago con la factura del período actual ya paid no vuelve a pedir el pago")
    void completarPago_periodoPagado_noPide() {
        doReturn(subOnvo("incomplete")).when(onvoBilling).obtenerSuscripcion(SUB);
        doReturn(factura("inv_paid_alta", "paid", INICIO, FIN)).when(onvoBilling).obtenerFacturaDelPeriodoActual(any());

        assertThat(service.completarPago(20L).get("status")).isEqualTo("sin_pago_pendiente");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
    }

    @Test
    @DisplayName("MEDIO-2: incomplete sin trial y trial local vigente → se reemplaza por una en trial con los días que quedan")
    void completarPago_conservaTrial() {
        LocalDate hoy = LocalDate.now(com.hotclick.utils.Constants.ZONA_CR);
        empresa.setTrialEmprendedorPos(1);
        empresa.setTrialEmprendedorHasta(hoy.plusDays(90));
        doReturn(subOnvo("incomplete")).when(onvoBilling).obtenerSuscripcion(SUB);
        doReturn(Map.of()).when(onvoBilling).obtenerFacturaDelPeriodoActual(any());
        when(onvoBilling.crearSuscripcionIncompleta(eq(CUS), eq("price_pyme"), anyMap(), eq(90)))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_nueva_trial", "item_2"));

        Map<String, Object> out = service.completarPago(20L);

        assertThat(out.get("status")).isEqualTo("requiere_pago");
        assertThat(out.get("subscriptionId")).isEqualTo("sub_nueva_trial");
        assertThat(out.get("trialDias")).isEqualTo(90);
        verify(onvoBilling).cancelarInmediato(SUB);
        assertThat(sub.getOnvoSubscriptionId()).isEqualTo("sub_nueva_trial");
        // El plan vigente no cambia: lo activa el pago verificado.
        assertThat(empresa.getPlan().getNombre()).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("MEDIO-2: sin trial local, Completar pago abre el cobro de la misma suscripción (sin reemplazo)")
    void completarPago_sinTrialLocal() {
        doReturn(subOnvo("incomplete")).when(onvoBilling).obtenerSuscripcion(SUB);
        doReturn(Map.of()).when(onvoBilling).obtenerFacturaDelPeriodoActual(any());

        Map<String, Object> out = service.completarPago(20L);

        assertThat(out.get("subscriptionId")).isEqualTo(SUB);
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(onvoBilling, never()).cancelarInmediato(any());
    }

    @Test
    @DisplayName("MEDIO-2: el reemplazo desde incomplete a PYME conserva el trial local (antes solo Emprendedor)")
    void diasTrialReemplazo_pymeConservaTrial() {
        LocalDate hoy = LocalDate.now(com.hotclick.utils.Constants.ZONA_CR);
        empresa.setTrialEmprendedorPos(1);
        empresa.setTrialEmprendedorHasta(hoy.plusDays(30));
        assertThat(SuscripcionOnvoChangeService.diasTrialReemplazo(
            empresa, sub, planPyme, "incomplete", subOnvo("incomplete"), java.time.Instant.now())).isEqualTo(30);
    }

    @Test
    @DisplayName("MEDIO-3: webhook + reconcile sobre la misma factura activa una sola vez")
    void webhookMasReconcile_unaVez() throws Exception {
        BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
        AtomicBoolean registrado = new AtomicBoolean(false);
        when(ledger.yaRegistrado(eq("inv_paid_alta"), anyString())).thenAnswer(i -> registrado.get());
        org.mockito.Mockito.doAnswer(i -> { registrado.set(true); return null; })
            .when(ledger).registrar(any(), any(), anyString(), anyString(), eq("inv_paid_alta"), any(), any(), any());
        set(service, "ledgerWriter", ledger);
        var precios = mock(PreciosPlanesConfig.class);
        when(precios.moneda()).thenReturn(Optional.of("usd"));
        set(service, "preciosPlanes", precios);
        when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));
        LocalDate fin = LocalDate.of(2026, 12, 4);

        service.procesarPagoOnvoVerificado(SUB, "PYME", fin, "inv_paid_alta"); // webhook
        service.procesarPagoOnvoVerificado(SUB, "PYME", fin, "inv_paid_alta"); // reconcile

        verify(ledger, times(1)).registrar(any(), any(), anyString(), anyString(), eq("inv_paid_alta"), any(), any(), any());
        verify(empresaRepo, times(1)).save(empresa);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
    }

    @Test
    @DisplayName("plan-pendiente: trialing con método de pago → fecha del primer cobro = fin del trial (hora CR)")
    void primerCobro_trialConMetodo() {
        Map<String, Object> enOnvo = subOnvo("trialing");
        enOnvo.put("paymentMethodId", "pm_1");
        enOnvo.put("trialEnd", "2027-02-02T05:59:00.000Z"); // 2027-02-01 23:59 en Costa Rica
        doReturn(enOnvo).when(onvoBilling).obtenerSuscripcion(SUB);

        assertThat(service.primerCobroTrialConMetodo(20L)).contains(LocalDate.of(2027, 2, 1));
    }

    @Test
    @DisplayName("plan-pendiente: trialing sin método, incomplete u ONVO caído → sin fecha (sigue «falta el pago»)")
    void primerCobro_sinMetodoOFalla() {
        doReturn(subOnvo("trialing")).when(onvoBilling).obtenerSuscripcion(SUB);
        assertThat(service.primerCobroTrialConMetodo(20L)).isEmpty();

        Map<String, Object> incompleta = subOnvo("incomplete");
        incompleta.put("paymentMethodId", "pm_1");
        doReturn(incompleta).when(onvoBilling).obtenerSuscripcion(SUB);
        assertThat(service.primerCobroTrialConMetodo(20L)).isEmpty();

        when(onvoBilling.obtenerSuscripcion(SUB)).thenThrow(new org.springframework.web.client.ResourceAccessException("caído"));
        assertThat(service.primerCobroTrialConMetodo(20L)).isEmpty();
    }

    @Test
    @DisplayName("plan-pendiente: sin trialEnd usa currentPeriodEnd")
    void primerCobro_fallbackPeriodo() {
        Map<String, Object> enOnvo = subOnvo("trialing");
        enOnvo.put("paymentMethodId", "pm_1");
        assertThat(SuscripcionOnvoChangeService.primerCobroTrial(enOnvo)).contains(LocalDate.of(2026, 12, 4));
    }

    // ---------------------------------------------------------------- reconciliación (MEDIO-3)

    @Nested
    @DisplayName("MEDIO-3 reconciliación fail-closed")
    class Reconciliacion {
        SuscripcionOnvoChangeService cambio = mock(SuscripcionOnvoChangeService.class);
        OnvoBillingClient onvo = mock(OnvoBillingClient.class);
        OnvoAltaReconciliacion rec;
        Suscripcion local;

        @BeforeEach
        void init() {
            when(onvo.modoEsperado()).thenReturn("test");
            when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
            Map<String, Object> precio = new HashMap<>(Map.of("id", "price_pyme", "mode", "test", "isActive", true,
                "currency", "USD", "unitAmount", 2400L));
            doReturn(precio).when(onvo).obtenerPrecio("price_pyme");
            rec = new OnvoAltaReconciliacion(onvo, suscripcionRepo, cambio,
                new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), onvo));
            local = new Suscripcion();
            local.setEmpresa(empresa);
            local.setOnvoSubscriptionId(SUB);
            local.setOnvoCustomerId(CUS);
            local.setPlanPendiente(planPyme);
        }

        @Test
        @DisplayName("ONVO active + factura del período paid → activa por procesarPagoOnvoVerificado")
        void confirmado_activa() {
            doReturn(subOnvo("active")).when(onvo).obtenerSuscripcion(SUB);
            doReturn(factura("inv_paid_alta", "paid", INICIO, FIN)).when(onvo).obtenerFacturaDelPeriodoActual(any());

            assertThat(rec.reconciliar(local)).isEqualTo(OnvoAltaReconciliacion.Resultado.ACTIVADA);
            verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 4), "inv_paid_alta");
        }

        @Test
        @DisplayName("#535: con subida pendiente reconcilia la NUEVA (no la vieja) por procesarPagoOnvoVerificado")
        void subidaPendiente_reconciliaLaNueva() {
            local.setOnvoSubscriptionId("cmw2vieja");
            local.setOnvoSubNuevaPendiente(SUB);
            doReturn(subOnvo("active")).when(onvo).obtenerSuscripcion(SUB);
            doReturn(factura("inv_paid_sub", "paid", INICIO, FIN)).when(onvo).obtenerFacturaDelPeriodoActual(any());

            assertThat(rec.reconciliar(local)).isEqualTo(OnvoAltaReconciliacion.Resultado.ACTIVADA);
            verify(onvo, never()).obtenerSuscripcion("cmw2vieja");
            verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 4), "inv_paid_sub");
        }

        @Test
        @DisplayName("sin confirmación (incomplete o factura open) no cambia nada")
        void sinConfirmacion_noCambia() {
            doReturn(subOnvo("incomplete")).when(onvo).obtenerSuscripcion(SUB);
            assertThat(rec.reconciliar(local)).isEqualTo(OnvoAltaReconciliacion.Resultado.SIN_CONFIRMAR);

            doReturn(subOnvo("active")).when(onvo).obtenerSuscripcion(SUB);
            doReturn(factura("inv_x", "open", INICIO, FIN)).when(onvo).obtenerFacturaDelPeriodoActual(any());
            assertThat(rec.reconciliar(local)).isEqualTo(OnvoAltaReconciliacion.Resultado.SIN_CONFIRMAR);

            verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        }

        @Test
        @DisplayName("ONVO falla → no cambia nada")
        void onvoFalla_noCambia() {
            when(onvo.obtenerSuscripcion(SUB)).thenThrow(new org.springframework.web.client.ResourceAccessException("caído"));
            assertThat(rec.reconciliar(local)).isEqualTo(OnvoAltaReconciliacion.Resultado.ONVO_NO_DISPONIBLE);
            verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        }

        @Test
        @DisplayName("reemplazada / con onvo_sub_por_cancelar o sin plan pendiente → se ignora sin llamar a ONVO")
        void ignoradas() {
            local.setOnvoSubPorCancelar("sub_vieja");
            assertThat(rec.reconciliar(local)).isEqualTo(OnvoAltaReconciliacion.Resultado.IGNORADA);
            local.setOnvoSubPorCancelar(null);
            local.setPlanPendiente(null);
            assertThat(rec.reconciliar(local)).isEqualTo(OnvoAltaReconciliacion.Resultado.IGNORADA);
            verify(onvo, never()).obtenerSuscripcion(any());
        }

        @Test
        @DisplayName("job: consulta solo pendientes recientes con límite")
        void jobAcotado() {
            when(suscripcionRepo.findOnvoPendientesRecientes(any(), any())).thenReturn(List.of(local));
            doReturn(subOnvo("incomplete")).when(onvo).obtenerSuscripcion(SUB);
            rec.reconciliarPendientes();
            verify(suscripcionRepo).findOnvoPendientesRecientes(any(),
                org.mockito.ArgumentMatchers.argThat(p -> p.getPageSize() == 50));
            verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        }
    }

    // ---------------------------------------------------------------- QA #536: trial con método de pago activa el plan

    static Map<String, Object> trialConMetodo() {
        Map<String, Object> m = subOnvo("trialing");
        m.put("paymentMethodId", "pm_1");
        m.put("trialEnd", "2027-02-03T03:25:59.064Z"); // 2027-02-02 en Costa Rica
        return m;
    }

    @Nested
    @DisplayName("QA #536: trialing + método de pago → plan activo hasta el fin del trial, una sola vez")
    class TrialActivacion {
        OnvoBillingClient onvo = mock(OnvoBillingClient.class);
        BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
        com.hotclick.service.SuscripcionService suscripcionService = mock(com.hotclick.service.SuscripcionService.class);
        com.hotclick.repository.StripeEventoRepository eventoRepo = mock(com.hotclick.repository.StripeEventoRepository.class);
        Map<String, com.hotclick.model.StripeEvento> eventos = new HashMap<>();
        AtomicBoolean activado = new AtomicBoolean(false);
        OnvoAltaReconciliacion rec;
        OnvoBillingWebhookHandler handler;
        final LocalDate finTrial = LocalDate.of(2027, 2, 2);

        @BeforeEach
        void init() throws Exception {
            when(onvo.modoEsperado()).thenReturn("test");
            when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
            doReturn(new HashMap<>(Map.of("id", "price_pyme", "mode", "test", "isActive", true,
                "currency", "USD", "unitAmount", 2400L))).when(onvo).obtenerPrecio("price_pyme");
            when(ledger.yaRegistrado(eq(SUB), eq("PLAN_ACTIVADO"))).thenAnswer(i -> activado.get());
            org.mockito.Mockito.doAnswer(i -> { activado.set(true); return null; })
                .when(ledger).registrar(any(), any(), eq("PLAN_ACTIVADO"), anyString(), eq(SUB), any(), any(), any());
            set(service, "ledgerWriter", ledger);
            var precios = mock(PreciosPlanesConfig.class);
            when(precios.moneda()).thenReturn(Optional.of("usd"));
            set(service, "preciosPlanes", precios);
            sub.setPlanPendiente(planPyme);
            sub.setEstado("TRIAL");
            when(suscripcionRepo.findByOnvoSubscriptionIdForUpdate(SUB)).thenReturn(Optional.of(sub));
            when(suscripcionRepo.findByOnvoSubscriptionId(SUB)).thenReturn(Optional.of(sub));
            when(suscripcionRepo.existsByOnvoSubscriptionId(SUB)).thenReturn(true);
            // El webhook y la reconciliación llegan al MISMO servicio real.
            when(suscripcionService.procesarTrialOnvoVerificado(anyString(), anyString(), any()))
                .thenAnswer(i -> service.procesarTrialOnvoVerificado(i.getArgument(0), i.getArgument(1), i.getArgument(2)));
            rec = new OnvoAltaReconciliacion(onvo, suscripcionRepo, service,
                new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), onvo));
            when(eventoRepo.findByIdForUpdate(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
            when(eventoRepo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(eventos.get((String) i.getArgument(0))));
            when(eventoRepo.save(any())).thenAnswer(i -> { var e = (com.hotclick.model.StripeEvento) i.getArgument(0); eventos.put(e.getStripeEventId(), e); return e; });
            handler = new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, onvo,
                new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), onvo), suscripcionRepo);
            doReturn(factura("inv_trial_0", "paid", INICIO, FIN)).when(onvo).obtenerRenovacion("inv_trial_0");
        }

        com.fasterxml.jackson.databind.JsonNode evento() throws Exception {
            return new com.fasterxml.jackson.databind.ObjectMapper().readTree(
                "{\"id\":\"inv_trial_0\",\"subscriptionId\":\"" + SUB + "\"}");
        }

        @Test
        @DisplayName("verificador: trialing+método acepta con fin del trial; sin método, otro modo u otro id rechaza")
        void verificador() {
            var ok = OnvoBillingVerificador.trialConMetodo(trialConMetodo(), SUB, "test",
                p -> "PYME", (pl, pr) -> new OnvoBillingVerificador.PrecioEsperado("USD", 2400));
            assertThat(ok.aceptado()).isTrue();
            assertThat(ok.planNombre()).isEqualTo("PYME");
            assertThat(ok.fechaFin()).isEqualTo(finTrial);
            assertThat(OnvoBillingVerificador.trialConMetodo(subOnvo("trialing"), SUB, "test", p -> "PYME",
                (pl, pr) -> new OnvoBillingVerificador.PrecioEsperado("USD", 2400)).motivo()).isEqualTo("sin_metodo_pago");
            assertThat(OnvoBillingVerificador.trialConMetodo(trialConMetodo(), SUB, "live", p -> "PYME",
                (pl, pr) -> new OnvoBillingVerificador.PrecioEsperado("USD", 2400)).motivo()).isEqualTo("modo");
            assertThat(OnvoBillingVerificador.trialConMetodo(trialConMetodo(), "otra", "test", p -> "PYME",
                (pl, pr) -> new OnvoBillingVerificador.PrecioEsperado("USD", 2400)).motivo()).isEqualTo("id");
            assertThat(OnvoBillingVerificador.trialConMetodo(trialConMetodo(), SUB, "test", p -> null,
                (pl, pr) -> null).motivo()).isEqualTo("price_desconocido");
        }

        @Test
        @DisplayName("reconciliación: trialing+método activa el plan elegido con fecha_fin = fin del trial")
        void reconciliacion_activa() {
            doReturn(trialConMetodo()).when(onvo).obtenerSuscripcion(SUB);
            assertThat(rec.reconciliar(sub)).isEqualTo(OnvoAltaReconciliacion.Resultado.ACTIVADA);
            assertThat(sub.getEstado()).isEqualTo("ACTIVO");
            assertThat(sub.getPlan().getNombre()).isEqualTo("PYME");
            assertThat(sub.getPlanPendiente()).isNull();
            assertThat(sub.getFechaFin()).isEqualTo(finTrial);
            assertThat(sub.getTrialEnd()).isEqualTo(finTrial);
            assertThat(empresa.getEstadoPlan()).isEqualTo("ACTIVO");
            assertThat(empresa.getPlanSaas()).isEqualTo("PYME");
            assertThat(empresa.getFechaVencPlan()).isEqualTo(finTrial);
            verify(onvo, never()).obtenerFacturaDelPeriodoActual(any()); // el trial no exige factura pagada
        }

        @Test
        @DisplayName("reconciliación: trialing SIN método no activa")
        void reconciliacion_sinMetodo() {
            doReturn(subOnvo("trialing")).when(onvo).obtenerSuscripcion(SUB);
            assertThat(rec.reconciliar(sub)).isEqualTo(OnvoAltaReconciliacion.Resultado.SIN_CONFIRMAR);
            assertThat(sub.getPlanPendiente()).isEqualTo(planPyme);
            verify(empresaRepo, never()).save(any());
        }

        @Test
        @DisplayName("webhook: payment_succeeded de la factura $0 con sub trialing+método activa (2xx)")
        void webhook_activa() throws Exception {
            doReturn(trialConMetodo()).when(onvo).obtenerSuscripcion(SUB);
            assertThat(handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_a")).isTrue();
            assertThat(eventos.get("onvo_evt_a").getProcesadoOk()).isTrue();
            assertThat(sub.getEstado()).isEqualTo("ACTIVO");
            assertThat(sub.getFechaFin()).isEqualTo(finTrial);
            verify(suscripcionService, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        }

        @Test
        @DisplayName("doble evento distinto (evt_a, evt_b) activa una sola vez")
        void dobleEvento_unaVez() throws Exception {
            doReturn(trialConMetodo()).when(onvo).obtenerSuscripcion(SUB);
            handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_a");
            handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_b");
            handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_b"); // reintento del mismo
            verify(ledger, times(1)).registrar(any(), any(), eq("PLAN_ACTIVADO"), anyString(), eq(SUB), any(), any(), any());
            verify(empresaRepo, times(1)).save(empresa);
        }

        @Test
        @DisplayName("webhook + reconciliación (en cualquier orden) activa una sola vez")
        void webhookMasReconciliacion_unaVez() throws Exception {
            doReturn(trialConMetodo()).when(onvo).obtenerSuscripcion(SUB);
            handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_a");
            sub.setPlanPendiente(planPyme); // aunque la fila volviera a tener pendiente, el ledger corta
            rec.reconciliar(sub);
            verify(ledger, times(1)).registrar(any(), any(), eq("PLAN_ACTIVADO"), anyString(), eq(SUB), any(), any(), any());
            verify(empresaRepo, times(1)).save(empresa);
        }

        @Test
        @DisplayName("webhook: trialing SIN método → 2xx, pendiente:sin_metodo_pago, no activa")
        void webhook_sinMetodo_pendiente() throws Exception {
            doReturn(subOnvo("trialing")).when(onvo).obtenerSuscripcion(SUB);
            assertThat(handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_c")).isTrue();
            assertThat(eventos.get("onvo_evt_c").getError()).isEqualTo("pendiente:sin_metodo_pago");
            assertThat(eventos.get("onvo_evt_c").getProcesadoOk()).isFalse();
            verify(empresaRepo, never()).save(any());
        }

        @Test
        @DisplayName("webhook: sub incomplete (sub_no_activa) → 2xx pendiente; sub sin fila local → 2xx rechazo")
        void webhook_rechazosDeNegocio_2xx() throws Exception {
            doReturn(subOnvo("incomplete")).when(onvo).obtenerSuscripcion(SUB);
            assertThat(handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_d")).isTrue();
            assertThat(eventos.get("onvo_evt_d").getError()).isEqualTo("pendiente:sub_no_activa");

            doReturn(trialConMetodo()).when(onvo).obtenerSuscripcion(SUB);
            when(suscripcionRepo.existsByOnvoSubscriptionId(SUB)).thenReturn(false);
            assertThat(handler.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_e")).isTrue();
            assertThat(eventos.get("onvo_evt_e").getError()).isEqualTo("rechazo:sub_desconocida");
            verify(empresaRepo, never()).save(any());
        }

        @Test
        @DisplayName("webhook: configuración faltante (error nuestro) sigue lanzando → 5xx")
        void webhook_configFaltante_5xx() throws Exception {
            doReturn(trialConMetodo()).when(onvo).obtenerSuscripcion(SUB);
            OnvoBillingWebhookHandler sinConfig = new OnvoBillingWebhookHandler(eventoRepo, suscripcionService, onvo,
                new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", null), onvo), suscripcionRepo);
            org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> sinConfig.manejarSiBilling("subscription.payment_succeeded", evento(), "evt_f"))
                .isInstanceOf(OnvoBillingWebhookHandler.EventoBillingRechazado.class);
            assertThat(eventos.get("onvo_evt_f").getError()).isEqualTo("rechazo:config_faltante");
        }

        @Test
        @DisplayName("completar-pago: trial SIN método con factura $0 paid → requiere_pago (abre el SDK), nunca sin_pago_pendiente")
        void completarPago_trialSinMetodo_abreSdk() {
            doReturn(subOnvo("trialing")).when(onvoBilling).obtenerSuscripcion(SUB);
            doReturn(factura("inv_trial_0", "paid", INICIO, FIN)).when(onvoBilling).obtenerFacturaDelPeriodoActual(any());
            Map<String, Object> out = service.completarPago(20L);
            assertThat(out.get("status")).isEqualTo("requiere_pago");
            assertThat(out.get("subscriptionId")).isEqualTo(SUB);
            verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        }

        @Test
        @DisplayName("completar-pago: trial CON método → sin_pago_pendiente")
        void completarPago_trialConMetodo_nada() {
            doReturn(trialConMetodo()).when(onvoBilling).obtenerSuscripcion(SUB);
            assertThat(service.completarPago(20L).get("status")).isEqualTo("sin_pago_pendiente");
        }
    }
}
