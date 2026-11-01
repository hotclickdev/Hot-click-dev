package com.hotclick.service.suscripcion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Parámetros de la reconsulta de renovación a ONVO (A5-01). Todos salen de la configuración, sin default en código:
 * <ul>
 *   <li>{@code hotclick.billing.dias-gracia}: gracia antes de dar de baja.</li>
 *   <li>{@code hotclick.billing.dias-max-incierta}: M1, días máximos en INCIERTA tras fecha_fin + gracia.</li>
 *   <li>{@code hotclick.billing.max-inciertas-seguidas}: B1, tras N INCIERTA seguidas en una corrida se dejan de
 *       hacer GET a ONVO (0 desactiva el corte).</li>
 *   <li>{@code hotclick.billing.lock-timeout-ms}: espera máxima por el lock de la fila en la transacción por fila
 *       (PostgreSQL); 0 la desactiva.</li>
 * </ul>
 */
@Component
public class OnvoReconsultaConfig {

    private final int diasGracia;
    private final int diasMaxIncierta;
    private final int maxInciertasSeguidas;
    private final int lockTimeoutMs;

    public OnvoReconsultaConfig(@Value("${hotclick.billing.dias-gracia}") int diasGracia,
                                @Value("${hotclick.billing.dias-max-incierta}") int diasMaxIncierta,
                                @Value("${hotclick.billing.max-inciertas-seguidas}") int maxInciertasSeguidas,
                                @Value("${hotclick.billing.lock-timeout-ms}") int lockTimeoutMs) {
        this.diasGracia = Math.max(0, diasGracia);
        this.diasMaxIncierta = Math.max(0, diasMaxIncierta);
        this.maxInciertasSeguidas = Math.max(0, maxInciertasSeguidas);
        this.lockTimeoutMs = Math.max(0, lockTimeoutMs);
    }

    public int diasGracia() { return diasGracia; }

    public int diasMaxIncierta() { return diasMaxIncierta; }

    public int maxInciertasSeguidas() { return maxInciertasSeguidas; }

    public int lockTimeoutMs() { return lockTimeoutMs; }
}
