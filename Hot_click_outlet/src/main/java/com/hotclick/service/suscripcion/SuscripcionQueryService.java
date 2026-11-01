package com.hotclick.service.suscripcion;

import com.hotclick.model.FacturaSaas;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.FacturaSaasRepository;
import com.hotclick.repository.SuscripcionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SuscripcionQueryService {

    @Autowired private SuscripcionRepository suscripcionRepo;
    @Autowired private FacturaSaasRepository facturaRepo;
    @Autowired(required = false) private com.hotclick.repository.EmpresaRepository empresaRepo;
    @Autowired(required = false) private com.hotclick.repository.PlanRepository planRepo;

    @Transactional(readOnly = true)
    public Map<String, Object> getSuscripcionInfo(Long empresaId) {
        Optional<Suscripcion> subOpt = suscripcionRepo.findActivaByEmpresaId(empresaId);
        Map<String, Object> info = new HashMap<>();

        if (subOpt.isEmpty()) {
            info.put("estado", "SIN_SUSCRIPCION");
            // QA3-P01: sin fila de suscripción se muestra el plan real del negocio (p. ej. NEGOCIO_PLUS asignado),
            // no un FREE fijo. Solo si el negocio no tiene plan se cae a FREE.
            Plan real = planRealEmpresa(empresaId);
            info.put("planNombre", real != null ? real.getNombre() : "FREE");
            if (real != null) info.put("planId", real.getId());
            return info;
        }

        Suscripcion sub = subOpt.get();
        Plan plan = sub.getPlan();
        info.put("id", sub.getId());
        info.put("estado", sub.getEstado());
        info.put("planNombre", plan.getNombre());
        info.put("planId", plan.getId());
        info.put("fechaInicio", sub.getFechaInicio());
        info.put("fechaFin", sub.getFechaFin());
        info.put("trialEnd", sub.getTrialEnd());
        info.put("cancelarAlVencer", sub.getCancelarAlVencer());
        info.put("tieneStripe", sub.getStripeSubscriptionId() != null);
        // QA3-023: plan elegido que espera la confirmación de ONVO (el vigente sigue en planNombre).
        Plan pendiente = sub.getPlanPendiente();
        if (pendiente != null) {
            info.put("planPendienteNombre", pendiente.getNombre());
            info.put("planPendienteId", pendiente.getId());
        }
        return info;
    }

    private Plan planRealEmpresa(Long empresaId) {
        if (empresaRepo == null) return null;
        var empresa = empresaRepo.findById(empresaId).orElse(null);
        if (empresa == null) return null;
        if (empresa.getPlan() != null) return empresa.getPlan();
        if (empresa.getPlanSaas() != null && planRepo != null) return planRepo.findByNombre(empresa.getPlanSaas()).orElse(null);
        return null;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFacturas(Long empresaId, int pagina) {
        var page = facturaRepo.findByEmpresaIdOrderByFechaCreacionDesc(
            empresaId, PageRequest.of(pagina, 20));
        return page.stream().map(f -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", f.getId());
            m.put("stripeInvoiceId", f.getStripeInvoiceId());
            m.put("montoCentavos", f.getMontoCentavos());
            m.put("moneda", f.getMoneda());
            m.put("estado", f.getEstado());
            m.put("periodoInicio", f.getPeriodoInicio());
            m.put("periodoFin", f.getPeriodoFin());
            m.put("urlPdf", f.getUrlPdf());
            m.put("fechaCreacion", f.getFechaCreacion());
            return m;
        }).toList();
    }
}
