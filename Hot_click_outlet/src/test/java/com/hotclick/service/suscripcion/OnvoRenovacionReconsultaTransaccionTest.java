package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * M2 con un gestor de transacciones real (JDBC sobre H2): la corrida nocturna es una transacción externa que llama a
 * la reconsulta fila por fila. Una fila que falla no puede revertir a las demás ni marcar la externa rollback-only.
 */
@DisplayName("A5-01 M2 (integración): REQUIRES_NEW con transacciones reales")
class OnvoRenovacionReconsultaTransaccionTest {

    private static final LocalDate HOY = LocalDate.of(2026, 10, 28);

    private DriverManagerDataSource ds;
    private JdbcTemplate jdbc;
    private DataSourceTransactionManager tm;
    private OnvoBillingClient onvo;
    private SuscripcionOnvoChangeService cambio;
    private OnvoRenovacionReconsulta reconsulta;

    @BeforeEach
    void setUp() {
        ds = new DriverManagerDataSource("jdbc:h2:mem:m2it" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("CREATE TABLE corrida(clave VARCHAR(40) PRIMARY KEY, valor VARCHAR(40))");
        tm = new DataSourceTransactionManager(ds);
        onvo = mock(OnvoBillingClient.class);
        cambio = mock(SuscripcionOnvoChangeService.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        reconsulta = new OnvoRenovacionReconsulta(onvo, planRepo, cambio, tm, mock(LockTimeoutPorFila.class),
            new OnvoReconsultaConfig(8, 7, 5, 0),
            new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), onvo));
        Map<String, Object> price = new HashMap<>();
        price.put("id", "price_pyme");
        price.put("mode", "live");
        price.put("isActive", true);
        price.put("currency", "USD");
        price.put("unitAmount", 2_400L);
        doReturn(price).when(onvo).obtenerPrecio("price_pyme");
    }

    @AfterEach
    void limpiar() {
        jdbc.execute("DROP ALL OBJECTS");
    }

    private Suscripcion fila(String subId) {
        Suscripcion s = new Suscripcion();
        Empresa e = new Empresa();
        e.setId(7L);
        s.setEmpresa(e);
        s.setOnvoSubscriptionId(subId);
        s.setEstado("PAST_DUE");
        return s;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void onvoPagada(String subId, String facturaId) {
        Map<String, Object> sub = new HashMap<>();
        sub.put("id", subId);
        sub.put("status", "active");
        sub.put("mode", "live");
        sub.put("customerId", "cus_1");
        sub.put("latestInvoiceId", facturaId);
        sub.put("currentPeriodEnd", "2026-12-01T06:00:00.000Z");
        sub.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        Map<String, Object> factura = new HashMap<>();
        factura.put("id", facturaId);
        factura.put("subscriptionId", subId);
        factura.put("customerId", "cus_1");
        factura.put("status", "paid");
        factura.put("mode", "live");
        factura.put("currency", "USD");
        factura.put("total", 2_400L);
        factura.put("periodEnd", "2026-12-01T06:00:00.000Z");
        when(onvo.obtenerSuscripcion(subId)).thenReturn((Map) sub);
        when(onvo.obtenerRenovacion(facturaId)).thenReturn((Map) factura);
    }

    /** Lo que haría la reactivación: escribir en la base dentro de SU transacción; la fila "falla" lanza después de escribir. */
    private void reactivacionEscribe(String subId, boolean falla) {
        doAnswer(inv -> {
            jdbc.update("INSERT INTO corrida(clave, valor) VALUES (?, 'reactivada')", subId);
            if (falla) throw new IllegalStateException("falla de la fila " + subId);
            return null;
        }).when(cambio).procesarPagoOnvoVerificado(eq(subId), any(), any(), any());
    }

    private List<String> filas() {
        return jdbc.queryForList("SELECT clave FROM corrida ORDER BY clave", String.class);
    }

    @Test
    @DisplayName("una fila que falla se revierte sola: las demás y la corrida externa se confirman")
    void filaQueFallaNoRevierteLaCorridaNiLasDemas() {
        onvoPagada("clsub0001", "clinv0001");
        onvoPagada("clsub0002", "clinv0002");
        onvoPagada("clsub0003", "clinv0003");
        reactivacionEscribe("clsub0001", false);
        reactivacionEscribe("clsub0002", true);
        reactivacionEscribe("clsub0003", false);

        new TransactionTemplate(tm).executeWithoutResult(st -> {
            jdbc.update("INSERT INTO corrida(clave, valor) VALUES ('externa', 'job 03:00')");
            assertThat(reconsulta.reconsultar(fila("clsub0001"), HOY, OnvoRenovacionReconsulta.Corrida.EXPIRAR_PAST_DUE)).isEqualTo(OnvoRenovacionReconsulta.Estado.PAGADA);
            assertThat(reconsulta.reconsultar(fila("clsub0002"), HOY, OnvoRenovacionReconsulta.Corrida.EXPIRAR_PAST_DUE)).isEqualTo(OnvoRenovacionReconsulta.Estado.INCIERTA);
            assertThat(reconsulta.reconsultar(fila("clsub0003"), HOY, OnvoRenovacionReconsulta.Corrida.EXPIRAR_PAST_DUE)).isEqualTo(OnvoRenovacionReconsulta.Estado.PAGADA);
        });

        // La externa confirmó (no hubo UnexpectedRollbackException), la fila 2 quedó revertida y las otras dos confirmadas.
        assertThat(filas()).containsExactly("clsub0001", "clsub0003", "externa");
    }

    @Test
    @DisplayName("la transacción por fila es independiente: confirma aunque la externa se revierta después")
    void laFilaConfirmadaSobrevivePeroLaExternaPuedeRevertirse() {
        onvoPagada("clsub0001", "clinv0001");
        reactivacionEscribe("clsub0001", false);

        assertThatThrownBy(() -> new TransactionTemplate(tm).executeWithoutResult(st -> {
            jdbc.update("INSERT INTO corrida(clave, valor) VALUES ('externa', 'job 03:00')");
            reconsulta.reconsultar(fila("clsub0001"), HOY, OnvoRenovacionReconsulta.Corrida.EXPIRAR_PAST_DUE);
            throw new IllegalStateException("falla posterior de la corrida");
        })).isInstanceOf(IllegalStateException.class);

        // Prueba de que la fila corrió en otra transacción (REQUIRES_NEW): sobrevive a la reversión de la externa.
        assertThat(filas()).containsExactly("clsub0001");
    }

    @Test
    @DisplayName("contraste: con REQUIRED (la propagación anterior) la falla marcaba rollback-only y revertía todo")
    void contrasteConRequiredRevierteTodaLaCorrida() {
        reactivacionEscribe("clsub0002", true);

        assertThatThrownBy(() -> new TransactionTemplate(tm).executeWithoutResult(st -> {
            jdbc.update("INSERT INTO corrida(clave, valor) VALUES ('externa', 'job 03:00')");
            try {
                // Lo que hacía @Transactional (REQUIRED) en procesarPagoOnvoVerificado: se une a la externa.
                new TransactionTemplate(tm).executeWithoutResult(
                    interna -> cambio.procesarPagoOnvoVerificado("clsub0002", "PYME", HOY, "clinv0002"));
            } catch (IllegalStateException atrapada) {
                // el catch por fila de la reconsulta: la excepción se absorbe, pero la externa ya quedó rollback-only
            }
        })).isInstanceOf(UnexpectedRollbackException.class);

        assertThat(filas()).isEmpty();
    }
}
