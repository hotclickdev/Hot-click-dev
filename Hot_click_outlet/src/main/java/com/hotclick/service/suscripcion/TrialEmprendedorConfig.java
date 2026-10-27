package com.hotclick.service.suscripcion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Configuración del trial del plan Emprendedor: cuántos negocios lo reciben y cuántos días dura.
 * Nada va fijo en código: {@code hotclick.trial-emprendedor.cupo} (TRIAL_EMPRENDEDOR_CUPO, por defecto 70) y
 * {@code hotclick.trial-emprendedor.dias} (TRIAL_EMPRENDEDOR_DIAS, por defecto 90).
 * Valores inválidos (días fuera de 1..365, cupo negativo) abortan el arranque: nunca se regala un trial por un typo.
 */
@Component
public class TrialEmprendedorConfig {

    static final int MAX_DIAS = 365;

    private final int cupo;
    private final int dias;

    public TrialEmprendedorConfig(@Value("${hotclick.trial-emprendedor.cupo:70}") int cupo,
                                  @Value("${hotclick.trial-emprendedor.dias:90}") int dias) {
        if (cupo < 0) {
            throw new IllegalStateException("hotclick.trial-emprendedor.cupo no puede ser negativo");
        }
        if (dias < 1 || dias > MAX_DIAS) {
            throw new IllegalStateException("hotclick.trial-emprendedor.dias debe estar entre 1 y " + MAX_DIAS);
        }
        this.cupo = cupo;
        this.dias = dias;
    }

    /** Cantidad de negocios que reciben trial (los primeros N). */
    public int cupo() {
        return cupo;
    }

    /** Duración del trial en días (es el {@code trialPeriodDays} que se manda a ONVO). */
    public int dias() {
        return dias;
    }
}
