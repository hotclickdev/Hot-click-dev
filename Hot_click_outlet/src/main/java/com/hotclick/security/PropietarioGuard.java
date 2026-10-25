package com.hotclick.security;

import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * P9-04 / P10-02: acciones irreversibles o de dinero del negocio (borrar datos, pedir retiros)
 * solo para el PROPIETARIO. Los miembros de equipo (EDITOR, LECTOR, …) llevan rol Spring
 * EMPRENDEDOR, así que el rol solo no alcanza. Sesión de soporte (impersonación) tampoco.
 */
@Component
public class PropietarioGuard {

    public static final String MSG = "Solo el propietario del negocio puede hacer esto.";

    private final CompanyScope companyScope;
    private final MiembroEmpresaRepository miembros;

    public PropietarioGuard(CompanyScope companyScope, MiembroEmpresaRepository miembros) {
        this.companyScope = companyScope;
        this.miembros = miembros;
    }

    public boolean esPropietario(Usuario u, Long empresaId) {
        if (u == null || empresaId == null) return false;
        var fila = miembros.findByUsuarioIdAndEmpresaId(u.getId(), empresaId);
        if (fila.isPresent()) {
            return Integer.valueOf(1).equals(fila.get().getEstado())
                && "PROPIETARIO".equals(fila.get().getRolEnEmpresa());
        }
        // Dueños antiguos sin fila en miembro_empresa: el negocio está en su usuario.
        return empresaId.equals(u.getEmpresaId());
    }

    /**
     * QA3-012/017/019: guarda única de rol de empresa para acciones de gestión del negocio
     * (equipo, plan, visibilidad, datos fiscales y .p12). Pasa el PROPIETARIO de la empresa
     * (sin sesión de soporte) o el ADMIN de plataforma; EDITOR/LECTOR/ADMIN de equipo, no.
     */
    public boolean puedeGestionarEmpresa(Long empresaId) {
        if (companyScope.isAdminIT()) return true;
        return !companyScope.isImpersonating() && esPropietario(companyScope.getCurrentUser(), empresaId);
    }

    /** Roles de equipo con deny por defecto en escrituras (ver LectorSoloLecturaInterceptor). */
    public static final java.util.Set<String> ROLES_RESTRINGIDOS = java.util.Set.of("LECTOR", "CAJERO");

    /** Miembro activo con rol LECTOR en esa empresa (no aplica a ADMIN de plataforma). */
    public boolean esLector(Long empresaId) {
        return "LECTOR".equals(rolRestringido(empresaId));
    }

    /**
     * Rol restringido (LECTOR o CAJERO) del usuario actual como miembro activo de esa empresa, o null si no
     * aplica (sin empresa, ADMIN de plataforma, sin membresía activa, o rol EDITOR/ADMIN/PROPIETARIO).
     */
    public String rolRestringido(Long empresaId) {
        if (empresaId == null || companyScope.isAdminIT()) return null;
        Usuario u = companyScope.getCurrentUser();
        if (u == null) return null;
        return miembros.findByUsuarioIdAndEmpresaId(u.getId(), empresaId)
            .filter(f -> Integer.valueOf(1).equals(f.getEstado()) && ROLES_RESTRINGIDOS.contains(f.getRolEnEmpresa()))
            .map(f -> f.getRolEnEmpresa())
            .orElse(null);
    }

    /** Lanza 403 si el usuario actual no es propietario de la empresa del token. */
    public void exigirPropietario(Long empresaId) {
        if (companyScope.isImpersonating() || !esPropietario(companyScope.getCurrentUser(), empresaId)) {
            throw new AccessDeniedException(MSG);
        }
    }
}
