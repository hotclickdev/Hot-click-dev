package com.hotclick.scheduler;

import com.hotclick.model.WebhookEvent;
import com.hotclick.payment.PayPalPaymentProvider;
import com.hotclick.repository.WebhookEventRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Reintenta webhooks de PayPal que quedaron sin procesar por errores transitorios.
 *
 * Un webhook queda con procesado=false cuando:
 *   - El procesamiento async lanzó una excepción después de guardar el registro
 *   - La BD tuvo un fallo temporal durante la actualización del estado
 *
 * Corre cada 5 minutos. ShedLock garantiza un solo pod ejecuta en multi-pod.
 * Solo reintenta eventos con más de 5 minutos de antigüedad para no colisionar
 * con el procesamiento async original que puede aún estar en vuelo.
 */
@Component
public class WebhookRetryScheduler {

    private static final Logger log = LoggerFactory.getLogger(WebhookRetryScheduler.class);

    private static final int MINUTOS_ESPERA  = 5;
    private static final int MAX_REINTENTOS = 5;

    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private PayPalPaymentProvider  payPalProvider;

    @Scheduled(fixedDelay = 300_000)
    @SchedulerLock(name = "webhook_retry_paypal", lockAtMostFor = "PT4M", lockAtLeastFor = "PT1M")
    public void reintentarPendientes() {
        LocalDateTime corte = LocalDateTime.now().minusMinutes(MINUTOS_ESPERA);
        List<WebhookEvent> pendientes = webhookEventRepository.findPendientesParaReintento(corte);

        if (pendientes.isEmpty()) return;

        int elegibles = 0;
        int agotados  = 0;
        for (WebhookEvent evento : pendientes) {
            if (evento.getIntentosReintento() >= MAX_REINTENTOS) {
                agotados++;
                continue;
            }
            elegibles++;
            try {
                payPalProvider.reintentarProcesamiento(evento);
            } catch (Exception e) {
                log.error("[webhook-retry] Error no manejado eventId={}: {}", evento.getMerchantToken(), e.getMessage());
            }
        }
        if (elegibles > 0)
            log.info("[webhook-retry] {} reintentado(s), {} agotado(s) (>= {} intentos)", elegibles, agotados, MAX_REINTENTOS);
        else if (agotados > 0)
            log.warn("[webhook-retry] {} webhook(s) agotados sin procesar — revisar manualmente", agotados);
    }
}
