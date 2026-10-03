package com.hotclick.service.tenant;

import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class TenantLimitChecker {

    private static final Logger log = LoggerFactory.getLogger(TenantLimitChecker.class);

    private final EmpresaRepository empresaRepo;

    public TenantLimitChecker(EmpresaRepository empresaRepo) {
        this.empresaRepo = empresaRepo;
    }

    /**
     * Verifica que el tenant pueda crear UN producto más.
     * Lanza PlanLimitException (HTTP 403) si el límite ya fue alcanzado.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteProductos(Long empresaId, long uso) {
        ejecutarVerificacion(empresaId, "productos", uso, 1);
    }

    /**
     * Verifica que el tenant pueda crear {@code cantidad} productos adicionales.
     * Útil para imports bulk: rechaza el lote completo si no hay capacidad suficiente.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteProductosBulk(Long empresaId, long uso, int cantidad) {
        ejecutarVerificacion(empresaId, "productos", uso, cantidad);
    }

    /**
     * Verifica que el tenant pueda crear UNA bodega más.
     * Lanza PlanLimitException (HTTP 403) si el límite ya fue alcanzado.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteBodegas(Long empresaId, long uso) {
        ejecutarVerificacion(empresaId, "bodegas", uso, 1);
    }

    /**
     * Verifica que el tenant pueda agregar {@code cantidad} bodegas adicionales.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteBodegasBulk(Long empresaId, long uso, int cantidad) {
        ejecutarVerificacion(empresaId, "bodegas", uso, cantidad);
    }

    /**
     * Verifica que el tenant pueda agregar UN usuario de equipo más.
     * Llamar desde el flujo de invitación/creación de staff.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteUsuariosEquipo(Long empresaId, long uso) {
        ejecutarVerificacion(empresaId, "usuarios", uso, 1);
    }

    /**
     * Cajas del POS (decisión 3.2 A, 3-oct-2026): cada turno abierto ocupa una caja.
     * Límite actual del plan: 1 / 2 / sin tope.
     */
    @Transactional(readOnly = true)
    public void verificarLimiteCajas(Long empresaId, long cajasAbiertas) {
        ejecutarVerificacion(empresaId, "cajas", cajasAbiertas, 1);
    }

    /**
     * API de bajo nivel: verifica entidad + uso ya calculado por el llamador.
     * Se mantiene por compatibilidad con código existente.
     */
    @Transactional(readOnly = true)
    public void verificarLimite(Long empresaId, String entidad, long usoActual) {
        if (empresaId == null) return;
        ejecutarVerificacion(empresaId, entidad, usoActual, 1);
    }

    /**
     * Verifica que el plan de la empresa tenga habilitada una feature booleana
     * (ej. "giftCards"). Lanza PlanLimitException (HTTP 403) si no la tiene.
     */
    @Transactional(readOnly = true)
    public void verificarFeature(Long empresaId, String feature) {
        if (empresaId == null) return;
        Empresa empresa = empresaRepo.findById(empresaId).orElse(null);
        if (empresa == null || empresa.getPlan() == null) return;

        Plan plan = empresa.getPlan();
        boolean habilitada = switch (feature) {
            case "pos"        -> Boolean.TRUE.equals(plan.getTienePos());
            case "crm"        -> Boolean.TRUE.equals(plan.getTieneCrm());
            case "compras"    -> Boolean.TRUE.equals(plan.getTieneCompras());
            case "reportes"   -> Boolean.TRUE.equals(plan.getTieneReportes());
            case "ai"         -> Boolean.TRUE.equals(plan.getTieneAi());
            case "api"        -> Boolean.TRUE.equals(plan.getTieneApi());
            case "giftCards"  -> Boolean.TRUE.equals(plan.getTieneGiftCards());
            default           -> true;
        };
        if (habilitada) return;

        String mensaje = mensajeFuncionBloqueada(feature);
        String upgrade = textoPlanActual(plan.getNombre());

        log.warn("[plan-feature] empresa={} feature={} plan={}", empresaId, feature, plan.getNombre());
        throw new PlanLimitException(mensaje, feature, upgrade);
    }

    /**
     * Núcleo del chequeo: lee el Plan, obtiene el límite de la entidad,
     * y lanza PlanLimitException si {@code usoActual + cantidad > limite}.
     *
     * @param empresaId   tenant a verificar
     * @param entidad     "productos" | "bodegas" | "usuarios" | "cajas"
     * @param usoActual   cantidad actualmente activa en BD
     * @param cantidad    cuántos ítems adicionales se quieren crear
     */
    void ejecutarVerificacion(Long empresaId, String entidad, long usoActual, int cantidad) {
        // IT Admin y otras cuentas de plataforma no están atadas a una empresa —
        // sin tenant no hay plan que verificar, no bloquear la operación.
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

        if (usoActual + cantidad > limite) {
            long disponibles = Math.max(0, limite - usoActual);
            String mensaje = mensajeLimitePlan(entidad, cantidad, usoActual, limite, disponibles);
            String upgrade = textoPlanActual(plan.getNombre());

            log.warn("[plan-limit] empresa={} entidad={} uso={} cantidad={} limite={}",
                empresaId, entidad, usoActual, cantidad, limite);
            throw new PlanLimitException(mensaje, entidad, upgrade);
        }
    }

    /** Textos de planes.bloqueo.* (textos-planes-final.md §8): en vos, sin rutas que no existen en el panel. */
    static String mensajeFuncionBloqueada(String feature) {
        return switch (feature) {
            case "compras"   -> "Registrá tus compras a proveedores desde el plan Pyme. Tu inventario lo seguís viendo igual.";
            case "giftCards" -> "Vendé gift cards desde el plan Pyme.";
            case "ai"        -> "Las consultas de IA están en Pyme y Negocio Plus.";
            default          -> "Esta función está desde el plan Pyme.";
        };
    }

    /** Textos de planes.bloqueo.limite.* (textos-planes-final.md §8). */
    static String mensajeLimitePlan(String entidad, int cantidad, long usoActual, long limite, long disponibles) {
        if (cantidad > 1 && "productos".equals(entidad)) {
            return "Podés agregar " + disponibles + " más: tu plan permite " + limite + " y ya tenés " + usoActual + ".";
        }
        return switch (entidad) {
            case "productos" -> "Tu plan permite " + limite + " productos y ya tenés " + usoActual
                + ". Para publicar más, mejorá tu plan.";
            case "bodegas"   -> "Tu plan permite " + limite + " bodega(s). Para agregar otra, mejorá tu plan.";
            case "cajas"     -> "Tu plan permite " + limite + " caja(s) abierta(s). Cerrá una o mejorá tu plan.";
            case "usuarios"  -> "Tu plan permite " + limite + " usuarios en tu equipo. Para invitar a alguien más, mejorá tu plan.";
            default          -> "Llegaste al límite de tu plan (" + usoActual + " de " + limite + "). Mejorá tu plan para seguir.";
        };
    }

    static String textoPlanActual(String planNombre) {
        String nombre = switch (planNombre == null ? "" : planNombre) {
            case "EMPRENDEDOR"  -> "Emprendedor";
            case "PYME"         -> "Pyme";
            case "NEGOCIO_PLUS" -> "Negocio Plus";
            default             -> planNombre;
        };
        return "Tu plan actual es " + nombre + ".";
    }
}
