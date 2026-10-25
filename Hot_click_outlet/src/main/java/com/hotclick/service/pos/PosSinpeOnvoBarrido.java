package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Timeout propio del SINPE POS por ONVO: un intent SINPE no vence solo en ONVO, así que las sesiones
 * pendientes ya vencidas se pasan por {@link PosQrVentaService#verificarEstado}, que cierra la venta si
 * ONVO la dio por pagada o cancela el intent y expira la sesión.
 */
@Component
public class PosSinpeOnvoBarrido {

    private static final Logger log = LoggerFactory.getLogger(PosSinpeOnvoBarrido.class);

    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired private PosQrVentaService ventaService;
    @Autowired private PosSinpeOnvoService sinpeOnvo;

    @Scheduled(fixedDelayString = "${pos.sinpe-onvo.barrido-ms:60000}", initialDelayString = "${pos.sinpe-onvo.barrido-ms:60000}")
    @SchedulerLock(name = "pos_sinpe_onvo_barrido", lockAtMostFor = "PT5M", lockAtLeastFor = "PT10S")
    public void barrer() {
        barrerVencidos();
    }

    int barrerVencidos() {
        int cerradas = 0;
        var ahora = sinpeOnvo.ahora();
        for (PosQrSesion s : posQrRepo.findByEstadoAndStripeSessionIdStartingWith("PENDIENTE", PosSinpeOnvoService.PREFIJO_ONVO_PI)) {
            if (PosQrVentaService.estaVigente(s, ahora)) continue;
            try {
                if (!"PENDIENTE".equals(ventaService.verificarEstado(s.getToken()))) cerradas++;
            } catch (RuntimeException e) {
                log.warn("[POS-SINPE-ONVO] Barrido sesión {}: {}", PosQrVentaService.mascararToken(s.getToken()), e.getMessage());
            }
        }
        return cerradas;
    }
}
