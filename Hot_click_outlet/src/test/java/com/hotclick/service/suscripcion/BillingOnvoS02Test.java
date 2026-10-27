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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("Auditor 5: S-02 (billing ONVO verificado por GET)")
class BillingOnvoS02Test {

    @Test
    @DisplayName("S-02: sin llave, las consultas de verificación fallan cerradas (no se inventa respuesta)")
    void verificacionSinLlaveFallaCerrada() {
        OnvoBillingClient client = new OnvoBillingClient(new RestTemplate());
        assertThatThrownBy(() -> client.obtenerSuscripcion("sub_1")).isInstanceOf(IllegalStateException.class);
        assertThat(client.modoEsperado()).isNull();
    }

    private SuscripcionOnvoChangeService servicio(SuscripcionRepository subs, EmpresaRepository emps, PlanRepository planes,
                                                  OnvoBillingClient onvo) {
        return new SuscripcionOnvoChangeService(subs, emps, planes, onvo, mock(OnvoService.class),
            mock(SuscripcionPlanSupport.class), null);
    }

    @Test
    @DisplayName("S-02/S-08: pago verificado aplica el plan y el fin de período confirmados por ONVO")
    void pagoVerificadoAplicaPeriodoOnvo() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        EmpresaRepository emps = mock(EmpresaRepository.class);
        PlanRepository planes = mock(PlanRepository.class);
        Plan plus = new Plan(); plus.setNombre("NEGOCIO_PLUS");
        when(planes.findByNombre("NEGOCIO_PLUS")).thenReturn(Optional.of(plus));
        Empresa e = new Empresa(); e.setId(10L);
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("PAST_DUE");
        when(subs.findByOnvoSubscriptionIdForUpdate("clsub")).thenReturn(Optional.of(sub));
        LocalDate fin = LocalDate.of(2026, 12, 1);
        servicio(subs, emps, planes, mock(OnvoBillingClient.class)).procesarPagoOnvoVerificado("clsub", "NEGOCIO_PLUS", fin);
        assertThat(sub.getEstado()).isEqualTo("ACTIVO");
        assertThat(sub.getFechaFin()).isEqualTo(fin);
        assertThat(e.getPlanSaas()).isEqualTo("NEGOCIO_PLUS");
        assertThat(e.getFechaVencPlan()).isEqualTo(fin);
    }

    private SuscripcionOnvoChangeService servicioConLedger(SuscripcionRepository subs, PlanRepository planes,
                                                           BillingLedgerWriter ledger) {
        SuscripcionOnvoChangeService svc = servicio(subs, mock(EmpresaRepository.class), planes, mock(OnvoBillingClient.class));
        org.springframework.test.util.ReflectionTestUtils.setField(svc, "ledgerWriter", ledger);
        return svc;
    }

    private Suscripcion prepararPago(SuscripcionRepository subs, PlanRepository planes) {
        Plan plus = new Plan(); plus.setNombre("NEGOCIO_PLUS");
        when(planes.findByNombre("NEGOCIO_PLUS")).thenReturn(Optional.of(plus));
        Empresa e = new Empresa(); e.setId(10L);
        Suscripcion sub = new Suscripcion();
        sub.setEmpresa(e);
        sub.setEstado("PAST_DUE");
        when(subs.findByOnvoSubscriptionIdForUpdate("clsub")).thenReturn(Optional.of(sub));
        return sub;
    }

    @Test
    @DisplayName("B2: el ledger referencia el id de la factura (una por cobro), no el de la suscripción")
    void ledgerReferenciaLaFactura() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        PlanRepository planes = mock(PlanRepository.class);
        Suscripcion sub = prepararPago(subs, planes);
        BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
        servicioConLedger(subs, planes, ledger)
            .procesarPagoOnvoVerificado("clsub", "NEGOCIO_PLUS", LocalDate.of(2026, 12, 1), "clinv0007");
        verify(ledger).registrar(any(), eq(sub), eq("COBRO_OK"), eq("ONVO"), eq("clinv0007"), any(), any(), any());
    }

    @Test
    @DisplayName("B2: sin id de factura el ledger conserva el id de la suscripción como referencia")
    void ledgerSinFacturaUsaLaSuscripcion() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        PlanRepository planes = mock(PlanRepository.class);
        Suscripcion sub = prepararPago(subs, planes);
        BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
        servicioConLedger(subs, planes, ledger)
            .procesarPagoOnvoVerificado("clsub", "NEGOCIO_PLUS", LocalDate.of(2026, 12, 1));
        verify(ledger).registrar(any(), eq(sub), eq("COBRO_OK"), eq("ONVO"), eq("clsub"), any(), any(), any());
    }

    @Test
    @DisplayName("Ledger: la moneda del cobro sale de la config de los planes (usd), no de un literal crc")
    void ledgerUsaLaMonedaConfigurada() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        PlanRepository planes = mock(PlanRepository.class);
        Suscripcion sub = prepararPago(subs, planes);
        BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
        SuscripcionOnvoChangeService svc = servicioConLedger(subs, planes, ledger);
        org.springframework.test.util.ReflectionTestUtils.setField(svc, "preciosPlanes",
            new PreciosPlanesConfig("9", "24", "49", "usd"));
        svc.procesarPagoOnvoVerificado("clsub", "NEGOCIO_PLUS", LocalDate.of(2026, 12, 1), "clinv0007");
        verify(ledger).registrar(any(), eq(sub), eq("COBRO_OK"), eq("ONVO"), eq("clinv0007"), any(), eq("usd"), any());
    }

    @Test
    @DisplayName("Ledger: una referencia de más de 120 caracteres o con forma inválida cae al id de la suscripción")
    void ledgerReferenciaInvalidaUsaLaSuscripcion() {
        for (String mala : new String[]{"x".repeat(121), "inv/../x"}) {
            SuscripcionRepository subs = mock(SuscripcionRepository.class);
            PlanRepository planes = mock(PlanRepository.class);
            Suscripcion sub = prepararPago(subs, planes);
            BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
            servicioConLedger(subs, planes, ledger)
                .procesarPagoOnvoVerificado("clsub", "NEGOCIO_PLUS", LocalDate.of(2026, 12, 1), mala);
            verify(ledger).registrar(any(), eq(sub), eq("COBRO_OK"), eq("ONVO"), eq("clsub"), any(), any(), any());
        }
    }
}
