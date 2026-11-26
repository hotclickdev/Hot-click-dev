package com.hotclick.service.suscripcion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Primer mes gratis de los planes de pago: {@code hotclick.trial-planes-pago.dias} (TRIAL_PLANES_PAGO_DIAS, por defecto
 * 30; 0 lo desactiva) y {@code hotclick.trial-planes-pago.planes} (TRIAL_PLANES_PAGO_PLANES, por defecto
 * PYME,NEGOCIO_PLUS). Días fuera de 0..365 o un plan que no sea PYME/NEGOCIO_PLUS abortan el arranque.
 */
@Component
public class TrialPlanesPagoConfig {

    static final int MAX_DIAS = 365;
    private static final Set<String> PLANES_PERMITIDOS = Set.of("PYME", "NEGOCIO_PLUS");

    private final int dias;
    private final Set<String> planes;

    public TrialPlanesPagoConfig(@Value("${hotclick.trial-planes-pago.dias:30}") int dias,
                                 @Value("${hotclick.trial-planes-pago.planes:PYME,NEGOCIO_PLUS}") String planes) {
        if (dias < 0 || dias > MAX_DIAS) {
            throw new IllegalStateException("hotclick.trial-planes-pago.dias debe estar entre 0 y " + MAX_DIAS);
        }
        Set<String> lista = new LinkedHashSet<>();
        if (planes != null) {
            Arrays.stream(planes.split(","))
                .map(p -> p.trim().toUpperCase(Locale.ROOT))
                .filter(p -> !p.isEmpty())
                .forEach(lista::add);
        }
        for (String p : lista) {
            if (!PLANES_PERMITIDOS.contains(p)) {
                throw new IllegalStateException("hotclick.trial-planes-pago.planes solo admite PYME y NEGOCIO_PLUS: " + p);
            }
        }
        this.dias = dias;
        this.planes = Set.copyOf(lista);
    }

    /** Días gratis (el {@code trialPeriodDays} que se manda a ONVO); 0 = desactivado. */
    public int dias() {
        return dias;
    }

    public Set<String> planes() {
        return planes;
    }

    /** Oferta genérica del plan (no por negocio): los días si el plan está en la lista y hay días; si no, 0. */
    public int diasOferta(String planNombre) {
        return planNombre != null && dias > 0 && planes.contains(planNombre.toUpperCase(Locale.ROOT)) ? dias : 0;
    }

    public static boolean esPlanDePagoConTrial(String planNombre) {
        return planNombre != null && PLANES_PERMITIDOS.contains(planNombre.toUpperCase(Locale.ROOT));
    }
}
