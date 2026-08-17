package com.hotclick.service.sinpe;

import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
class SinpeAuditSupport {

    @Autowired private AuditoriaAdminRepository auditoriaRepository;

    void registrarAuditoria(Long adminId, String adminEmail,
                            String accion, String entidad,
                            Long entidadId, String detalle) {
        AuditoriaAdmin audit = new AuditoriaAdmin();
        audit.setAdminId(adminId);
        audit.setAdminEmail(adminEmail);
        audit.setAccion(accion);
        audit.setEntidad(entidad);
        audit.setEntidadId(entidadId);
        audit.setDetalle(detalle);
        audit.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        auditoriaRepository.save(audit);
    }
}
