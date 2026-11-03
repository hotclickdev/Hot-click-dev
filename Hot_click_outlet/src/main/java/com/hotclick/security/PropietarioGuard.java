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

    /** Miembro activo con rol LECTOR en esa empresa (no aplica a ADMIN de plataforma). */
    public boolean esLector(Long empresaId) {
        if (empresaId == null || companyScope.isAdminIT()) return false;
        Usuario u = companyScope.getCurrentUser();
        if (u == null) return false;
        return miembros.findByUsuarioIdAndEmpresaId(u.getId(), empresaId)
            .map(f -> Integer.valueOf(1).equals(f.getEstado()) && "LECTOR".equals(f.getRolEnEmpresa()))
            .orElse(false);
    }

    /**
     * QA2/QA1 área 2: lecturas de billing, wallet, cobros y facturas. Misma regla que
     * {@link #puedeGestionarEmpresa}: PROPIETARIO (sin impersonación) o ADMIN de plataforma; si no, 403.
     */
    public void exigirGestionEmpresa(Long empresaId) {
        if (!puedeGestionarEmpresa(empresaId)) throw new AccessDeniedException(MSG);
    }

    /** Lanza 403 si el usuario actual no es propietario de la empresa del token. */
    public void exigirPropietario(Long empresaId) {
        if (companyScope.isImpersonating() || !esPropietario(companyScope.getCurrentUser(), empresaId)) {
            throw new AccessDeniedException(MSG);
        }
    }
}
