package com.hotclick.service;

import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Registra en hot_click_auditoria_admin_tb las ediciones directas que un
 * ADMIN de plataforma hace sobre recursos de negocios ajenos (pedidos,
 * productos) sin impersonar. No escribe nada cuando el actor no es ADMIN
 * (ej. un EMPRENDEDOR editando su propio negocio) — mismo criterio que el
 * bypass de {@link CompanyScope#assertCanAccessNullable}.
 *
 * <p>{@link #registrar} escribe siempre (cualquier rol), para acciones sensibles del propio negocio
 * como la confirmación manual de un pago o el cambio de estado de un pedido (SEC-05).
 */
@Service
public class AuditoriaAdminRegistroService {

    @Autowired private AuditoriaAdminRepository auditoriaAdminRepository;
    @Autowired private CompanyScope companyScope;

    public void registrarSiAdmin(String accion, String entidad, Long entidadId, Long empresaId, String detalle) {
        if (!companyScope.isAdminIT()) return;
        registrar(accion, entidad, entidadId, empresaId, detalle);
    }

    /** Registra siempre, con el usuario autenticado (ADMIN, EMPRENDEDOR o miembro) como actor. */
    public void registrar(String accion, String entidad, Long entidadId, Long empresaId, String detalle) {
        AuditoriaAdmin audit = new AuditoriaAdmin();
        audit.setAdminId(companyScope.idActorAuditoria());
        audit.setAdminEmail(companyScope.correoActorAuditoria());
        audit.setAccion(accion);
        audit.setEntidad(entidad);
        audit.setEntidadId(entidadId);
        audit.setEmpresaId(empresaId);
        audit.setDetalle(detalle != null && detalle.length() > 500 ? detalle.substring(0, 500) : detalle);
        audit.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        auditoriaAdminRepository.save(audit);
    }

    /**
     * Escritura hecha dentro de «Ver como el negocio»: actor = admin original (claims del token
     * de soporte), empresa vista, método, ruta y status HTTP. La fecha es la del registro.
     */
    public void registrarEscrituraImpersonacion(Long adminOriginalId, String adminOriginalCorreo,
                                                Long empresaId, String metodo, String ruta, int status) {
        AuditoriaAdmin audit = new AuditoriaAdmin();
        audit.setAdminId(adminOriginalId);
        audit.setAdminEmail(adminOriginalCorreo);
        audit.setAccion("IMPERSONACION_ESCRITURA");
        audit.setEntidad("HTTP");
        audit.setEmpresaId(empresaId);
        audit.setEntidadId(empresaId);
        String detalle = metodo + " " + ruta + " -> " + status + " (empresa " + empresaId + ")";
        audit.setDetalle(detalle.length() > 500 ? detalle.substring(0, 500) : detalle);
        audit.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        auditoriaAdminRepository.save(audit);
    }
}
