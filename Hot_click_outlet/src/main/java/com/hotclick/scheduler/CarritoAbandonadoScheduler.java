package com.hotclick.scheduler;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.CarritoAbandonado;
import com.hotclick.service.CarritoAbandonadoService;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "app.abandoned-cart.enabled", havingValue = "true", matchIfMissing = false)
public class CarritoAbandonadoScheduler {

    private static final Logger log = LoggerFactory.getLogger(CarritoAbandonadoScheduler.class);

    @Autowired private CarritoAbandonadoService cartService;
    @Autowired private NotificacionEmailService emailService;
    @Autowired private N8nWebhookService n8nWebhookService;

    @Value("${app.abandoned-cart.hours-to-wait:1}")
    private int hoursToWait;

    @Value("${app.url:https://hotclick.com}")
    private String appUrl;

    @Scheduled(cron = "${app.abandoned-cart.scheduler-cron:0 0 */6 * * *}")
    @SchedulerLock(name = "carrito_abandonado", lockAtMostFor = "PT30M", lockAtLeastFor = "PT10M")
    public void procesarCarritosAbandonados() {
        List<CarritoAbandonado> pendientes = cartService.findPendientesAntiguos(hoursToWait);
        if (pendientes.isEmpty()) return;

        log.info("Scheduler: procesando {} carrito(s) abandonado(s)", pendientes.size());

        for (CarritoAbandonado carrito : pendientes) {
            try {
                List<CarritoAbandonadoRequestDTO.CartItemDTO> itemsDtos =
                    cartService.deserializarItems(carrito.getItems());
                List<java.util.Map<String, Object>> itemsPayload = itemsDtos.stream()
                    .map(i -> java.util.Map.<String, Object>of(
                        "nombre", i.getNombre() != null ? i.getNombre() : "",
                        "cantidad", i.getCantidad(),
                        "precio", i.getPrecio()))
                    .collect(java.util.stream.Collectors.toList());
                n8nWebhookService.notificarCarritoAbandonado(carrito, itemsPayload);

                if (carrito.getEmail() != null && !carrito.getEmail().isBlank()) {
                    emailService.enviarRecuperacionCarrito(carrito.getEmail(), carrito.getId(), itemsDtos, appUrl);
                    cartService.marcarEmailEnviado(carrito.getId());
                    log.info("Email de recuperación enviado a {} (carrito {})",
                        carrito.getEmail(), carrito.getId());
                } else {
                    // No email — mark as expired after 24 h so scheduler doesn't reprocess
                    long hoursOld = java.time.Duration.between(
                        carrito.getCreatedAt(), java.time.LocalDateTime.now()).toHours();
                    if (hoursOld >= 24) {
                        cartService.marcarVencido(carrito.getId());
                    }
                }
            } catch (Exception e) {
                log.error("Error procesando carrito abandonado {}: {}", carrito.getId(), e.getMessage());
            }
        }
    }
}
