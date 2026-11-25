package com.hotclick.agente.onboarding;

import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;

/** AG-40: cada 10 min revisa los negocios que dejaron su interés y ya se registraron. ShedLock: un solo pod a la vez. */
@Component
public class OnboardingNegocioScheduler {

    private final OnboardingNegocioService servicio;

    public OnboardingNegocioScheduler(OnboardingNegocioService servicio) {
        this.servicio = servicio;
    }

    @Scheduled(fixedDelayString = "${hotclick.agente.onboarding.barrido-ms:600000}", initialDelay = 120_000)
    @SchedulerLock(name = "agente_onboarding_negocio", lockAtMostFor = "PT10M", lockAtLeastFor = "PT30S")
    public void barrer() {
        servicio.barrer(LocalDateTime.now(Constants.ZONA_CR), Instant.now());
    }
}
