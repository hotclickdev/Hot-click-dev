package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * Política del primer mes gratis de PYME / NEGOCIO_PLUS: una sola vez por negocio, sin cupo, y sin perder nunca los
 * días que le queden del trial Emprendedor. Función pura (no escribe): quien persiste el alta marca
 * {@code primer_mes_gratis_usado_en} dentro del mismo lock de fila.
 */
@Service
public class TrialPlanesPagoService {

    private final TrialPlanesPagoConfig config;

    public TrialPlanesPagoService(TrialPlanesPagoConfig config) {
        this.config = config;
    }

    /** true si el plan está en la lista, hay días configurados y el negocio nunca usó el primer mes gratis. */
    public boolean elegible(Empresa empresa, String planDestino) {
        return empresa != null && config.diasOferta(planDestino) > 0 && empresa.getPrimerMesGratisUsadoEn() == null;
    }

    /**
     * Días de trial para un alta de plan de pago: si es elegible, max(días que quedan de Emprendedor, N); si no, solo
     * los días de Emprendedor que queden (comportamiento previo, nunca se pierden). 0 = cobro inmediato.
     */
    public int diasTrial(Empresa empresa, String planDestino, LocalDate hoy) {
        return aplicar(empresa, planDestino, TrialEmprendedorService.diasRestantes(empresa, hoy));
    }

    /** Igual que {@link #diasTrial} pero partiendo de unos días base ya calculados (p. ej. los de la suscripción vieja). */
    public int aplicar(Empresa empresa, String planDestino, int diasBase) {
        return elegible(empresa, planDestino) ? Math.max(diasBase, config.dias()) : diasBase;
    }

    /** Marca que el negocio ya recibió el primer mes gratis (solo si el plan era elegible y se concedieron días). */
    public boolean marcarSiCorresponde(Empresa empresa, String planDestino, int diasConcedidos) {
        if (diasConcedidos > 0 && elegible(empresa, planDestino)) {
            empresa.setPrimerMesGratisUsadoEn(java.time.LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR));
            return true;
        }
        return false;
    }
}
