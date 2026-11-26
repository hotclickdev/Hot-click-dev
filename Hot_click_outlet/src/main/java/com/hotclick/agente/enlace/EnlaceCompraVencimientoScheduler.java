package com.hotclick.agente.enlace;

import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/** Vence los enlaces a las 24 h y devuelve al stock las reservas de 30 min cumplidas (AG-07 / AG-09). */
@Component
public class EnlaceCompraVencimientoScheduler {

    private static final Logger log = LoggerFactory.getLogger(EnlaceCompraVencimientoScheduler.class);

    private final EnlaceCompraRepository repo;
    private final EnlaceCompraReserva reserva;

    public EnlaceCompraVencimientoScheduler(EnlaceCompraRepository repo, EnlaceCompraReserva reserva) {
        this.repo = repo;
        this.reserva = reserva;
    }

    @Scheduled(fixedDelayString = "${hotclick.agente.enlace.barrido-ms:120000}", initialDelay = 60_000)
    @SchedulerLock(name = "agente_enlace_compra_vencimiento", lockAtMostFor = "PT10M", lockAtLeastFor = "PT30S")
    public void barrer() {
        barrer(LocalDateTime.now(Constants.ZONA_CR));
    }

    /** Devuelve cuántos enlaces cambiaron. Un fallo en uno no frena a los demás. */
    int barrer(LocalDateTime ahora) {
        int cambios = 0;
        List<Long> reservas = repo.idsConReservaVencida(ahora);
        List<Long> vencer = repo.idsParaVencer(ahora);
        for (Long id : reservas) cambios += procesar(id, false, ahora);
        for (Long id : vencer) cambios += procesar(id, true, ahora);
        if (cambios > 0) log.info("[enlace] barrido: {} enlace(s) actualizados", cambios);
        return cambios;
    }

    private int procesar(Long id, boolean vencer, LocalDateTime ahora) {
        try {
            return reserva.liberarYVencer(id, vencer, ahora) ? 1 : 0;
        } catch (RuntimeException ex) {
            log.warn("[enlace] no se pudo procesar el vencimiento: {}", ex.getClass().getSimpleName());
            return 0;
        }
    }
}
