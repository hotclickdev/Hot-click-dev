package com.hotclick.service;

import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.utils.Constants;
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

    private final EmpresaRepository  empresaRepo;
    private final ProductoRepository productoRepo;
    private final UsuarioRepository  usuarioRepo;
    private final BodegaRepository   bodegaRepo;
    private final FeatureFlagService  flagService;

    public TenantService(EmpresaRepository empresaRepo,
                         ProductoRepository productoRepo,
                         UsuarioRepository usuarioRepo,
                         BodegaRepository bodegaRepo,
                         FeatureFlagService flagService) {
        this.empresaRepo  = empresaRepo;
        this.productoRepo = productoRepo;
        this.usuarioRepo  = usuarioRepo;
        this.bodegaRepo   = bodegaRepo;
        this.flagService  = flagService;
    }

    // ── Empresa actual ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Empresa getEmpresaActual() {
        Long id = TenantContext.get();
        if (id == null) return null;
        return empresaRepo.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + id));
    }

    // ── Info del tenant (cacheada) ────────────────────────────────────────────

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

    // ── Uso en tiempo real (sin caché) ────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getTenantUso(Long empresaId) {
        long productos = productoRepo.countProductosActivosByEmpresaId(empresaId);
        long usuarios  = usuarioRepo.countActivosByEmpresaId(empresaId);
        long bodegas   = bodegaRepo.countByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);

        Map<String, Object> uso = new HashMap<>();
        uso.put("productos", productos);
        uso.put("usuarios",  usuarios);
        uso.put("bodegas",   bodegas);
        return uso;
    }

    // ── Features ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public boolean tieneFeature(String feature) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return false;

        Empresa empresa = empresaRepo.findById(empresaId).orElse(null);
        if (empresa == null) return false;
        if ("VENCIDO".equals(empresa.getEstadoPlan())) return false;

        if (flagService.isEnabled(feature, empresaId)) return true;
        if (empresa.getPlan() == null) return false;
        return planTiene(empresa.getPlan(), feature);
    }

    // ── Verificación de límites (puntos de llamada en controllers) ────────────

    /**
     * Verifica que el tenant pueda crear UN producto más.
     * Lanza PlanLimitException (HTTP 403) si el límite ya fue alcanzado.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteProductos(Long empresaId) {
        long uso = productoRepo.countProductosActivosByEmpresaId(empresaId);
        ejecutarVerificacion(empresaId, "productos", uso, 1);
    }

    /**
     * Verifica que el tenant pueda crear {@code cantidad} productos adicionales.
     * Útil para imports bulk: rechaza el lote completo si no hay capacidad suficiente.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteProductosBulk(Long empresaId, int cantidad) {
        long uso = productoRepo.countProductosActivosByEmpresaId(empresaId);
        ejecutarVerificacion(empresaId, "productos", uso, cantidad);
    }

    /**
     * Verifica que el tenant pueda crear UNA bodega más.
     * Lanza PlanLimitException (HTTP 403) si el límite ya fue alcanzado.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteBodegas(Long empresaId) {
        long uso = bodegaRepo.countByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        ejecutarVerificacion(empresaId, "bodegas", uso, 1);
    }

    /**
     * Verifica que el tenant pueda agregar {@code cantidad} bodegas adicionales.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteBodegasBulk(Long empresaId, int cantidad) {
        long uso = bodegaRepo.countByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        ejecutarVerificacion(empresaId, "bodegas", uso, cantidad);
    }

    /**
     * Verifica que el tenant pueda agregar UN usuario de equipo más.
     * Llamar desde el flujo de invitación/creación de staff.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteUsuariosEquipo(Long empresaId) {
        long uso = usuarioRepo.countActivosByEmpresaId(empresaId);
        ejecutarVerificacion(empresaId, "usuarios", uso, 1);
    }

    /**
     * API de bajo nivel: verifica entidad + uso ya calculado por el llamador.
     * Se mantiene por compatibilidad con código existente.
     */
    @Transactional(readOnly = true)
    public void verificarLimite(String entidad, long usoActual) {
        Long empresaId = TenantContext.get();
        if (empresaId == null) return;
        ejecutarVerificacion(empresaId, entidad, usoActual, 1);
    }

    // ── Implementación privada ────────────────────────────────────────────────

    /**
     * Núcleo del chequeo: lee el Plan, obtiene el límite de la entidad,
     * y lanza PlanLimitException si {@code usoActual + cantidad > limite}.
     *
     * @param empresaId   tenant a verificar
     * @param entidad     "productos" | "bodegas" | "usuarios" | "cajas"
     * @param usoActual   cantidad actualmente activa en BD
     * @param cantidad    cuántos ítems adicionales se quieren crear
     */
    private void ejecutarVerificacion(Long empresaId, String entidad, long usoActual, int cantidad) {
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

        if (usoActual + cantidad > limite) {
            long disponibles = Math.max(0, limite - usoActual);
            String label = switch (entidad) {
                case "productos" -> "productos";
                case "usuarios"  -> "usuarios del equipo";
                case "bodegas"   -> "bodegas";
                case "cajas"     -> "cajas registradoras";
                default          -> entidad;
            };

            String mensaje = cantidad == 1
                ? "Has alcanzado el límite de " + label + " de tu plan (" + usoActual + "/" + limite + ")."
                : "No es posible agregar " + cantidad + " " + label + ": tu plan permite " + limite
                  + ", ya tenés " + usoActual + " (" + disponibles + " disponible"
                  + (disponibles == 1 ? "" : "s") + ").";

            String upgrade = "Plan actual: «" + plan.getNombre() + "». "
                + "Ve a Configuración → Suscripción para ampliar tu capacidad.";

            log.warn("[plan-limit] empresa={} entidad={} uso={} cantidad={} limite={}",
                empresaId, entidad, usoActual, cantidad, limite);
            throw new PlanLimitException(mensaje, entidad, upgrade);
        }
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
}
