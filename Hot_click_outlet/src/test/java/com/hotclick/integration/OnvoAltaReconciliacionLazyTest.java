package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.BillingLedgerRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import com.hotclick.service.suscripcion.OnvoAltaReconciliacion;
import com.hotclick.service.suscripcion.SuscripcionOnvoChangeService;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.hibernate.LazyInitializationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;

/**
 * El alta PYME en REQUIERE_MEMBRESIA vuelve de ONVO y llama reconciliar-pago con la suscripción
 * desacoplada: {@code empresa} es LAZY y la sesión ya cerró. Un mock que pone la empresa a mano
 * no reproduce ese LazyInitializationException.
 * <p>
 * Base H2 propia: este contexto es distinto (espía ONVO) y {@code ddl-auto=create-drop}
 * sobre {@code mem:testdb} tiraba las tablas del resto de la suite al cerrarse.
 */
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:onvoAltaLazy;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;NON_KEYWORDS=VALUE")
@DisplayName("Reconciliar pago inmediato con empresa LAZY fuera de sesión")
class OnvoAltaReconciliacionLazyTest extends BaseIntegrationTest {

    private static final String SUB = "cmwlazyalta01";
    private static final String CUS = "cmwlazycust01";
    private static final String FACTURA = "cmwlazyinv01";
    private static final String PRICE = "price_pyme";
    private static final String INICIO = "2026-11-09T19:45:00.000Z";
    private static final String FIN = "2026-12-09T19:45:00.000Z";

    @Autowired private OnvoAltaReconciliacion reconciliacion;
    @Autowired private SuscripcionOnvoChangeService cambio;
    @Autowired private SuscripcionRepository suscripcionRepo;
    @Autowired private EmpresaRepository empresaRepo;
    @Autowired private PlanRepository planRepo;
    @Autowired private BillingLedgerRepository ledgerRepo;
    @Autowired private PlatformTransactionManager txManager;
    @MockitoSpyBean private OnvoBillingClient onvo;

    private Long empresaId;

    @BeforeEach
    void altaSinConfirmar() {
        Plan plan = planRepo.findByNombre("PYME").orElseGet(this::crearPyme);
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("QA lazy alta");
        empresa.setSlug("qa-lazy-alta-" + System.nanoTime());
        empresa.setCorreoEmpresa("qa-lazy-" + System.nanoTime() + "@hotclick.test");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setEstadoPlan(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);
        empresa.setPlanSaas("PYME");
        empresa.setPlan(plan);
        empresa.setVisibilidadPublica(false);
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepo.saveAndFlush(empresa);
        empresaId = empresa.getId();

        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(empresa);
        sub.setPlan(plan);
        sub.setEstado("TRIAL");
        sub.setOnvoSubscriptionId(SUB);
        sub.setOnvoCustomerId(CUS);
        sub.setFechaInicio(LocalDate.now(Constants.ZONA_CR));
        sub.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        suscripcionRepo.saveAndFlush(sub);
        prepararOnvo();
    }

    @AfterEach
    void limpiar() {
        if (empresaId == null) return;
        jdbcTemplate.update("DELETE FROM hot_click_billing_ledger_tb WHERE fk_id_empresa = ?", empresaId);
        jdbcTemplate.update("DELETE FROM hot_click_suscripcion_tb WHERE fk_id_empresa = ?", empresaId);
        jdbcTemplate.update("DELETE FROM hot_click_empresa_tb WHERE id_empresa = ?", empresaId);
    }

