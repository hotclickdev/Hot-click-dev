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
    OnvoRenovacionReconsulta reconsulta;
    Suscripcion local;

    @BeforeEach
    void setUp() {
        reconsulta = new OnvoRenovacionReconsulta(onvo, planRepo, cambio);
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
        verify(cambio).procesarPagoOnvoVerificado(SUB, "PYME", LocalDate.of(2026, 12, 1));
    }

    @Test
    @DisplayName("el GET falla → INCIERTA, no se reactiva y NO se da de baja")
    void getFallaEsIncierta() {
        when(onvo.obtenerSuscripcion(SUB)).thenThrow(new IllegalStateException("timeout"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any());
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
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any());
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
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any());
    }

    @Test
    @DisplayName("factura pagada con monto menor al plan (A5-01 MEDIO) → INCIERTA: ni reactiva ni da de baja")
    void montoMenorEsIncierta() {
        onvoResponde(sub("active"), factura("paid", 830_000, "2026-12-01T06:00:00.000Z"));
        assertThat(reconsulta.reconsultar(local, HOY)).isEqualTo(INCIERTA);
        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any());
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

        verify(cambio, never()).procesarPagoOnvoVerificado(any(), any(), any());
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
}
