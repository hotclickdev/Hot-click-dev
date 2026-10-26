package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.OnvoBillingClient;
import io.github.resilience4j.retry.annotation.Retry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@DisplayName("Auditor 5: S-05 y S-06 (billing ONVO)")
class BillingOnvoAuditor5Test {

    @Test
    @DisplayName("S-05 repro: los POST que crean customer/suscripción no llevan @Retry")
    void postsDeAltaSinRetry() throws Exception {
        assertThat(OnvoBillingClient.class.getMethod("crearCustomer", String.class, String.class, Map.class)
            .isAnnotationPresent(Retry.class)).isFalse();
        assertThat(OnvoBillingClient.class.getMethod("crearSuscripcionIncompleta", String.class, String.class, Map.class)
            .isAnnotationPresent(Retry.class)).isFalse();
    }

    @Test
    @DisplayName("S-05: buscarSuscripcionAbierta reutiliza la suscripción incompleta del customer con ese price")
    void reutilizaSuscripcionAbierta() {
        RestTemplate rt = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(rt).build();
        OnvoBillingClient client = new OnvoBillingClient(rt);
        ReflectionTestUtils.setField(client, "secretKey", "llave-ficticia");
        server.expect(requestTo("https://api.onvopay.com/v1/customers/cus_1/subscriptions"))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess("""
                {"data":[{"id":"sub_cancel","status":"canceled","items":[{"priceId":"price_pyme"}]},
                         {"id":"sub_open","status":"incomplete","items":[{"priceId":"price_pyme"}]}]}""",
                MediaType.APPLICATION_JSON));
        assertThat(client.buscarSuscripcionAbierta("cus_1", "price_pyme")).isEqualTo("sub_open");
        server.verify();
    }

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
    @DisplayName("S-06 repro: guardar el price pendiente no cambia el plan de la suscripción antes del pago")
    void pendienteNoCambiaPlan() {
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        Plan pyme = new Plan(); pyme.setNombre("PYME");
        Plan plus = new Plan(); plus.setNombre("NEGOCIO_PLUS");
        Suscripcion sub = new Suscripcion();
        sub.setPlan(pyme);
        when(subs.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));
        servicio(subs, mock(EmpresaRepository.class), mock(PlanRepository.class), mock(OnvoBillingClient.class))
            .guardarOnvoPricePendiente(10L, plus, "price_plus");
        assertThat(sub.getPlan().getNombre()).isEqualTo("PYME");
        assertThat(sub.getOnvoPriceId()).isEqualTo("price_plus");
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
}
