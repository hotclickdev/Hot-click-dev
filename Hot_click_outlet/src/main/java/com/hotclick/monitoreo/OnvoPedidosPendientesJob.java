package com.hotclick.monitoreo;

import com.hotclick.repository.PagoRepository;
import com.hotclick.service.TelegramService;
import io.sentry.Sentry;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;

/** INF-03: avisa si hay pedidos ONVO en PENDIENTE desde hace más del límite (webhook perdido). */
@Component
public class OnvoPedidosPendientesJob {

    private final PagoRepository pagos;
    private final TelegramService telegram;
    private final int minutos;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public OnvoPedidosPendientesJob(PagoRepository pagos, TelegramService telegram,
                                    @Value("${onvo.alertas.pendiente-minutos:30}") int minutos) {
        this(pagos, telegram, minutos, Clock.systemDefaultZone());
    }

    OnvoPedidosPendientesJob(PagoRepository pagos, TelegramService telegram, int minutos, Clock clock) {
        this.pagos = pagos;
        this.telegram = telegram;
        this.minutos = Math.max(1, minutos);
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "PT10M", initialDelayString = "PT5M")
    @SchedulerLock(name = "onvo-pedidos-pendientes", lockAtMostFor = "PT9M", lockAtLeastFor = "PT1M")
    public long revisar() {
        LocalDateTime corte = LocalDateTime.now(clock).minusMinutes(minutos);
        long n = pagos.countByProveedorIgnoreCaseAndEstadoPagoAndFechaCreacionBefore("ONVO", "PENDIENTE", corte);
        if (n > 0) {
            String texto = "⚠️ " + n + " pedido(s) ONVO pendientes hace más de " + minutos + " min (posible webhook perdido).";
            telegram.enviar(texto);
            Sentry.captureMessage(texto);
        }
        return n;
    }
}
