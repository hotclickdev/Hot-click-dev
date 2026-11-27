package com.hotclick.service.fiscal;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Verificación de la inscripción en Hacienda por un ADMIN de plataforma. El extra de comisión solo se quita al
 * aprobar; rechazar devuelve el negocio a NO_INSCRITO. Un negocio nunca se verifica solo: solo ADMIN, y no desde
 * una sesión de soporte (impersonación).
 */
@Service
public class FiscalVerificacionService {

    public static final int MAX_PENDIENTES = 200;
    static final int MAX_MOTIVO = 200;

    private final EmpresaRepository empresaRepository;
    private final CompanyScope companyScope;
    private final AuditoriaAdminRegistroService auditoria;
    private final FiscalVerificacionAuto verificacionAuto;

    public FiscalVerificacionService(EmpresaRepository empresaRepository, CompanyScope companyScope,
                                     AuditoriaAdminRegistroService auditoria, FiscalVerificacionAuto verificacionAuto) {
        this.verificacionAuto = verificacionAuto;
        this.empresaRepository = empresaRepository;
        this.companyScope = companyScope;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendientes() {
        exigirAdmin();
        return empresaRepository.findFiscalPendientes(PageRequest.of(0, MAX_PENDIENTES)).stream()
            .map(FiscalVerificacionService::filaPendiente).toList();
    }

    private static Map<String, Object> filaPendiente(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("empresaId", e.getId());
        m.put("nombre", e.getNombreComercial() != null && !e.getNombreComercial().isBlank()
            ? e.getNombreComercial() : e.getNombreEmpresa());
        m.put("situacionFiscal", e.getSituacionFiscal());
        m.put("fechaSituacionFiscal", e.getFechaSituacionFiscal());
        m.put("verifAuto", e.getFiscalVerifAuto());
        return m;
    }

    /** Datos declarados por el negocio, para que el ADMIN los compare con Hacienda. */
    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long empresaId) {
        exigirAdmin();
        Empresa e = cargar(empresaId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("empresaId", e.getId());
        m.put("situacionFiscal", e.getSituacionFiscal());
        m.put("cedulaFiscal", e.getCedulaFiscal());
        m.put("nombreFiscal", e.getNombreFiscal());
        m.put("actividadFiscal", e.getActividadFiscal());
        m.put("correoFacturacion", e.getCorreoFacturacion());
        m.put("fechaSituacionFiscal", e.getFechaSituacionFiscal());
        m.put("fiscalVerificado", e.isFiscalVerificado());
        m.put("fechaFiscalVerificado", e.getFechaFiscalVerificado());
        m.put("pendienteVerificacion", pendiente(e));
        // Comprobación automática: lo que respondió Hacienda, para compararlo con lo declarado.
        m.put("verifAuto", e.getFiscalVerifAuto());
        m.put("verifAutoFecha", e.getFiscalVerifAutoFecha());
        m.put("hacienda", FiscalVerificacionAuto.leerDetalle(e.getFiscalVerifAutoDetalle()));
        return m;
    }

    /** "Consultar Hacienda de nuevo": repite la comprobación con los datos ya declarados. No decide nada. */
    @Transactional
    public Map<String, Object> reconsultar(Long empresaId) {
        exigirAdmin();
        Empresa e = cargar(empresaId);
        SituacionFiscal declarada = SituacionFiscal.desde(e.getSituacionFiscal()).orElse(null);
        if (declarada == null || declarada == SituacionFiscal.NO_INSCRITO
            || e.getCedulaFiscal() == null || e.getCedulaFiscal().isBlank()) {
            throw new IllegalStateException("Este negocio no declaró una inscripción para consultar.");
        }
        FiscalVerificacionAuto.Resultado r = verificacionAuto.comprobar(e.getCedulaFiscal(), declarada,
            e.getNombreFiscal(), e.getActividadFiscal());
        e.setFiscalVerifAuto(r.estado());
        e.setFiscalVerifAutoDetalle(r.detalle());
        e.setFiscalVerifAutoFecha(LocalDateTime.now(Constants.ZONA_CR));
        empresaRepository.save(e);
        auditoria.registrar("FISCAL_RECONSULTA", "EMPRESA", e.getId(), e.getId(), r.estado());
        return detalle(empresaId);
    }

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> verificar(Long empresaId, boolean aprobar, String motivo) {
        exigirAdmin();
        Empresa e = cargar(empresaId);
        if (!pendiente(e)) {
            throw new IllegalStateException("Este negocio no tiene una inscripción pendiente de verificar.");
        }
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        e.setFiscalVerificadoPor(companyScope.idActorAuditoria());
        e.setFechaFiscalVerificado(ahora);
        if (aprobar) {
            e.setFiscalVerificado(true);
        } else {
            e.setFiscalVerificado(false);
            e.setSituacionFiscal(SituacionFiscal.NO_INSCRITO.name());
            e.setFechaSituacionFiscal(ahora);
        }
        empresaRepository.save(e);
        // Sin cédula, nombre ni correo: solo la decisión y el motivo que escribió el ADMIN.
        String limpio = motivoLimpio(motivo);
        auditoria.registrar("FISCAL_VERIFICACION", "EMPRESA", e.getId(), e.getId(),
            (aprobar ? "APROBAR" : "RECHAZAR") + (limpio.isEmpty() ? "" : ": " + limpio));
        return detalle(empresaId);
    }

    static boolean pendiente(Empresa e) {
        return SituacionFiscal.desde(e.getSituacionFiscal()).filter(s -> s != SituacionFiscal.NO_INSCRITO).isPresent()
            && e.getCedulaFiscal() != null && !e.getCedulaFiscal().isBlank() && !e.isFiscalVerificado();
    }

    static String motivoLimpio(String motivo) {
        if (motivo == null) return "";
        String t = motivo.replaceAll("[<>\\p{Cntrl}]", " ").trim();
        return t.length() > MAX_MOTIVO ? t.substring(0, MAX_MOTIVO) : t;
    }

    private void exigirAdmin() {
        if (!companyScope.isAdminIT() || companyScope.isImpersonating()) {
            throw new TenantAccessDeniedException("Solo un administrador de plataforma verifica la situación fiscal");
        }
    }

    private Empresa cargar(Long empresaId) {
        return empresaRepository.findById(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
    }
}
