package com.hotclick.scheduler;

import com.hotclick.utils.Constants;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.suscripcion.SuscripcionOnvoChangeService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Subidas a Negocio Plus sin pagar: pasado el plazo ({@code hotclick.onvo.reemplazo-pendiente-horas}, 24 h por defecto;
 * la doc de ONVO lista {@code incomplete_expired} pero no da el plazo) se cancela la suscripción nueva en ONVO. La vieja
 * no se toca. Acotado: un lote por corrida, con ShedLock para que lo corra un solo pod.
 */
@Component
public class OnvoReemplazoPendienteScheduler {

    private static final Logger log = LoggerFactory.getLogger(OnvoReemplazoPendienteScheduler.class);
    static final int LOTE = 50;

    private final SuscripcionRepository suscripcionRepo;
    private final SuscripcionOnvoChangeService cambio;
    private final long horas;

    public OnvoReemplazoPendienteScheduler(SuscripcionRepository suscripcionRepo, SuscripcionOnvoChangeService cambio,
                                           @Value("${hotclick.onvo.reemplazo-pendiente-horas:24}") long horas) {
        this.suscripcionRepo = suscripcionRepo;
        this.cambio = cambio;
        this.horas = Math.max(1, horas);
    }

    @Scheduled(fixedDelayString = "PT30M", initialDelayString = "PT10M")
    @SchedulerLock(name = "onvo_reemplazo_pendiente", lockAtMostFor = "PT20M", lockAtLeastFor = "PT1M")
    public void expirarProgramado() {
        expirar(LocalDateTime.now(Constants.ZONA_CR));
    }

    /** Expira las subidas vencidas a {@code ahora}. Devuelve cuántas canceló. */
    public int expirar(LocalDateTime ahora) {
        LocalDateTime limite = ahora.minusHours(horas);
        List<Long> ids = suscripcionRepo.idsReemplazoPendienteVencido(limite, PageRequest.of(0, LOTE));
        int n = 0;
        for (Long id : ids) {
            try {
                if (cambio.expirarReemplazoPendiente(id, limite)) n++;
            } catch (RuntimeException e) {
                log.error("[ALERTA-PAGO] [onvo] no se pudo expirar la subida pendiente fila={} causa={}",
                    id, e.getClass().getSimpleName());
            }
        }
        if (n > 0) log.info("[onvo] {} subida(s) sin pagar vencida(s) y cancelada(s)", n);
        return n;
    }
}
