package com.hotclick.service.suscripcion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.StripeEvento;
import com.hotclick.repository.StripeEventoRepository;
import com.hotclick.service.SuscripcionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Webhook billing ONVO")
class OnvoBillingWebhookHandlerTest {

    @Mock StripeEventoRepository eventoRepo;
    @Mock SuscripcionService suscripcionService;
    @Mock com.hotclick.service.OnvoService onvoService;
    @Mock OnvoBillingDespachoTx despachoTx;
    @InjectMocks OnvoBillingWebhookHandler handler;

    @org.junit.jupiter.api.BeforeEach
    void txDirecta() {
        org.mockito.Mockito.lenient().doAnswer(inv -> { ((Runnable) inv.getArgument(0)).run(); return null; })
            .when(despachoTx).ejecutar(any());
        org.mockito.Mockito.lenient().when(onvoService.modoEsperado()).thenReturn("live");
    }

    private void eventoNuevo(String id) {
        when(eventoRepo.findByIdForUpdate(id)).thenReturn(Optional.empty());
        when(eventoRepo.findById(id)).thenReturn(Optional.empty()).thenReturn(Optional.of(evento(id)));
        when(eventoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private StripeEvento ultimoGuardado() {
        var cap = org.mockito.ArgumentCaptor.forClass(StripeEvento.class);
        verify(eventoRepo, org.mockito.Mockito.atLeastOnce()).save(cap.capture());
        return cap.getValue();
    }

    @Test
    @DisplayName("Rechazo de negocio (suscripción inexistente): RECHAZADO y auditado, sin excepción")
    void rechazoDeNegocioQuedaAuditado() throws Exception {
        eventoNuevo("onvo_evt_rech");
        org.mockito.Mockito.doThrow(new com.hotclick.exception.RecursoNoEncontradoException("Suscripción ONVO", "sub_x"))
            .when(suscripcionService).procesarPagoOnvoExitoso(any(), any(), any());
        var data = mapper.readTree("{\"id\":\"sub_x\",\"metadata\":{\"empresa_id\":\"10\",\"plan_id\":\"2\"}}");
        assertThat(handler.procesar("subscription.renewal.succeeded", data, "evt_rech"))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        assertThat(ultimoGuardado().getError()).startsWith(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO);
    }

    @Test
    @DisplayName("Evento de otro modo (test con llave live): RECHAZADO sin despachar")
    void eventoDeOtroModo() throws Exception {
        eventoNuevo("onvo_evt_modo");
        var data = mapper.readTree("{\"id\":\"sub_m\",\"mode\":\"test\",\"metadata\":{\"empresa_id\":\"10\",\"plan_id\":\"2\"}}");
        assertThat(handler.procesar("subscription.renewal.succeeded", data, "evt_modo"))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.RECHAZADO);
        verify(suscripcionService, never()).procesarPagoOnvoExitoso(any(), any(), any());
        assertThat(ultimoGuardado().getError()).startsWith(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO);
    }

    @Test
    @DisplayName("Reentrega de un evento ya rechazado: DUPLICADO, no se reprocesa")
    void reentregaDeRechazadoEsDuplicado() throws Exception {
        StripeEvento rech = evento("onvo_evt_r2");
        rech.setError(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO + "x");
        when(eventoRepo.findByIdForUpdate("onvo_evt_r2")).thenReturn(Optional.of(rech));
        var data = mapper.readTree("{\"id\":\"sub_r\"}");
        assertThat(handler.procesar("subscription.renewal.failed", data, "evt_r2"))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.DUPLICADO);
        verify(suscripcionService, never()).procesarRenovacionOnvoFallida(any());
    }

    @Test
    @DisplayName("Tipo de billing desconocido: se registra como procesado sin efectos")
    void tipoDesconocido() throws Exception {
        eventoNuevo("onvo_evt_unk");
        var data = mapper.readTree("{\"id\":\"sub_u\"}");
        assertThat(handler.procesar("subscription.trial_will_end", data, "evt_unk"))
            .isEqualTo(OnvoBillingWebhookHandler.Resultado.PROCESADO);
        assertThat(ultimoGuardado().getProcesadoOk()).isTrue();
    }

