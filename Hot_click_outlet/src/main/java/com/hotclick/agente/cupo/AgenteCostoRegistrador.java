package com.hotclick.agente.cupo;

import com.hotclick.agente.motor.CostoAgenteListener;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.ResendEmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Engancha el costo por llamada del motor: lo suma al mes del negocio y avisa al dueño por correo UNA sola vez por
 * mes al llegar al 80 % y al 100 % del tope de gasto (el cierre del cupo lo hace {@link AgenteCupoService}).
 * El aviso no lleva datos de clientes. Best-effort: un fallo aquí nunca afecta la respuesta al cliente.
 */
@Component
public class AgenteCostoRegistrador implements CostoAgenteListener {

    private static final Logger log = LoggerFactory.getLogger(AgenteCostoRegistrador.class);
    private static final BigDecimal OCHENTA = new BigDecimal("0.80");

    private final AgenteUsoRepositorio uso;
    private final AgenteCupoConfig config;
    private final EmpresaRepository empresas;
    private final ResendEmailService correo;

    public AgenteCostoRegistrador(AgenteUsoRepositorio uso, AgenteCupoConfig config, EmpresaRepository empresas,
                                  ResendEmailService correo) {
        this.uso = uso;
        this.config = config;
        this.empresas = empresas;
        this.correo = correo;
    }

    @Override
    public void costo(Long empresaId, double usd) {
        if (!(usd > 0)) return;
        try {
            LocalDate mes = config.mesActual();
            BigDecimal total = uso.sumarCosto(empresaId, mes, BigDecimal.valueOf(usd).setScale(6, RoundingMode.HALF_UP));
            if (empresaId != null) avisarSiCorresponde(empresaId, mes, total);
        } catch (RuntimeException e) {
            log.warn("[agente-cupo] no se pudo registrar el costo empresa={}: {}", empresaId, e.getClass().getSimpleName());
        }
    }

    private void avisarSiCorresponde(Long empresaId, LocalDate mes, BigDecimal total) {
        Empresa empresa = empresas.findByIdWithPlan(empresaId).orElse(null);
        Plan plan = empresa == null ? null : empresa.getPlan();
        BigDecimal tope = config.topeUsd(plan == null ? null : plan.getNombre());
        if (tope.signum() <= 0) return;
        BigDecimal ochenta = tope.multiply(OCHENTA);
        if (total.compareTo(ochenta) < 0) return;
        // Primero el 100 %: si el gasto ya lo pasó, el aviso del 80 % queda reclamado sin enviarse (no hay dos correos).
        if (total.compareTo(tope) >= 0 && uso.reclamarAviso(empresaId, mes, true, tope, config.reloj().instant())) {
            uso.reclamarAviso(empresaId, mes, false, ochenta, config.reloj().instant());
            enviar(empresa, true);
        } else if (uso.reclamarAviso(empresaId, mes, false, ochenta, config.reloj().instant())) {
            enviar(empresa, false);
        }
    }

    private void enviar(Empresa empresa, boolean cien) {
        if (empresa == null || empresa.getCorreoEmpresa() == null) return;
        String asunto = cien ? "Tu asistente de ventas se detuvo por llegar al tope de gasto del mes"
                             : "Tu asistente de ventas llegó al 80 % de su tope de gasto del mes";
        String cuerpo = cien
            ? "<p>El asistente de ventas con IA de tu negocio llegó al 100 % del tope de gasto de este mes. "
              + "Mientras tanto, las conversaciones nuevas pasan a la Bandeja para que las atiendas vos o tu equipo. "
              + "El asistente vuelve a responder el mes siguiente.</p>"
            : "<p>El asistente de ventas con IA de tu negocio llegó al 80 % del tope de gasto de este mes. "
              + "Al llegar al 100 % dejará de responder y las conversaciones nuevas pasarán a la Bandeja.</p>";
        try {
            correo.send(empresa.getCorreoEmpresa(), asunto, cuerpo);
        } catch (RuntimeException e) {
            log.warn("[agente-cupo] no se pudo enviar el aviso de tope: {}", e.getClass().getSimpleName());
        }
    }
}
