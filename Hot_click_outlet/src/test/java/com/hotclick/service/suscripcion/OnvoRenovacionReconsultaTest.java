package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

import static com.hotclick.service.suscripcion.OnvoRenovacionReconsulta.Estado.INCIERTA;
import static com.hotclick.service.suscripcion.OnvoRenovacionReconsulta.Estado.NO_PAGADA;
import static com.hotclick.service.suscripcion.OnvoRenovacionReconsulta.Estado.PAGADA;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A5-01: reconsulta GET a ONVO antes de pasar a PAST_DUE / VENCIDO. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("A5-01: reconsulta de renovación a ONVO")
class OnvoRenovacionReconsultaTest {

    private static final LocalDate HOY = LocalDate.of(2026, 10, 28);
    private static final String SUB = "clsub0001";
    private static final String FACTURA = "clinv0001";

    @Mock OnvoBillingClient onvo;
    @Mock PlanRepository planRepo;
    @Mock SuscripcionOnvoChangeService cambio;
    @Mock LockTimeoutPorFila lockTimeout;
    OnvoRenovacionReconsulta reconsulta;
    Suscripcion local;
    TxManagerGrabador tx;

    private static final int DIAS_GRACIA = 8;
    private static final int DIAS_MAX_INCIERTA = 5;
    private static final int MAX_INCIERTAS_SEGUIDAS = 3;

    /** PlatformTransactionManager de prueba: anota la definición pedida y qué transacciones se confirmaron o revirtieron. */
    static class TxManagerGrabador implements org.springframework.transaction.PlatformTransactionManager {
        final List<Integer> propagaciones = new java.util.ArrayList<>();
        int commits;
        int rollbacks;
        @Override public org.springframework.transaction.TransactionStatus getTransaction(
                org.springframework.transaction.TransactionDefinition d) {
            propagaciones.add(d.getPropagationBehavior());
            return new org.springframework.transaction.support.SimpleTransactionStatus(true);
        }
        @Override public void commit(org.springframework.transaction.TransactionStatus st) { commits++; }
        @Override public void rollback(org.springframework.transaction.TransactionStatus st) { rollbacks++; }
    }

    @BeforeEach
    void setUp() {
        tx = new TxManagerGrabador();
        reconsulta = new OnvoRenovacionReconsulta(onvo, planRepo, cambio, tx, lockTimeout,
            new OnvoReconsultaConfig(DIAS_GRACIA, DIAS_MAX_INCIERTA, MAX_INCIERTAS_SEGUIDAS, 5000));
        when(onvo.modoEsperado()).thenReturn("live");
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        pyme.setPrecioMensual(12000);
        when(planRepo.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        local = new Suscripcion();
        Empresa e = new Empresa();
        e.setId(7L);
        local.setEmpresa(e);
        local.setOnvoSubscriptionId(SUB);
        local.setOnvoCustomerId("cus_1");
        local.setEstado("PAST_DUE");
    }

    private static Map<String, Object> sub(String status) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", SUB);
        m.put("status", status);
        m.put("mode", "live");
        m.put("customerId", "cus_1");
        m.put("latestInvoiceId", FACTURA);
        m.put("currentPeriodEnd", "2026-12-01T06:00:00.000Z");
        m.put("items", List.of(Map.of("id", "item_1", "priceId", "price_pyme")));
        return m;
    }

    private static Map<String, Object> factura(String status, long total, String periodEnd) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", FACTURA);
        m.put("subscriptionId", SUB);
        m.put("customerId", "cus_1");
        m.put("status", status);
        m.put("mode", "live");
        m.put("currency", "CRC");
        m.put("total", total);
        m.put("periodEnd", periodEnd);
        return m;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void onvoResponde(Map<String, Object> sub, Map<String, Object> factura) {
        when(onvo.obtenerSuscripcion(SUB)).thenReturn((Map) sub);
        when(onvo.obtenerRenovacion(FACTURA)).thenReturn((Map) factura);
    }

    @Test
    @DisplayName("ONVO active y factura pagada con el monto completo → se reactiva por el camino verificado")
    void activaYPagadaReactiva() {
        onvoResponde(sub("active"), factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(PAGADA);
        verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);
    }