    @Test
    @DisplayName("Fallo de BD es transitorio: se relanza (5xx) y no queda marcado como rechazado")
    void falloBdSeRelanza() throws Exception {
        eventoNuevo("onvo_evt_bd");
        org.mockito.Mockito.doThrow(new org.springframework.dao.QueryTimeoutException("timeout"))
            .when(suscripcionService).procesarRenovacionOnvoFallida(any());
        var data = mapper.readTree("{\"id\":\"sub_bd\"}");
        org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> handler.procesar("subscription.renewal.failed", data, "evt_bd"))
            .isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(ultimoGuardado().getError()).doesNotStartWith(OnvoBillingWebhookHandler.PREFIJO_RECHAZADO);
    }

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("Renovación exitosa activa el plan")
    void renovacionExitosaActiva() throws Exception {
        when(eventoRepo.findByIdForUpdate("onvo_evt_1")).thenReturn(Optional.empty());
        when(eventoRepo.findById("onvo_evt_1")).thenReturn(Optional.empty())
            .thenReturn(Optional.of(evento("onvo_evt_1")));
        when(eventoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var data = mapper.readTree("""
            {"id":"sub_abc","metadata":{"empresa_id":"10","plan_id":"2"}}
            """);

        boolean handled = handler.manejarSiBilling("subscription.renewal.succeeded", data, "evt_1");

        assertThat(handled).isTrue();
        verify(suscripcionService).procesarPagoOnvoExitoso(10L, "sub_abc", 2L);
    }

    @Test
    @DisplayName("Evento duplicado no vuelve a activar")
    void eventoDuplicadoNoReprocesa() throws Exception {
        StripeEvento yaOk = evento("onvo_evt_dup");
        yaOk.setProcesadoOk(true);
        when(eventoRepo.findByIdForUpdate("onvo_evt_dup")).thenReturn(Optional.of(yaOk));

        var data = mapper.readTree("""
            {"id":"sub_abc","metadata":{"empresa_id":"10","plan_id":"2"}}
            """);

        boolean handled = handler.manejarSiBilling("subscription.renewal.succeeded", data, "evt_dup");

        assertThat(handled).isTrue();
        verify(suscripcionService, never()).procesarPagoOnvoExitoso(any(), any(), any());
    }

    @Test
    @DisplayName("payment-intent de tienda sin meta billing se ignora")
    void paymentIntentSinMetaNoEsBilling() throws Exception {
        var data = mapper.readTree("{\"id\":\"pi_tienda\"}");
        boolean handled = handler.manejarSiBilling("payment-intent.succeeded", data, "evt_x");
        assertThat(handled).isFalse();
        verify(suscripcionService, never()).procesarPagoOnvoExitoso(any(), any(), any());
    }

    @Test
    @DisplayName("Renovación fallida marca PAST_DUE")
    void renovacionFallida() throws Exception {
        when(eventoRepo.findByIdForUpdate("onvo_evt_fail")).thenReturn(Optional.empty());
        when(eventoRepo.findById("onvo_evt_fail")).thenReturn(Optional.empty())
            .thenReturn(Optional.of(evento("onvo_evt_fail")));
        when(eventoRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var data = mapper.readTree("{\"id\":\"sub_fail\"}");
        assertThat(handler.manejarSiBilling("subscription.renewal.failed", data, "evt_fail")).isTrue();
        verify(suscripcionService, times(1)).procesarRenovacionOnvoFallida(eq("sub_fail"));
    }

    private static StripeEvento evento(String id) {
        StripeEvento e = new StripeEvento();
        e.setStripeEventId(id);
        e.setProcesadoOk(false);
        return e;
    }
}
