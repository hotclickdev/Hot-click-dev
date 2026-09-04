package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.JwtUtil;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Impersonación de soporte: permite a un ADMIN de plataforma actuar
 * temporalmente como el propietario de una empresa para diagnosticar un
 * problema reportado, sin conocer su contraseña. Queda registrado en la
 * auditoría admin al iniciar y al salir.
 */
@Service
public class ImpersonacionService {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private AuditoriaAdminRepository auditoriaAdminRepository;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyScope companyScope;

    public Map<String, Object> iniciar(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));

        MiembroEmpresa propietario = miembroEmpresaRepository.findByEmpresaIdAndEstado(empresaId, 1).stream()
            .filter(m -> "PROPIETARIO".equals(m.getRolEnEmpresa()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("La empresa no tiene un propietario activo para impersonar"));

        Usuario objetivo = propietario.getUsuario();
        Usuario admin = companyScope.getCurrentUser();

        String token = jwtUtil.generateImpersonationToken(
            objetivo.getCorreo(), objetivo.getId(), propietario.getRolEnEmpresa(),
            empresaId, empresa.getSlug(), admin.getId(), admin.getCorreo());

        registrarAuditoria(admin.getId(), admin.getCorreo(), "IMPERSONACION_INICIO", empresaId,
            "Admin " + admin.getCorreo() + " impersonó a " + objetivo.getCorreo()
                + " (" + empresa.getNombreEmpresa() + ")");

        Map<String, Object> data = new HashMap<>();
        data.put("accessToken", token);
        data.put("id", objetivo.getId());
        data.put("correo", objetivo.getCorreo());
        data.put("rol", propietario.getRolEnEmpresa());
        data.put("nombre", objetivo.getNombre());
        data.put("empresaId", empresaId);
        data.put("empresaSlug", empresa.getSlug() != null ? empresa.getSlug() : "");
        data.put("empresaNombre",
            empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        data.put("permisos", List.of());
        return data;
    }

    /**
     * Cierra la sesión de impersonación: no invalida el token (expira solo,
     * 30 min) sino que deja el evento en auditoría. El admin identificado
     * viene del propio token de impersonación (claims adminOriginalId/Correo),
     * no de CompanyScope, porque en este punto el usuario autenticado es el
     * objetivo impersonado, no el admin.
     */
    public void finalizar(Long empresaId, String rawToken) {
        if (!jwtUtil.isImpersonationToken(rawToken)) {
            throw new IllegalStateException("No hay una sesión de impersonación activa en este token");
        }
        Long adminId = jwtUtil.extractAdminOriginalId(rawToken);
        String adminCorreo = jwtUtil.extractAdminOriginalCorreo(rawToken);
        registrarAuditoria(adminId, adminCorreo, "IMPERSONACION_FIN", empresaId,
            "Admin " + adminCorreo + " finalizó impersonación de empresa " + empresaId);
    }

    private void registrarAuditoria(Long adminId, String adminCorreo, String accion, Long empresaId, String detalle) {
        AuditoriaAdmin audit = new AuditoriaAdmin();
        audit.setAdminId(adminId);
        audit.setAdminEmail(adminCorreo);
        audit.setAccion(accion);
        audit.setEntidad("EMPRESA");
        audit.setEntidadId(empresaId);
        audit.setDetalle(detalle);
        audit.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        auditoriaAdminRepository.save(audit);
    }
}