    @Test
    @DisplayName("el GET falla → INCIERTA, no se reactiva y NO se da de baja")
    void getFallaEsIncierta() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("timeout"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("sin llave real, en mock o con billing deshabilitado → INCIERTA sin llamar a ONVO")
    void sinLlaveMockODeshabilitadoEsIncierta() {
        when(onvo.sinLlave()).thenReturn(true);
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        when(onvo.sinLlave()).thenReturn(false);
        when(onvo.isMockMode()).thenReturn(true);
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        when(onvo.isMockMode()).thenReturn(false);
        when(onvo.isBillingDeshabilitado()).thenReturn(true);
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        verify(onvo, never()).obtenerSuscripcion(any());
    }

    @Test
    @DisplayName("ONVO confirma suscripción no active (past_due/canceled) → NO_PAGADA: sigue el flujo normal")
    void noActivaEsNoPagada() {
        onvoResponde(sub("past_due"), factura("open", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("active pero la última factura sigue sin pagar → NO_PAGADA")
    void facturaSinPagarEsNoPagada() {
        onvoResponde(sub("active"), factura("open", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);
    }

    @Test
    @DisplayName("factura pagada de un período ya terminado (ONVO no renovó todavía) → NO_PAGADA, no reactiva")
    void facturaVencidaNoReactiva() {
        onvoResponde(sub("active"), factura("paid", 1_200_000, "2026-10-28T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("factura pagada con monto menor al plan (A5-01 MEDIO) → INCIERTA: ni reactiva ni da de baja")
    void montoMenorEsIncierta() {
        onvoResponde(sub("active"), factura("paid", 830_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("modo distinto al de la llave, customer ajeno o id distinto → INCIERTA")
    void datosNoVerificablesSonInciertos() {
        Map<String, Object> otroModo = sub("active");
        otroModo.put("mode", "test");
        onvoResponde(otroModo, factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);

        Map<String, Object> otroCustomer = sub("active");
        otroCustomer.put("customerId", "cus_ajeno");
        onvoResponde(otroCustomer, factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);

        Map<String, Object> otroId = sub("active");
        otroId.put("id", "clsub9999");
        onvoResponde(otroId, factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);

        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("sin latestInvoiceId o con un id con formato inválido → INCIERTA")
    void sinFacturaEsIncierta() {
        Map<String, Object> sinFactura = sub("active");
        sinFactura.remove("latestInvoiceId");
        onvoResponde(sinFactura, factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        local.setOnvoSubscriptionId("../admin");
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
    }

    @Test
    @DisplayName("M1: INCIERTA dentro del plazo (fecha_fin + gracia + máximo) sigue sin dar de baja")
    void inciertaDentroDelPlazo() {
        local.setFechaFin(HOY.minusDays(DIAS_GRACIA + DIAS_MAX_INCIERTA)); // último día del plazo
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("timeout"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
    }

    @Test
    @DisplayName("M1: error permanente de ONVO (404, modo ajeno, sin factura) pasado el plazo → NO_PAGADA: sigue hacia PAST_DUE/VENCIDO")
    void incertidumbrePermanentePasadoElPlazoSigueElFlujoNormal() {
        local.setFechaFin(HOY.minusDays(DIAS_GRACIA + DIAS_MAX_INCIERTA + 1)); // primer día fuera del plazo

        Map<String, Object> otroModo = sub("active");
        otroModo.put("mode", "test");
        onvoResponde(otroModo, factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);

        Map<String, Object> sinFactura = sub("active");
        sinFactura.remove("latestInvoiceId");
        onvoResponde(sinFactura, factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);

        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("404"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);

        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("M1: pasado el plazo, si ONVO sí confirma el pago se reactiva igual (el tope solo aplica a la incertidumbre)")
    void pasadoElPlazoPeroPagadaSigueReactivando() {
        local.setFechaFin(HOY.minusDays(DIAS_GRACIA + DIAS_MAX_INCIERTA + 30));
        onvoResponde(sub("active"), factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(PAGADA);
    }

    @Test
    @DisplayName("M2: la reactivación corre en su propia transacción (REQUIRES_NEW), no en la de la corrida de las 03:00")
    void reactivacionEnTransaccionNueva() {
        onvoResponde(sub("active"), factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(PAGADA);
        assertThat(tx.propagaciones).containsExactly(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        assertThat(tx.commits).isEqualTo(1);
        assertThat(tx.rollbacks).isZero();
    }

    @Test
    @DisplayName("M2: una fila que falla al reactivar revierte solo su transacción, queda INCIERTA y la siguiente se reactiva")
    @SuppressWarnings({"unchecked", "rawtypes"})
    void filaQueFallaNoRevierteLasDemas() {
        onvoResponde(sub("active"), factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        doThrow(new IllegalStateException("fallo al guardar")).when(cambio)
            .procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);

        Suscripcion otra = new Suscripcion();
        otra.setEmpresa(local.getEmpresa());
        otra.setOnvoSubscriptionId("clsub0002");
        otra.setOnvoCustomerId("cus_1");
        Map<String, Object> sub2 = sub("active");
        sub2.put("id", "clsub0002");
        sub2.put("latestInvoiceId", "clinv0002");
        Map<String, Object> f2 = factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z");
        f2.put("id", "clinv0002");
        f2.put("subscriptionId", "clsub0002");
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) sub2);
        when(onvo.obtenerRenovacion("clinv0002")).thenReturn((Map) f2);

        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA); // no propaga la excepción
        assertThat(reconsulta.reconsultar(otra, HOY)).isEqualTo(PAGADA);

        assertThat(tx.rollbacks).isEqualTo(1);
        assertThat(tx.commits).isEqualTo(1);
        assertThat(tx.propagaciones).hasSize(2)
            .containsOnly(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        verify(cambio).procesarPagoOnvoVerificado("clsub0002", "PYME", LocalDate.of(2026, 12, 1), "clinv0002");
    }

    // ---------------------------------------------------------------- B1: corte de GET tras N INCIERTA seguidas

    @Test
    @DisplayName("B1: tras N INCIERTA seguidas en la corrida ya no se hacen GET a ONVO")
    void tras3InciertasSeguidasSeCortanLosGet() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));

        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS + 2; i++) {
            assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        }

        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS)).obtenerSuscripcion(SUB);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("B1: iniciarCorrida() reabre el circuito (el conteo es por corrida nocturna)")
    void iniciarCorridaReabreElCircuito() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) reconsulta.reconsultar(local, HOY);
        reconsulta.reconsultar(local, HOY); // cortada: sin GET

        reconsulta.iniciarCorrida();
        reconsulta.reconsultar(local, HOY);

        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS + 1)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1: una respuesta de ONVO (NO_PAGADA) reinicia el conteo de seguidas")
    void unaRespuestaDeOnvoReiniciaElConteo() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        reconsulta.reconsultar(local, HOY);
        reconsulta.reconsultar(local, HOY);
        doReturn(sub("canceled")).when(onvo).obtenerSuscripcion(SUB);
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);
        doThrow(new IllegalStateException("ONVO caído")).when(onvo).obtenerSuscripcion(SUB);

        reconsulta.reconsultar(local, HOY);
        reconsulta.reconsultar(local, HOY);
        reconsulta.reconsultar(local, HOY);

        // 2 + 1 + 3: si el conteo no se hubiera reiniciado, el circuito se habría abierto antes.
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS + 3)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1: con el circuito abierto, pasado el plazo máximo igual sigue el flujo normal (NO_PAGADA)")
    void circuitoAbiertoPeroPlazoAgotadoSigueElFlujoNormal() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) reconsulta.reconsultar(local, HOY);
        local.setFechaFin(HOY.minusDays((long) DIAS_GRACIA + DIAS_MAX_INCIERTA + 1));

        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(NO_PAGADA);
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS)).obtenerSuscripcion(SUB);
    }

    // ---------------------------------------------------------------- lock_timeout y referencia B2

    @Test
    @DisplayName("lock_timeout se aplica dentro de la transacción por fila, antes de tomar el lock de la fila")
    void lockTimeoutSeAplicaAntesDeProcesarElPago() {
        onvoResponde(sub("active"), factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        var orden = org.mockito.Mockito.inOrder(lockTimeout, cambio);

        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(PAGADA);

        orden.verify(lockTimeout).aplicar();
        orden.verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);
    }

    @Test
    @DisplayName("lock_timeout vencido (otro proceso tiene la fila): la fila queda INCIERTA y no se revierte la corrida")
    void lockTimeoutVencidoDejaLaFilaIncierta() {
        onvoResponde(sub("active"), factura("paid", 1_200_000, "2026-12-01T06:00:00.000Z"));
        doThrow(new IllegalStateException("lock timeout")).when(lockTimeout).aplicar();

        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);

        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        assertThat(tx.rollbacks).isEqualTo(1);
    }
}
