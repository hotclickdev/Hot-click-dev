package com.hotclick.service.fiscal;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Punto único para saber qué comisión paga un negocio. La Fase 3 lo usa para fijar
 * {@code marketplaceAppFee} de la cuenta conectada en ONVO; no llama a ONVO desde acá.
 */
@Service
public class ComisionEfectivaService {

    private final ConfiguracionFiscalService config;

    public ComisionEfectivaService(ConfiguracionFiscalService config) { this.config = config; }

    public ComisionEfectiva.Desglose paraEmpresa(Empresa empresa) {
        Plan plan = empresa.getPlan();
        return desglose(plan != null ? plan.getComisionPorcentaje() : null, empresa.getSituacionFiscal(),
            empresa.isFiscalVerificado());
    }

    /** Variante para quien ya resolvió el plan (p. ej. por suscripción) y solo tiene el porcentaje. */
    public ComisionEfectiva.Desglose desglose(BigDecimal planPct, String situacionFiscal) {
        return desglose(planPct, situacionFiscal, false);
    }

    public ComisionEfectiva.Desglose desglose(BigDecimal planPct, String situacionFiscal, boolean verificado) {
        return ComisionEfectiva.calcular(planPct, SituacionFiscal.desde(situacionFiscal).orElse(null), verificado,
            config.reglas().extraNoInscritoPct());
    }

    /** Porcentaje efectivo (plan + extra si no hay inscripción verificada), con 2 decimales. */
    public BigDecimal porcentajeEfectivo(Empresa empresa) {
        return paraEmpresa(empresa).efectivaPct();
    }
}