    @Test
    @DisplayName("proxy sin sesión revienta; reconciliar-pago activa una vez y el job y el webhook no duplican el COBRO_OK")
    void empresaLazyFueraDeSesionActivaSinDuplicar() {
        TransactionTemplate tx = new TransactionTemplate(txManager);
        AtomicReference<Suscripcion> suelta = new AtomicReference<>();
        tx.executeWithoutResult(s -> {
            Suscripcion fila = suscripcionRepo.findActivaByEmpresaId(empresaId).orElseThrow();
            assertThat(Hibernate.isInitialized(fila.getEmpresa()))
                .as("findActivaByEmpresaId no inicializa la empresa: es el proxy que veía el 500")
                .isFalse();
            suelta.set(fila);
        });
        assertThatThrownBy(() -> suelta.get().getEmpresa().getEstadoPlan())
            .isInstanceOf(LazyInitializationException.class);

        AtomicReference<Suscripcion> cargada = new AtomicReference<>();
        tx.executeWithoutResult(s -> cargada.set(
            suscripcionRepo.findActivaConEmpresaByEmpresaId(empresaId).orElseThrow()));
        assertThat(Hibernate.isInitialized(cargada.get().getEmpresa())).isTrue();
        assertThat(cargada.get().getEmpresa().getEstadoPlan()).isEqualTo(Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA);

        assertThat(reconciliacion.reconciliarEmpresa(empresaId))
            .isEqualTo(OnvoAltaReconciliacion.Resultado.ACTIVADA);

        Empresa activa = empresaRepo.findById(empresaId).orElseThrow();
        Suscripcion sub = suscripcionRepo.findByOnvoSubscriptionId(SUB).orElseThrow();
        assertThat(activa.getEstadoPlan()).isEqualTo("ACTIVO");
        assertThat(activa.getFechaVencPlan()).isEqualTo(LocalDate.of(2026, 12, 9));
        assertThat(activa.getVisibilidadPublica())
            .as("el cobro confirmado no publica la tienda: la enciende el dueño")
            .isFalse();
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(cobrosOk()).isEqualTo(1);

        assertThat(reconciliacion.reconciliarEmpresa(empresaId))
            .isEqualTo(OnvoAltaReconciliacion.Resultado.IGNORADA);
        reconciliacion.reconciliarPendientes();
        cambio.procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 9), FACTURA);

        assertThat(cobrosOk()).isEqualTo(1);
        assertThat(empresaRepo.findById(empresaId).orElseThrow().getEstadoPlan()).isEqualTo("ACTIVO");
    }

    private long cobrosOk() {
        return ledgerRepo.countByEmpresaIdAndTipo(empresaId, "COBRO_OK");
    }

    private Plan crearPyme() {
        Plan p = new Plan();
        p.setNombre("PYME");
        p.setPrecioMensual(2400);
        p.setPrecioUsd(new BigDecimal("24.00"));
        return planRepo.saveAndFlush(p);
    }

    private void prepararOnvo() {
        lenient().doReturn("test").when(onvo).modoEsperado();
        lenient().doReturn("PYME").when(onvo).planParaPriceId(PRICE);
        lenient().doReturn(false).when(onvo).sinLlave();
        lenient().doReturn(false).when(onvo).isMockMode();
        lenient().doReturn(false).when(onvo).isBillingDeshabilitado();
        lenient().doReturn(PRICE).when(onvo).getPriceIdForPlan("PYME");
        lenient().doReturn(precio()).when(onvo).obtenerPrecio(PRICE);
        lenient().doReturn(suscripcionOnvo()).when(onvo).obtenerSuscripcion(SUB);
        lenient().doReturn(facturaPagada()).when(onvo).obtenerFacturaDelPeriodoActual(org.mockito.ArgumentMatchers.any());
    }

    private static Map<String, Object> precio() {
        Map<String, Object> m = new HashMap<>();
        m.put("id", PRICE);
        m.put("mode", "test");
        m.put("isActive", true);
        m.put("currency", "USD");
        m.put("unitAmount", 2400);
        return m;
    }

    private static Map<String, Object> suscripcionOnvo() {
        Map<String, Object> m = new HashMap<>();
        m.put("id", SUB);
        m.put("mode", "test");
        m.put("status", "active");
        m.put("customerId", CUS);
        m.put("currentPeriodStart", INICIO);
        m.put("currentPeriodEnd", FIN);
        m.put("items", java.util.List.of(Map.of("id", "item_1", "priceId", PRICE)));
        return m;
    }

    private static Map<String, Object> facturaPagada() {
        Map<String, Object> pi = new HashMap<>();
        pi.put("id", "cmwlazypi01");
        pi.put("status", "succeeded");
        pi.put("receivedAmount", 2400);
        Map<String, Object> m = new HashMap<>();
        m.put("id", FACTURA);
        m.put("mode", "test");
        m.put("status", "paid");
        m.put("currency", "USD");
        m.put("total", 2400);
        m.put("subscriptionId", SUB);
        m.put("customerId", CUS);
        m.put("periodStart", INICIO);
        m.put("periodEnd", FIN);
        m.put("paymentIntent", pi);
        return m;
    }
}
