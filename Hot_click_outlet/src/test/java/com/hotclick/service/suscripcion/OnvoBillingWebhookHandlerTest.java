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
    @InjectMocks OnvoBillingWebhookHandler handler;

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
