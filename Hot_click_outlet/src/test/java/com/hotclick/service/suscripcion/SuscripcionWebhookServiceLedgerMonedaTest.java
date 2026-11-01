package com.hotclick.service.suscripcion;

import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaSaas;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaSaasRepository;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.billing.BillingLedgerWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** El ledger de Stripe registra la moneda real de la factura de la suscripción; si no se conoce, no inventa "crc". */
@DisplayName("Ledger Stripe: moneda real en COBRO_FALLIDO y CANCELACION")
class SuscripcionWebhookServiceLedgerMonedaTest {

    SuscripcionRepository subs = mock(SuscripcionRepository.class);
    FacturaSaasRepository facturas = mock(FacturaSaasRepository.class);
    BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
    SuscripcionWebhookService svc = new SuscripcionWebhookService();
    Suscripcion sub = new Suscripcion();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(svc, "suscripcionRepo", subs);
        ReflectionTestUtils.setField(svc, "facturaRepo", facturas);
        ReflectionTestUtils.setField(svc, "eventoRepo", mock(StripeEventoRepository.class));
        ReflectionTestUtils.setField(svc, "empresaRepo", mock(EmpresaRepository.class));
        ReflectionTestUtils.setField(svc, "planSupport", mock(SuscripcionPlanSupport.class));
        ReflectionTestUtils.setField(svc, "ledgerWriter", ledger);
        Empresa e = new Empresa();
        e.setId(10L);
        sub.setEmpresa(e);
        ReflectionTestUtils.setField(sub, "id", 70L);
        when(subs.findByStripeSubscriptionId("sub_s")).thenReturn(Optional.of(sub));
    }

    private static FacturaSaas factura(String moneda) {
        FacturaSaas f = new FacturaSaas();
        f.setMoneda(moneda);
        return f;
    }

    @Test
    @DisplayName("COBRO_FALLIDO usa la moneda de la factura del evento")
    void fallidoUsaLaMonedaDeLaFacturaDelEvento() {
        when(facturas.findByStripeInvoiceId("in_1")).thenReturn(Optional.of(factura("USD")));
        svc.procesarFacturaFallida("sub_s", "in_1");
        verify(ledger).registrar(any(), eq(sub), eq(BillingLedger.TIPO_COBRO_FALLIDO), eq("STRIPE"), eq("in_1"),
            any(), eq("USD"), any());
    }

    @Test
    @DisplayName("COBRO_FALLIDO sin factura del evento usa la última factura de la suscripción")
    void fallidoUsaLaUltimaFacturaDeLaSuscripcion() {
        when(facturas.findByStripeInvoiceId("in_2")).thenReturn(Optional.empty());
        when(facturas.findFirstBySuscripcionIdOrderByFechaCreacionDesc(70L)).thenReturn(Optional.of(factura("crc")));
        svc.procesarFacturaFallida("sub_s", "in_2");
        verify(ledger).registrar(any(), eq(sub), eq(BillingLedger.TIPO_COBRO_FALLIDO), eq("STRIPE"), eq("in_2"),
            any(), eq("crc"), any());
    }

    @Test
    @DisplayName("CANCELACION usa la moneda de la última factura de la suscripción")
    void cancelacionUsaLaMonedaDeLaUltimaFactura() {
        when(facturas.findFirstBySuscripcionIdOrderByFechaCreacionDesc(70L)).thenReturn(Optional.of(factura("usd")));
        svc.procesarSuscripcionEliminada("sub_s");
        verify(ledger).registrar(any(), eq(sub), eq(BillingLedger.TIPO_CANCELACION), eq("STRIPE"), eq("sub_s"),
            any(), eq("usd"), any());
    }

    @Test
    @DisplayName("Sin moneda conocida no se escribe el ledger (nada de crc inventado) y la baja/PAST_DUE sigue")
    void sinMonedaConocidaNoEscribeNiCaeACrc() {
        when(facturas.findByStripeInvoiceId(any())).thenReturn(Optional.empty());
        when(facturas.findFirstBySuscripcionIdOrderByFechaCreacionDesc(70L)).thenReturn(Optional.empty());
        svc.procesarFacturaFallida("sub_s", "in_3");
        svc.procesarSuscripcionEliminada("sub_s");
        verify(ledger, never()).registrar(any(), any(), any(), any(), any(), any(), any(), any());
        verify(subs, org.mockito.Mockito.times(2)).save(sub);
    }
}
