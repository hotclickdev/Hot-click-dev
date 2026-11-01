package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * M1 (Seguridad #422): el alta ONVO es única por negocio. Con repositorios en memoria que se comportan como la BD
 * (lo que guarda una llamada lo ve la siguiente, que es lo que garantiza el lock de fila en producción) se simula el
 * reintento / doble POST y se comprueba que ONVO recibe UNA sola creación, que nunca se pisa un id existente y que una
 * suscripción creada que no se pudo guardar se cancela (no queda huérfana).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("M1: alta ONVO única por negocio (lock, reintento y huérfanas)")
class SuscripcionOnvoAltaUnicaTest {

    @Mock SuscripcionRepository suscripcionRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    @Mock OnvoBillingClient onvoBilling;
    @Mock OnvoService onvoService;
    @Mock SuscripcionPlanSupport planSupport;

    SuscripcionOnvoChangeService service;
    Empresa empresa;
    /** "Tabla" de suscripciones del negocio 10. */
    final List<Suscripcion> tabla = new ArrayList<>();

    @BeforeEach
    void setUp() {
        service = new SuscripcionOnvoChangeService(
            suscripcionRepo, empresaRepo, planRepo, onvoBilling, onvoService, planSupport, null);
        ReflectionTestUtils.setField(service, "self", service);
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");
        ReflectionTestUtils.setField(service, "environment", env);

        Plan plan = new Plan();
        plan.setId(1L);
        plan.setNombre("EMPRENDEDOR");
        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombreEmpresa("Demo");
        empresa.setCorreoEmpresa("demo@negocio.cr");
        empresa.setPlanSaas("EMPRENDEDOR");
        empresa.setPlan(plan);
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_TRIAL);
        LocalDate fin = LocalDate.now(Constants.ZONA_CR).plusDays(40);
        empresa.setTrialEmprendedorPos(4);
        empresa.setTrialEmprendedorHasta(fin);
        empresa.setTrialHasta(fin);

        lenient().when(planRepo.findByNombre("EMPRENDEDOR")).thenReturn(Optional.of(plan));
        lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        lenient().when(empresaRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(empresa));
        lenient().when(suscripcionRepo.findActivasByEmpresaId(10L)).thenAnswer(inv -> new ArrayList<>(tabla));
        lenient().when(suscripcionRepo.save(any())).thenAnswer(inv -> {
            Suscripcion s = inv.getArgument(0);
            if (!tabla.contains(s)) tabla.add(s);
            return s;
        });
        lenient().when(onvoBilling.getPriceIdForPlan("EMPRENDEDOR")).thenReturn("price_emprendedor");
        lenient().when(onvoBilling.crearCustomer(any(), any(), anyMap()))
            .thenReturn(new OnvoBillingClient.OnvoCustomer("cus_1"));
        lenient().when(onvoService.getPublishableKey()).thenReturn("pk_test");
    }

    @Test
    @DisplayName("Reintento / doble POST: la segunda llamada reutiliza el id guardado y ONVO recibe una sola creación")
    void reintentoNoCreaSegundaSuscripcion() {
        when(onvoBilling.crearSuscripcionIncompleta(eq("cus_1"), eq("price_emprendedor"), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_1", "item_1"));

        var a = service.asegurarSuscripcionTrial(10L);
        var b = service.asegurarSuscripcionTrial(10L);
        var c = service.asegurarSuscripcionTrial(10L);

        assertThat(a.subscriptionId()).isEqualTo("sub_1");
        assertThat(b.subscriptionId()).isEqualTo("sub_1");
        assertThat(c.subscriptionId()).isEqualTo("sub_1");
        verify(onvoBilling, times(1)).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(onvoBilling, times(1)).crearCustomer(any(), any(), anyMap());
        assertThat(tabla).hasSize(1);
        verify(empresaRepo, times(1)).findByIdForUpdate(10L);
    }

    @Test
    @DisplayName("Carrera perdida: si al tomar el lock otra llamada ya guardó su suscripción, se reutiliza sin crear suscripción en ONVO")
    void despuesDelLockSeVuelveALeer() {
        Suscripcion ganadora = new Suscripcion();
        ganadora.setOnvoSubscriptionId("sub_ganadora");
        ganadora.setOnvoCustomerId("cus_g");
        ganadora.setOnvoPriceId("price_emprendedor");
        // Antes del lock el negocio no tiene suscripción; cuando se obtiene el lock, la otra llamada ya la guardó.
        when(empresaRepo.findByIdForUpdate(10L)).thenAnswer(inv -> {
            tabla.add(ganadora);
            return Optional.of(empresa);
        });

        var out = service.asegurarSuscripcionTrial(10L);

        assertThat(out.subscriptionId()).isEqualTo("sub_ganadora");
        // El customer se crea antes del lock (MEDIUM-1): puede sobrar uno en una carrera, pero no cobra nada.
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("Nunca se pisa un onvoSubscriptionId existente (ni con otro precio): no se crea nada en ONVO")
    void noPisaIdExistente() {
        Suscripcion existente = new Suscripcion();
        existente.setOnvoSubscriptionId("sub_vieja");
        existente.setOnvoPriceId("price_pyme");
        tabla.add(existente);

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        assertThat(existente.getOnvoSubscriptionId()).isEqualTo("sub_vieja");
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(suscripcionRepo, never()).save(any());
    }

    @Test
    @DisplayName("Huérfana: si lo creado en ONVO no se puede guardar, se cancela de inmediato y el error sube")
    void huerfanaSeCancela() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_huerfana", "item_1"));
        doThrow(new IllegalStateException("fallo de BD")).when(suscripcionRepo).save(any());

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        verify(onvoBilling).cancelarInmediato("sub_huerfana");
        assertThat(tabla).isEmpty();
    }

    @Test
    @DisplayName("Huérfana: si además falla la cancelación, el error original es el que sube (queda alerta en el log)")
    void huerfanaConCancelacionFallidaConservaElError() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_huerfana", "item_1"));
        doThrow(new IllegalStateException("fallo de BD")).when(suscripcionRepo).save(any());
        doThrow(new IllegalArgumentException("ONVO caído")).when(onvoBilling).cancelarInmediato(anyString());

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("fallo de BD");

        verify(onvoBilling).cancelarInmediato("sub_huerfana");
    }

    @Test
    @DisplayName("Si ONVO falla al crear no hay nada que cancelar ni se guarda nada")
    void falloAlCrearNoCancelaNada() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenThrow(new IllegalStateException("ONVO no disponible"));

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(suscripcionRepo, never()).save(any());
    }

    // ── MEDIUM-1: el customer se crea fuera del lock y el lock tiene tope de espera ───────────────────────────────

    @Test
    @DisplayName("MEDIUM-1: crearCustomer ocurre ANTES de tomar el lock del negocio (el lock no espera por ese POST)")
    void customerSeCreaAntesDelLock() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_1", "item_1"));

        service.asegurarSuscripcionTrial(10L);

        var orden = org.mockito.Mockito.inOrder(onvoBilling, empresaRepo);
        orden.verify(onvoBilling).crearCustomer(any(), any(), anyMap());
        orden.verify(empresaRepo).findByIdForUpdate(10L);
        orden.verify(onvoBilling).crearSuscripcionIncompleta(eq("cus_1"), any(), anyMap(), anyInt());
        assertThat(tabla.get(0).getOnvoCustomerId()).isEqualTo("cus_1");
    }

    @Test
    @DisplayName("MEDIUM-1: se aplica el tope de espera del lock (LockTimeoutPorFila) antes de findByIdForUpdate")
    void topeDeLockSeAplicaAntes() {
        LockTimeoutPorFila topes = org.mockito.Mockito.mock(LockTimeoutPorFila.class);
        ReflectionTestUtils.setField(service, "lockTimeout", topes);
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_1", "item_1"));

        service.asegurarSuscripcionTrial(10L);

        var orden = org.mockito.Mockito.inOrder(topes, empresaRepo);
        orden.verify(topes).aplicar();
        orden.verify(empresaRepo).findByIdForUpdate(10L);
    }

    @Test
    @DisplayName("MEDIUM-1: si el lock excede el tope se responde AltaOnvoEnCursoException (409, texto fijo) y no se toca ONVO")
    void lockTimeoutSeMapeaA409SinTocarOnvo() {
        for (RuntimeException causa : List.<RuntimeException>of(
            new org.springframework.dao.CannotAcquireLockException("lock detalle-interno-Z"),
            new org.springframework.dao.PessimisticLockingFailureException("lock detalle-interno-Z"),
            new jakarta.persistence.LockTimeoutException("lock detalle-interno-Z"),
            new jakarta.persistence.PessimisticLockException("lock detalle-interno-Z"))) {
            tabla.clear();
            org.mockito.Mockito.reset(empresaRepo);
            doThrow(causa).when(empresaRepo).findByIdForUpdate(10L);
            lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));

            assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L))
                .isInstanceOf(com.hotclick.exception.AltaOnvoEnCursoException.class)
                .hasMessage(com.hotclick.exception.AltaOnvoEnCursoException.MENSAJE)
                .hasNoCause();
        }
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt());
        verify(onvoBilling, never()).crearSuscripcionIncompleta(any(), any(), anyMap());
        verify(onvoBilling, never()).cancelarInmediato(any());
        verify(suscripcionRepo, never()).save(any());
        assertThat(tabla).isEmpty();
    }

    // ── L1: no cancelar una suscripción que sí quedó guardada ────────────────────────────────────────────────────

    @Test
    @DisplayName("L1: si la suscripción creada resulta estar guardada, NO se cancela en ONVO")
    void noCancelaSiQuedoGuardada() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_guardada", "item_1"));
        doThrow(new IllegalStateException("fallo tras guardar")).when(suscripcionRepo).save(any());
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_guardada")).thenReturn(Optional.of(new Suscripcion()));

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        verify(suscripcionRepo).findByOnvoSubscriptionId("sub_guardada");
        verify(onvoBilling, never()).cancelarInmediato(any());
    }

    @Test
    @DisplayName("L1: si no se puede verificar si quedó guardada, NO se cancela (alerta a revisión manual)")
    void noCancelaSiNoSePuedeVerificar() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_dudosa", "item_1"));
        doThrow(new IllegalStateException("fallo de BD")).when(suscripcionRepo).save(any());
        when(suscripcionRepo.findByOnvoSubscriptionId("sub_dudosa")).thenThrow(new IllegalStateException("BD caída"));

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("fallo de BD");

        verify(onvoBilling, never()).cancelarInmediato(any());
    }

    @Test
    @DisplayName("L1: la verificación corre en una transacción NUEVA (REQUIRES_NEW) y de solo lectura")
    void verificacionEnTransaccionNueva() {
        org.springframework.transaction.PlatformTransactionManager manager =
            org.mockito.Mockito.mock(org.springframework.transaction.PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenReturn(new org.springframework.transaction.support.SimpleTransactionStatus());
        ReflectionTestUtils.setField(service, "tx", new org.springframework.transaction.support.TransactionTemplate(manager));
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenReturn(new OnvoBillingClient.OnvoSubscription("sub_huerfana", "item_1"));
        doThrow(new IllegalStateException("fallo de BD")).when(suscripcionRepo).save(any());

        assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class);

        var defs = org.mockito.ArgumentCaptor.forClass(org.springframework.transaction.TransactionDefinition.class);
        verify(manager, times(2)).getTransaction(defs.capture());
        assertThat(defs.getAllValues().get(0).getPropagationBehavior())
            .isEqualTo(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRED);
        assertThat(defs.getAllValues().get(1).getPropagationBehavior())
            .isEqualTo(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        assertThat(defs.getAllValues().get(1).isReadOnly()).isTrue();
        verify(onvoBilling).cancelarInmediato("sub_huerfana");
    }

    // ── L2: alerta con empresa_id si POST /subscriptions no responde ─────────────────────────────────────────────

    private List<String> capturarLog(Runnable accion) {
        ch.qos.logback.classic.Logger logger =
            (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(SuscripcionOnvoChangeService.class);
        ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent> appender =
            new ch.qos.logback.core.read.ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            accion.run();
        } finally {
            logger.detachAppender(appender);
        }
        return appender.list.stream().map(ch.qos.logback.classic.spi.ILoggingEvent::getFormattedMessage).toList();
    }

    @Test
    @DisplayName("L2: ResourceAccessException al crear la suscripción emite [ALERTA-PAGO] con empresa_id (y sube el error)")
    void timeoutAlCrearEmiteAlertaConEmpresaId() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("Read timed out"));

        List<String> logs = capturarLog(() ->
            assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L))
                .isInstanceOf(org.springframework.web.client.ResourceAccessException.class));

        assertThat(logs).anySatisfy(m -> assertThat(m).contains("[ALERTA-PAGO]").contains("empresa_id=10")
            .contains("ResourceAccessException").doesNotContain("Read timed out"));
        verify(onvoBilling, never()).cancelarInmediato(any());
    }

    @Test
    @DisplayName("L2: también si el breaker de ONVO la envolvió (causa ResourceAccessException)")
    void timeoutEnvueltoTambienAlerta() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenThrow(new IllegalStateException("Servicio de pagos no disponible temporalmente",
                new org.springframework.web.client.ResourceAccessException("Read timed out")));

        List<String> logs = capturarLog(() ->
            assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalStateException.class));

        assertThat(logs).anySatisfy(m -> assertThat(m).contains("[ALERTA-PAGO]").contains("empresa_id=10"));
    }

    @Test
    @DisplayName("L2: un error que no es de red (p. ej. 400 de ONVO) no emite la alerta de suscripción sin respuesta")
    void errorQueNoEsDeRedNoAlerta() {
        when(onvoBilling.crearSuscripcionIncompleta(any(), any(), anyMap(), anyInt()))
            .thenThrow(new IllegalArgumentException("precio inválido"));

        List<String> logs = capturarLog(() ->
            assertThatThrownBy(() -> service.asegurarSuscripcionTrial(10L)).isInstanceOf(IllegalArgumentException.class));

        assertThat(logs).noneSatisfy(m -> assertThat(m).contains("sin respuesta de ONVO"));
    }
}
