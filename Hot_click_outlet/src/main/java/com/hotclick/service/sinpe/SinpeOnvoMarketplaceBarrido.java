package com.hotclick.service.sinpe;

import com.hotclick.model.Pago;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** P-01: cancela en ONVO los intents SINPE del marketplace con el plazo interno cumplido. */
@Component
public class SinpeOnvoMarketplaceBarrido {

    private static final Logger log = LoggerFactory.getLogger(SinpeOnvoMarketplaceBarrido.class);

    @Autowired private SinpeOnvoMarketplaceService service;

    @Scheduled(fixedDelayString = "${sinpe.onvo.barrido-ms:60000}", initialDelayString = "${sinpe.onvo.barrido-ms:60000}")
    @SchedulerLock(name = "sinpe_onvo_marketplace_barrido", lockAtMostFor = "PT5M", lockAtLeastFor = "PT10S")
    public void barrer() {
        int liberados = 0;
        for (Pago p : service.vencidos()) {
            try {
                if (service.cancelarVencido(p)) liberados++;
            } catch (RuntimeException e) {
                log.warn("[SINPE-ONVO] Barrido pago {}: {}", p.getId(), e.getMessage());
            }
        }
        if (liberados > 0) log.info("[SINPE-ONVO] Barrido: {} pagos vencidos liberados", liberados);
        revisarCerrados();
    }

    /** N-01: cerrados recientes con intent ONVO: si ONVO los cobró quedan REEMBOLSO_PENDIENTE. */
    void revisarCerrados() {
        int cobrados = 0;
        for (Pago p : service.reclamarCerradosRecientes()) {
            try {
                if (service.revisarCerrado(p) == SinpeOnvoMarketplaceService.Resultado.COBRADO_SOBRE_CANCELADO) cobrados++;
            } catch (RuntimeException e) {
                log.warn("[SINPE-ONVO] Revisión de cerrado pago {}: {}", p.getId(), e.getClass().getSimpleName());
            }
        }
        if (cobrados > 0) log.error("[ALERTA-PAGO] Barrido SINPE-ONVO: {} cobros sobre pedidos cancelados", cobrados);
    }
}
