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
import static org.mockito.Mockito.lenient;
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
    private static final String PRICE = "price_pyme";
    private static final OnvoRenovacionReconsulta.Corrida JOB = OnvoRenovacionReconsulta.Corrida.EXPIRAR_PAST_DUE;
    private static final OnvoRenovacionReconsulta.Corrida OTRO_JOB = OnvoRenovacionReconsulta.Corrida.GENERAR_RENOVACIONES;
    /** 24 USD (config de prueba) en centavos, como los devuelve ONVO. */
    private static final long PRECIO_USD_CENTAVOS = 2_400;

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
            new OnvoReconsultaConfig(DIAS_GRACIA, DIAS_MAX_INCIERTA, MAX_INCIERTAS_SEGUIDAS, 5000),
            new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", "usd"), onvo));
        when(onvo.modoEsperado()).thenReturn("live");
        lenient().doReturn(precioOnvo("USD", PRECIO_USD_CENTAVOS)).when(onvo).obtenerPrecio(PRICE);
        when(onvo.planParaPriceId("price_pyme")).thenReturn("PYME");
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
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

    private static Map<String, Object> precioOnvo(String moneda, long unitAmount) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", PRICE);
        m.put("mode", "live");
        m.put("isActive", true);
        m.put("currency", moneda);
        m.put("unitAmount", unitAmount);
        return m;
    }

    private static Map<String, Object> factura(String status, long total, String periodEnd) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", FACTURA);
        m.put("subscriptionId", SUB);
        m.put("customerId", "cus_1");
        m.put("status", status);
        m.put("mode", "live");
        m.put("currency", "USD");
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
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(PAGADA);
        verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);
    }

    @Test
    @DisplayName("el GET falla → INCIERTA, no se reactiva y NO se da de baja")
    void getFallaEsIncierta() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("timeout"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("sin llave real, en mock o con billing deshabilitado → INCIERTA sin llamar a ONVO")
    void sinLlaveMockODeshabilitadoEsIncierta() {
        when(onvo.sinLlave()).thenReturn(true);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        when(onvo.sinLlave()).thenReturn(false);
        when(onvo.isMockMode()).thenReturn(true);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        when(onvo.isMockMode()).thenReturn(false);
        when(onvo.isBillingDeshabilitado()).thenReturn(true);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        verify(onvo, never()).obtenerSuscripcion(any());
    }

    @Test
    @DisplayName("ONVO confirma suscripción no active (past_due/canceled) → NO_PAGADA: sigue el flujo normal")
    void noActivaEsNoPagada() {
        onvoResponde(sub("past_due"), factura("open", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("active pero la última factura sigue sin pagar → NO_PAGADA")
    void facturaSinPagarEsNoPagada() {
        onvoResponde(sub("active"), factura("open", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);
    }

    @Test
    @DisplayName("factura pagada de un período ya terminado (ONVO no renovó todavía) → NO_PAGADA, no reactiva")
    void facturaVencidaNoReactiva() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-10-28T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("factura pagada con monto menor al plan (A5-01 MEDIO) → INCIERTA: ni reactiva ni da de baja")
    void montoMenorEsIncierta() {
        onvoResponde(sub("active"), factura("paid", 1_500, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("modo distinto al de la llave, customer ajeno o id distinto → INCIERTA")
    void datosNoVerificablesSonInciertos() {
        Map<String, Object> otroModo = sub("active");
        otroModo.put("mode", "test");
        onvoResponde(otroModo, factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);

        Map<String, Object> otroCustomer = sub("active");
        otroCustomer.put("customerId", "cus_ajeno");
        onvoResponde(otroCustomer, factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);

        Map<String, Object> otroId = sub("active");
        otroId.put("id", "clsub9999");
        onvoResponde(otroId, factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);

        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("sin latestInvoiceId o con un id con formato inválido → INCIERTA")
    void sinFacturaEsIncierta() {
        Map<String, Object> sinFactura = sub("active");
        sinFactura.remove("latestInvoiceId");
        onvoResponde(sinFactura, factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        local.setOnvoSubscriptionId("../admin");
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
    }

    @Test
    @DisplayName("M1: INCIERTA dentro del plazo (fecha_fin + gracia + máximo) sigue sin dar de baja")
    void inciertaDentroDelPlazo() {
        local.setFechaFin(HOY.minusDays(DIAS_GRACIA + DIAS_MAX_INCIERTA)); // último día del plazo
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("timeout"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
    }

    @Test
    @DisplayName("M1: error permanente de ONVO (404, modo ajeno, sin factura) pasado el plazo → NO_PAGADA: sigue hacia PAST_DUE/VENCIDO")
    void incertidumbrePermanentePasadoElPlazoSigueElFlujoNormal() {
        local.setFechaFin(HOY.minusDays(DIAS_GRACIA + DIAS_MAX_INCIERTA + 1)); // primer día fuera del plazo

        Map<String, Object> otroModo = sub("active");
        otroModo.put("mode", "test");
        onvoResponde(otroModo, factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);

        Map<String, Object> sinFactura = sub("active");
        sinFactura.remove("latestInvoiceId");
        onvoResponde(sinFactura, factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);

        doThrow(noEncontrado()).when(onvo).obtenerSuscripcion(SUB);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);

        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("M1: pasado el plazo, si ONVO sí confirma el pago se reactiva igual (el tope solo aplica a la incertidumbre)")
    void pasadoElPlazoPeroPagadaSigueReactivando() {
        local.setFechaFin(HOY.minusDays(DIAS_GRACIA + DIAS_MAX_INCIERTA + 30));
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(PAGADA);
    }

    @Test
    @DisplayName("M2: la reactivación corre en su propia transacción (REQUIRES_NEW), no en la de la corrida de las 03:00")
    void reactivacionEnTransaccionNueva() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(PAGADA);
        assertThat(tx.propagaciones).containsExactly(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        assertThat(tx.commits).isEqualTo(1);
        assertThat(tx.rollbacks).isZero();
    }

    @Test
    @DisplayName("M2: una fila que falla al reactivar revierte solo su transacción, queda INCIERTA y la siguiente se reactiva")
    @SuppressWarnings({"unchecked", "rawtypes"})
    void filaQueFallaNoRevierteLasDemas() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        doThrow(new IllegalStateException("fallo al guardar")).when(cambio)
            .procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);

        Suscripcion otra = new Suscripcion();
        otra.setEmpresa(local.getEmpresa());
        otra.setOnvoSubscriptionId("clsub0002");
        otra.setOnvoCustomerId("cus_1");
        Map<String, Object> sub2 = sub("active");
        sub2.put("id", "clsub0002");
        sub2.put("latestInvoiceId", "clinv0002");
        Map<String, Object> f2 = factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z");
        f2.put("id", "clinv0002");
        f2.put("subscriptionId", "clsub0002");
        when(onvo.obtenerSuscripcion("clsub0002")).thenReturn((Map) sub2);
        when(onvo.obtenerRenovacion("clinv0002")).thenReturn((Map) f2);

        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA); // no propaga la excepción
        assertThat(reconsulta.reconsultar(otra, HOY, JOB)).isEqualTo(PAGADA);

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
            assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        }

        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS)).obtenerSuscripcion(SUB);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("B1: iniciarCorrida() reabre el circuito (el conteo es por corrida nocturna)")
    void iniciarCorridaReabreElCircuito() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) reconsulta.reconsultar(local, HOY, JOB);
        reconsulta.reconsultar(local, HOY, JOB); // cortada: sin GET

        reconsulta.iniciarCorrida(JOB);
        reconsulta.reconsultar(local, HOY, JOB);

        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS + 1)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1: una respuesta de ONVO (NO_PAGADA) reinicia el conteo de seguidas")
    void unaRespuestaDeOnvoReiniciaElConteo() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        reconsulta.reconsultar(local, HOY, JOB);
        reconsulta.reconsultar(local, HOY, JOB);
        doReturn(sub("canceled")).when(onvo).obtenerSuscripcion(SUB);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);
        doThrow(new IllegalStateException("ONVO caído")).when(onvo).obtenerSuscripcion(SUB);

        reconsulta.reconsultar(local, HOY, JOB);
        reconsulta.reconsultar(local, HOY, JOB);
        reconsulta.reconsultar(local, HOY, JOB);

        // 2 + 1 + 3: si el conteo no se hubiera reiniciado, el circuito se habría abierto antes.
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS + 3)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1/M1: con el circuito abierto, una fila pasada del plazo máximo SÍ consulta ONVO y sigue el flujo normal (NO_PAGADA)")
    void circuitoAbiertoPeroPlazoAgotadoSigueElFlujoNormal() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) reconsulta.reconsultar(local, HOY, JOB);
        local.setFechaFin(HOY.minusDays((long) DIAS_GRACIA + DIAS_MAX_INCIERTA + 1));

        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(NO_PAGADA);
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS + 1)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1/M1: con el circuito abierto, una fila pasada del plazo que ONVO confirma pagada se reactiva (no se da de baja sin GET)")
    void circuitoAbiertoPlazoAgotadoYPagadaReactiva() {
        doThrow(new IllegalStateException("ONVO caído")).when(onvo).obtenerSuscripcion(SUB);
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) reconsulta.reconsultar(local, HOY, JOB);
        local.setFechaFin(HOY.minusDays((long) DIAS_GRACIA + DIAS_MAX_INCIERTA + 1));
        doReturn(sub("active")).when(onvo).obtenerSuscripcion(SUB);
        doReturn(factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z")).when(onvo).obtenerRenovacion(FACTURA);

        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(PAGADA);
        verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);
    }

    @Test
    @DisplayName("B1: los INCIERTA permanentes (404, modo ajeno, sin factura) no cuentan para abrir el circuito")
    void inciertasPermanentesNoAbrenElCircuito() {
        int filas = MAX_INCIERTAS_SEGUIDAS + 2;
        doThrow(noEncontrado()).when(onvo).obtenerSuscripcion(SUB);
        for (int i = 0; i < filas; i++) assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        Map<String, Object> otroModo = sub("active");
        otroModo.put("mode", "test");
        doReturn(otroModo).when(onvo).obtenerSuscripcion(SUB);
        for (int i = 0; i < filas; i++) assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);

        // Una fila sana después de tantas permanentes todavía se consulta y se reactiva.
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(PAGADA);
        verify(onvo, org.mockito.Mockito.times(filas * 2 + 1)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1: una INCIERTA permanente entre fallos transitorios no reinicia ni suma el conteo")
    void permanenteNoReiniciaElConteoTransitorio() {
        doThrow(new IllegalStateException("ONVO caído")).when(onvo).obtenerSuscripcion(SUB);
        reconsulta.reconsultar(local, HOY, JOB);
        reconsulta.reconsultar(local, HOY, JOB);
        doThrow(noEncontrado()).when(onvo).obtenerSuscripcion(SUB);
        reconsulta.reconsultar(local, HOY, JOB);
        doThrow(new IllegalStateException("ONVO caído")).when(onvo).obtenerSuscripcion(SUB);
        reconsulta.reconsultar(local, HOY, JOB); // tercer transitorio: abre el circuito
        reconsulta.reconsultar(local, HOY, JOB); // cortada: sin GET

        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS + 1)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1: cada job tiene su contador; abrir el circuito de uno no corta al otro")
    void contadorPorJob() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) reconsulta.reconsultar(local, HOY, JOB);
        reconsulta.reconsultar(local, HOY, JOB); // cortada
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS)).obtenerSuscripcion(SUB);

        reconsulta.reconsultar(local, HOY, OTRO_JOB); // el otro job tiene su contador en cero: sí consulta
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS + 1)).obtenerSuscripcion(SUB);
    }

    @Test
    @DisplayName("B1: iniciarCorrida de un job no reinicia el contador del otro")
    void iniciarCorridaDeUnJobNoReiniciaAlOtro() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("ONVO caído"));
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) reconsulta.reconsultar(local, HOY, JOB);

        reconsulta.iniciarCorrida(OTRO_JOB); // arranca el otro job (03:00 de la otra tarea)
        reconsulta.reconsultar(local, HOY, JOB); // el circuito de JOB sigue abierto: sin GET

        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS)).obtenerSuscripcion(SUB);
    }

    private static org.springframework.web.client.HttpClientErrorException noEncontrado() {
        return org.springframework.web.client.HttpClientErrorException.create(
            org.springframework.http.HttpStatus.NOT_FOUND, "no existe", new org.springframework.http.HttpHeaders(),
            new byte[0], null);
    }

    // ---------------------------------------------------------------- moneda y monto del price del plan (USD)

    @Test
    @DisplayName("USD: un pago en USD con la moneda y el monto del price configurado activa el plan")
    void pagoUsdQueCoincideActiva() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(PAGADA);
        verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);
    }

    @Test
    @DisplayName("USD: un pago en USD con monto menor al price no activa")
    void pagoUsdMenorNoActiva() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS - 1, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("USD: una moneda distinta a la del price no activa, aunque el número coincida")
    void monedaDistintaNoActiva() {
        Map<String, Object> enCrc = factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z");
        enCrc.put("currency", "CRC");
        onvoResponde(sub("active"), enCrc);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("USD: si el price de ONVO no coincide con el precio o la moneda configurados, no se activa")
    void priceDeOnvoDistintoALaConfigNoActiva() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        doReturn(precioOnvo("USD", 3_000)).when(onvo).obtenerPrecio(PRICE);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        doReturn(precioOnvo("EUR", PRECIO_USD_CENTAVOS)).when(onvo).obtenerPrecio(PRICE);
        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("USD: si el GET del price falla, la fila queda INCIERTA transitoria (no se activa ni se da de baja)")
    void getDelPriceCaidoEsTransitorio() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        doThrow(new IllegalStateException("timeout")).when(onvo).obtenerPrecio(PRICE);
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        reconsulta.reconsultar(local, HOY, JOB); // circuito abierto: ni siquiera consulta la suscripción
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS)).obtenerSuscripcion(SUB);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    @Test
    @DisplayName("A1: sin PLANES_MONEDA la fila queda INCIERTA transitoria (cuenta para el circuito), no se activa ni se da de baja")
    void sinMonedaConfiguradaEsTransitorioEnLaReconsulta() {
        var sinMoneda = new OnvoRenovacionReconsulta(onvo, planRepo, cambio, tx, lockTimeout,
            new OnvoReconsultaConfig(DIAS_GRACIA, DIAS_MAX_INCIERTA, MAX_INCIERTAS_SEGUIDAS, 5000),
            new PrecioPlanOnvo(new PreciosPlanesConfig("9", "24", "49", ""), onvo));
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        for (int i = 0; i < MAX_INCIERTAS_SEGUIDAS; i++) assertThat(sinMoneda.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);
        sinMoneda.reconsultar(local, HOY, JOB); // el circuito de transitorias se abrió: sin GET
        verify(onvo, org.mockito.Mockito.times(MAX_INCIERTAS_SEGUIDAS)).obtenerSuscripcion(SUB);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
    }

    // ---------------------------------------------------------------- lock_timeout y referencia B2

    @Test
    @DisplayName("lock_timeout se aplica dentro de la transacción por fila, antes de tomar el lock de la fila")
    void lockTimeoutSeAplicaAntesDeProcesarElPago() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        var orden = org.mockito.Mockito.inOrder(lockTimeout, cambio);

        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(PAGADA);

        orden.verify(lockTimeout).aplicar();
        orden.verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1), FACTURA);
    }

    @Test
    @DisplayName("lock_timeout vencido (otro proceso tiene la fila): la fila queda INCIERTA y no se revierte la corrida")
    void lockTimeoutVencidoDejaLaFilaIncierta() {
        onvoResponde(sub("active"), factura("paid", PRECIO_USD_CENTAVOS, "2026-12-01T06:00:00.000Z"));
        doThrow(new IllegalStateException("lock timeout")).when(lockTimeout).aplicar();

        assertThat(reconsulta.reconsultar(local, HOY, JOB)).isEqualTo(INCIERTA);

        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any(), any());
        assertThat(tx.rollbacks).isEqualTo(1);
    }
}
