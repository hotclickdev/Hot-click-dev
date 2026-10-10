package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Vista de soporte: el ADMIN sigue siendo él (identidad en el JWT), pero opera
 * acotado al tenant de la empresa elegida. Queda en auditoría al iniciar y al salir.
 */
@Service
public class ImpersonacionService {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private AuditoriaAdminRepository auditoriaAdminRepository;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyScope companyScope;
    @Autowired private TokenRevocadoService tokenRevocadoService;

    /** Largo mínimo del motivo para habilitar escritura en soporte. */
    public static final int MOTIVO_ESCRITURA_MIN = 15;

    @Transactional
    public Map<String, Object> iniciar(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));

        MiembroEmpresa propietario = miembroEmpresaRepository.findByEmpresaIdAndEstado(empresaId, 1).stream()
            .filter(m -> "PROPIETARIO".equals(m.getRolEnEmpresa()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("La empresa no tiene un propietario activo para impersonar"));

        Usuario objetivo = propietario.getUsuario();
        Usuario admin = companyScope.getCurrentUser();
        // QA-130-4: un admin de plataforma no entra como soporte al negocio de otro admin.
        if (esAdmin(objetivo) && !objetivo.getId().equals(admin.getId())) {
            throw new TenantAccessDeniedException("No podés ver como negocio la empresa de otro administrador");
        }
        String nombreAdmin = admin.getNombre() != null ? admin.getNombre() : admin.getCorreo().split("@")[0];

        String token = jwtUtil.generateImpersonationToken(
            admin.getCorreo(), admin.getId(), Constants.ROL_EMPRENDEDOR,
            empresaId, empresa.getSlug(), admin.getId(), admin.getCorreo());

        registrarAuditoria(admin.getId(), admin.getCorreo(), "IMPERSONACION_INICIO", empresaId,
            "Admin " + admin.getCorreo() + " vio como negocio a " + objetivo.getCorreo()
                + " (" + empresa.getNombreEmpresa() + ")" + sesion(token));

        Map<String, Object> data = new HashMap<>();
        data.put("accessToken", token);
        data.put("id", admin.getId());
        data.put("correo", admin.getCorreo());
        data.put("rol", Constants.ROL_EMPRENDEDOR);
        data.put("nombre", nombreAdmin);
        data.put("empresaId", empresaId);
        data.put("empresaSlug", empresa.getSlug() != null ? empresa.getSlug() : "");
        data.put("empresaNombre",
            empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        data.put("permisos", List.of());
        data.put("modo", JwtUtil.MODO_LECTURA);
        return data;
    }

    /**
     * Cierra la sesión de soporte: revoca el jti del token (denylist hasta su exp)
     * y deja el evento en auditoría con el admin original.
     */
    @Transactional
    public void finalizar(Long empresaId, String rawToken) {
        if (!jwtUtil.isImpersonationToken(rawToken)) {
            throw new IllegalStateException("No hay una sesión de impersonación activa en este token");
        }
        Long adminId = jwtUtil.extractAdminOriginalId(rawToken);
        String adminCorreo = jwtUtil.extractAdminOriginalCorreo(rawToken);
        // QA-130-2: la empresa auditada es la de la sesión (token), no la del path.
        Long empresaSesion = jwtUtil.extractEmpresaId(rawToken);
        Long empresaAuditada = empresaSesion != null ? empresaSesion : empresaId;
        tokenRevocadoService.revocar(rawToken, TokenRevocadoService.MOTIVO_IMPERSONACION_FIN);
        String nota = empresaSesion != null && !empresaSesion.equals(empresaId)
            ? " (la ruta decía empresa " + empresaId + ")" : "";
        registrarAuditoria(adminId, adminCorreo, "IMPERSONACION_FIN", empresaAuditada,
            "Admin " + adminCorreo + " finalizó impersonación de empresa " + empresaAuditada + nota + sesion(rawToken));
    }

    /**
     * Pasa la sesión de soporte a modo escritura: exige motivo, revoca el token de lectura,
     * emite uno de escritura (máx. 10 min, sin pasar el vencimiento original) y lo audita.
     */
    @Transactional
    public Map<String, Object> habilitarEscritura(Long empresaId, String rawToken, String motivo) {
        if (!jwtUtil.isImpersonationToken(rawToken)) {
            throw new IllegalStateException("No hay una sesión de impersonación activa en este token");
        }
        Long empresaToken = jwtUtil.extractEmpresaId(rawToken);
        if (empresaToken == null || !empresaToken.equals(empresaId)) {
            throw new IllegalStateException("La sesión de soporte no corresponde a este negocio");
        }
        String motivoLimpio = motivo == null ? "" : motivo.strip();
        if (motivoLimpio.length() < MOTIVO_ESCRITURA_MIN) {
            throw new IllegalArgumentException(
                "Escribí un motivo de al menos " + MOTIVO_ESCRITURA_MIN + " caracteres para habilitar la escritura");
        }
        if (motivoLimpio.length() > 300) motivoLimpio = motivoLimpio.substring(0, 300);
        Long adminId = jwtUtil.extractAdminOriginalId(rawToken);
        String adminCorreo = jwtUtil.extractAdminOriginalCorreo(rawToken);
        String nuevo = jwtUtil.generateImpersonationWriteToken(rawToken, motivoLimpio);
        tokenRevocadoService.revocar(rawToken, TokenRevocadoService.MOTIVO_IMPERSONACION_ESCRITURA);
        registrarAuditoria(adminId, adminCorreo, "IMPERSONACION_ESCRITURA_HABILITADA", empresaId,
            "Admin " + adminCorreo + " habilitó escritura en empresa " + empresaId + ". Motivo: " + motivoLimpio
                + sesion(rawToken));
        Map<String, Object> data = new HashMap<>();
        data.put("accessToken", nuevo);
        data.put("modo", JwtUtil.MODO_ESCRITURA);
        data.put("expiraEn", jwtUtil.extractExpiration(nuevo).getTime());
        return data;
    }

    private String sesion(String token) {
        String id = jwtUtil.extractSesionSoporte(token);
        return id != null ? " [sesión " + id + "]" : "";
    }

    private static boolean esAdmin(Usuario u) {
        return u.getRoles() != null && u.getRoles().stream().anyMatch(r -> Constants.ROL_ADMIN.equals(r.getNombreRol()));
    }

    private void registrarAuditoria(Long adminId, String adminCorreo, String accion, Long empresaId, String detalle) {
        AuditoriaAdmin audit = new AuditoriaAdmin();
        audit.setAdminId(adminId);
        audit.setAdminEmail(adminCorreo);
        audit.setAccion(accion);
        audit.setEntidad("EMPRESA");
        audit.setEntidadId(empresaId);
        audit.setEmpresaId(empresaId);
        audit.setDetalle(detalle != null && detalle.length() > 500 ? detalle.substring(0, 500) : detalle);
        audit.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        auditoriaAdminRepository.save(audit);
    }
}
