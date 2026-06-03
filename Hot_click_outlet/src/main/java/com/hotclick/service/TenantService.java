package com.hotclick.service;

import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class TenantService {

    private static final Logger log = LoggerFactory.getLogger(TenantService.class);

    private final EmpresaRepository empresaRepo;
    private final ProductoRepository productoRepo;
    private final UsuarioRepository usuarioRepo;
    private final FeatureFlagService flagService;

    public TenantService(EmpresaRepository empresaRepo,
                         ProductoRepository productoRepo,
                         UsuarioRepository usuarioRepo,
                         FeatureFlagService flagService) {
        this.empresaRepo  = empresaRepo;
        this.productoRepo = productoRepo;
        this.usuarioRepo  = usuarioRepo;
        this.flagService  = flagService;
    }

    /**
     * Retorna la empresa del tenant activo (del TenantContext del thread actual).
     * Lanza NoSuchElementException si el empresaId no existe en BD.
     */
    @Transactional(readOnly = true)
    public Empresa getEmpresaActual() {
        Long id = TenantContext.get();
        if (id == null) return null;
        return empresaRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + id));
    }

    /**
     * Construye el mapa de info del tenant para el endpoint /api/tenant/info.
     * Cache con TTL de 2 min (Caffeine spec en application.properties).
     */
    @Cacheable(value = "tenantInfo", key = "#empresaId")
    @Transactional(readOnly = true)
    public Map<String, Object> getTenantInfo(Long empresaId) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + empresaId));

        Plan plan = empresa.getPlan();
        Map<String, Object> info = new HashMap<>();

        // Plan
        info.put("planNombre",   plan != null ? plan.getNombre() : "FREE");
        info.put("planId",       plan != null ? plan.getId()     : null);
        info.put("estadoPlan",   empresa.getEstadoPlan());
        info.put("trialDias",    empresa.getTrialDiasRestantes());
        info.put("fechaVenc",    empresa.getFechaVencPlan());
        info.put("timezone",     empresa.getTimezone());

        // Límites del plan
        if (plan != null) {
            info.put("maxUsuarios",  plan.getMaxUsuarios());
            info.put("maxProductos", plan.getMaxProductos());
            info.put("maxBodegas",   plan.getMaxBodegas());
            info.put("maxCajas",     plan.getMaxCajas());
        }

        // Features: plan base + overrides individuales de empresa
        java.util.Set<String> flagsEmpresa = flagService.getFlagsActivosParaEmpresa(empresaId);
        Map<String, Boolean> features = new HashMap<>();
        features.put("pos",      planTiene(plan, "pos")      || flagsEmpresa.contains("pos"));
        features.put("crm",      planTiene(plan, "crm")      || flagsEmpresa.contains("crm"));
        features.put("compras",  planTiene(plan, "compras")  || flagsEmpresa.contains("compras"));
        features.put("reportes", planTiene(plan, "reportes") || flagsEmpresa.contains("reportes"));
        features.put("ai",       planTiene(plan, "ai")       || flagsEmpresa.contains("ai_copilot"));
        features.put("api",      planTiene(plan, "api")      || flagsEmpresa.contains("api_keys"));
        features.put("facturacion_electronica", flagsEmpresa.contains("facturacion_electronica"));
        features.put("mobile_pos",   flagsEmpresa.contains("mobile_pos"));
        features.put("self_checkout", flagsEmpresa.contains("self_checkout"));
        features.put("split_payments", flagsEmpresa.contains("split_payments"));
        features.put("white_label",   flagsEmpresa.contains("white_label"));
        info.put("features", features);

        return info;
    }

    /**
     * Uso actual del tenant (productos activos, usuarios activos).
     * No cacheado — debe reflejar el estado real en tiempo real.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getTenantUso(Long empresaId) {
        long productos = productoRepo.countProductosActivosByEmpresaId(empresaId);
        long usuarios  = usuarioRepo.countActivosByEmpresaId(empresaId);

        Map<String, Object> uso = new HashMap<>();
        uso.put("productos", productos);
        uso.put("usuarios",  usuarios);
        return uso;
    }

    /**
     * Verifica si la empresa actual tiene una feature activa.
     * Combina: flag de plan base + override individual de empresa (FeatureFlagService).
     * Retorna false si no hay TenantContext o no hay plan asignado.
     */
    @Transactional(readOnly = true)
    public boolean tieneFeature(String feature) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return false;

        Empresa empresaCheck = empresaRepo.findById(empresaId).orElse(null);
        if (empresaCheck == null) return false;
        if ("VENCIDO".equals(empresaCheck.getEstadoPlan())) return false;

        // Primero verificar override individual de empresa (más rápido, cacheado)
        if (flagService.isEnabled(feature, empresaId)) return true;

        // Fallback al plan base
        if (empresaCheck.getPlan() == null) return false;
        return planTiene(empresaCheck.getPlan(), feature);
    }

    private boolean planTiene(Plan plan, String feature) {
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

    /**
     * Verifica el límite de una entidad para la empresa actual.
     * Lanza PlanLimitException (HTTP 402) si el uso actual alcanzó el máximo del plan.
     *
     * Uso:
     *   tenantService.verificarLimite("productos", productoRepo.countProductosActivosByEmpresaId(id));
     */
    @Transactional(readOnly = true)
    public void verificarLimite(String entidad, long usoActual) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return;

        Empresa empresa = empresaRepo.findById(empresaId).orElse(null);
        if (empresa == null || empresa.getPlan() == null) return;

        Plan plan = empresa.getPlan();
        int limite = switch (entidad) {
            case "productos" -> plan.getMaxProductos();
            case "usuarios"  -> plan.getMaxUsuarios();
            case "bodegas"   -> plan.getMaxBodegas();
            case "cajas"     -> plan.getMaxCajas();
            default          -> -1;
        };

        if (limite == -1) return; // ilimitado

        if (usoActual >= limite) {
            log.warn("[tenant-limit] empresa={} entidad={} uso={} limite={}", empresaId, entidad, usoActual, limite);
            throw new PlanLimitException(
                "Límite de " + entidad + " alcanzado (" + usoActual + "/" + limite + "). " +
                "Actualiza tu plan para continuar."
            );
        }
    }
}
