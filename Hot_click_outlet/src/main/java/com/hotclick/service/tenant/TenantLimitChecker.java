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
     * API de bajo nivel: verifica entidad + uso ya calculado por el llamador.
     * Se mantiene por compatibilidad con código existente.
     */
    @Transactional(readOnly = true)
    public void verificarLimite(Long empresaId, String entidad, long usoActual) {
        if (empresaId == null) return;
        ejecutarVerificacion(empresaId, entidad, usoActual, 1);
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
            String label = switch (entidad) {
                case "productos" -> "productos";
                case "usuarios"  -> "usuarios del equipo";
                case "bodegas"   -> "bodegas";
                case "cajas"     -> "cajas registradoras";
                default          -> entidad;
            };

            String mensaje = mensajeLimitePlan(cantidad, label, usoActual, limite, disponibles);

            String upgrade = "Plan actual: «" + plan.getNombre() + "». "
                + "Ve a Configuración → Suscripción para ampliar tu capacidad.";

            log.warn("[plan-limit] empresa={} entidad={} uso={} cantidad={} limite={}",
                empresaId, entidad, usoActual, cantidad, limite);
            throw new PlanLimitException(mensaje, entidad, upgrade);
        }
    }

    private static String mensajeLimitePlan(int cantidad, String label, long usoActual, long limite, long disponibles) {
        if (cantidad == 1) {
            return "Has alcanzado el límite de " + label + " de tu plan (" + usoActual + "/" + limite + ").";
        }
        String plural = disponibles == 1 ? "" : "s";
        return "No es posible agregar " + cantidad + " " + label + ": tu plan permite " + limite
            + ", ya tenés " + usoActual + " (" + disponibles + " disponible" + plural + ").";
    }
}
