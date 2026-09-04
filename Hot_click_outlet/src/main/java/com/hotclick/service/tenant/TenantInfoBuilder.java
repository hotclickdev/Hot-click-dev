package com.hotclick.service.tenant;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.FeatureFlagService;
import com.hotclick.service.wallet.AggregatorCommissionMath;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@Component
public class TenantInfoBuilder {

    private final EmpresaRepository empresaRepo;
    private final FeatureFlagService flagService;

    /** Mismo mínimo que AggregatorService aplica al liquidar EMPRENDEDOR — se expone para que el frontend pueda estimar la comisión antes de confirmar una venta. */
    @Value("${hotclick.comision.emprendedor.min.crc:400}")
    private long minimoEmprendedorCrc;

    public TenantInfoBuilder(EmpresaRepository empresaRepo, FeatureFlagService flagService) {
        this.empresaRepo = empresaRepo;
        this.flagService = flagService;
    }

    @Cacheable(value = "tenantInfo", key = "#empresaId")
    @Transactional(readOnly = true)
    public Map<String, Object> getTenantInfo(Long empresaId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + empresaId));

        Plan plan = empresa.getPlan();
        Map<String, Object> info = new HashMap<>();

        info.put("planNombre",   plan != null ? plan.getNombre() : "Sin plan");
        info.put("planId",       plan != null ? plan.getId()     : null);
        info.put("estadoPlan",   empresa.getEstadoPlan());
        info.put("trialDias",    empresa.getTrialDiasRestantes());
        info.put("fechaVenc",    empresa.getFechaVencPlan());
        info.put("timezone",     empresa.getTimezone());

        if (plan != null) {
            info.put("maxUsuarios",    plan.getMaxUsuarios());
            info.put("maxProductos",   plan.getMaxProductos());
            info.put("maxBodegas",     plan.getMaxBodegas());
            info.put("maxCajas",       plan.getMaxCajas());
            info.put("maxCreditosAi",  plan.getMaxCreditosAi());
            info.put("comisionPorcentaje", plan.getComisionPorcentaje());
            info.put("comisionMinimaCrc",
                AggregatorCommissionMath.aplicaMinimoEmprendedor(plan.getNombre()) ? minimoEmprendedorCrc : 0L);
        }

        java.util.Set<String> flagsEmpresa = flagService.getFlagsActivosParaEmpresa(empresaId);
        Map<String, Boolean> features = new HashMap<>();
        features.put("pos",      planTiene(plan, "pos")      || flagsEmpresa.contains("pos"));
        features.put("crm",      planTiene(plan, "crm")      || flagsEmpresa.contains("crm"));
        features.put("compras",  planTiene(plan, "compras")  || flagsEmpresa.contains("compras"));
        features.put("reportes", planTiene(plan, "reportes") || flagsEmpresa.contains("reportes"));
        features.put("ai",       planTiene(plan, "ai")       || flagsEmpresa.contains("ai_copilot"));
        features.put("api",      planTiene(plan, "api")      || flagsEmpresa.contains("api_keys"));
        features.put("facturacion_electronica", flagsEmpresa.contains("facturacion_electronica"));
        features.put("mobile_pos",    flagsEmpresa.contains("mobile_pos"));
        features.put("self_checkout", flagsEmpresa.contains("self_checkout"));
        features.put("split_payments", flagsEmpresa.contains("split_payments"));
        features.put("white_label",   flagsEmpresa.contains("white_label"));
        info.put("features", features);

        return info;
    }

    public boolean planTiene(Plan plan, String feature) {
        if (plan == null) return false;
        return switch (feature) {
            case "pos"      -> Boolean.TRUE.equals(plan.getTienePos());
            case "crm"      -> Boolean.TRUE.equals(plan.getTieneCrm());
            case "compras"  -> Boolean.TRUE.equals(plan.getTieneCompras());
            case "reportes" -> Boolean.TRUE.equals(plan.getTieneReportes());
            case "ai"       -> Boolean.TRUE.equals(plan.getTieneAi());
            case "api"      -> Boolean.TRUE.equals(plan.getTieneApi());
            default         -> false;
        };
    }
}
