package com.hotclick.service.fiscal;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.CedulaCr;
import com.hotclick.utils.Constants;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Situación fiscal de un negocio y el flujo "Ya me inscribí". Aislamiento por CompanyScope. */
@Service
public class EmpresaFiscalService {

    /** Datos del formulario "Ya me inscribí". */
    public record Inscripcion(String situacion, String cedula, String nombre, String actividad, String correo) {}

    private final EmpresaRepository empresaRepository;
    private final CompanyScope companyScope;
    private final ComisionEfectivaService comisionEfectiva;
    private final ConfiguracionFiscalService config;
    private final AuditoriaAdminRegistroService auditoria;

    public EmpresaFiscalService(EmpresaRepository empresaRepository, CompanyScope companyScope,
                                ComisionEfectivaService comisionEfectiva, ConfiguracionFiscalService config,
                                AuditoriaAdminRegistroService auditoria) {
        this.empresaRepository = empresaRepository;
        this.companyScope = companyScope;
        this.comisionEfectiva = comisionEfectiva;
        this.config = config;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtener(Long empresaId) {
        return vista(cargar(empresaId));
    }

    /** Primera declaración (la situación aún es null). Cambiar después exige el flujo de inscripción. */
    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> declarar(Long empresaId, String situacion) {
        Empresa e = cargar(empresaId);
        SituacionFiscal s = SituacionFiscal.desde(situacion)
            .orElseThrow(() -> new IllegalArgumentException("Situación fiscal inválida."));
        if (e.getSituacionFiscal() != null) {
            throw new IllegalStateException("La situación fiscal ya fue declarada.");
        }
        e.setSituacionFiscal(s.name());
        e.setFechaSituacionFiscal(LocalDateTime.now(Constants.ZONA_CR));
        empresaRepository.save(e);
        auditoria.registrar("FISCAL_SITUACION_DECLARADA", "EMPRESA", e.getId(), e.getId(), s.name());
        return vista(e);
    }

    /** "Ya me inscribí": datos fiscales + situación INSCRITO o REGIMEN_SIMPLIFICADO; la comisión vuelve a la del plan. */
    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> registrarInscripcion(Long empresaId, Inscripcion in) {
        Empresa e = cargar(empresaId);
        SituacionFiscal s = SituacionFiscal.desde(in.situacion()).orElse(null);
        if (s != SituacionFiscal.INSCRITO && s != SituacionFiscal.REGIMEN_SIMPLIFICADO) {
            throw new IllegalArgumentException("Elegí Inscrito o Régimen Simplificado.");
        }
        String cedula = CedulaCr.realONulo(in.cedula());
        if (cedula == null) {
            throw new IllegalArgumentException("La cédula no es válida: física 9 dígitos, jurídica 10, DIMEX 11 o 12.");
        }
        e.setSituacionFiscal(s.name());
        e.setCedulaFiscal(cedula);
        e.setNombreFiscal(texto(in.nombre(), "El nombre como aparece en Hacienda", 2, 150));
        e.setActividadFiscal(texto(in.actividad(), "La actividad económica", 2, 150));
        e.setCorreoFacturacion(correo(in.correo()));
        e.setFechaSituacionFiscal(LocalDateTime.now(Constants.ZONA_CR));
        empresaRepository.save(e);
        // Sin la cédula ni el correo en el detalle de auditoría.
        auditoria.registrar("FISCAL_INSCRIPCION", "EMPRESA", e.getId(), e.getId(), s.name());
        return vista(e);
    }

    private Empresa cargar(Long empresaId) {
        Empresa e = empresaRepository.findById(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
        companyScope.assertCanAccess(e.getId());
        return e;
    }

    private Map<String, Object> vista(Empresa e) {
        ComisionEfectiva.Desglose d = comisionEfectiva.paraEmpresa(e);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("situacionFiscal", e.getSituacionFiscal());
        m.put("cedulaFiscal", e.getCedulaFiscal());
        m.put("nombreFiscal", e.getNombreFiscal());
        m.put("actividadFiscal", e.getActividadFiscal());
        m.put("correoFacturacion", e.getCorreoFacturacion());
        m.put("fechaSituacionFiscal", e.getFechaSituacionFiscal());
        m.put("comisionPlanPct", d.planPct());
        m.put("comisionExtraPct", d.extraPct());
        m.put("comisionEfectivaPct", d.efectivaPct());
        m.put("diasEnviarFactura", config.reglas().diasEnviarFactura());
        return m;
    }

    private static String texto(String v, String etiqueta, int min, int max) {
        String t = v == null ? "" : v.replaceAll("[<>]", "").trim();
        if (t.length() < min || t.length() > max) {
            throw new IllegalArgumentException(etiqueta + " necesita entre " + min + " y " + max + " caracteres.");
        }
        return t;
    }

    private static String correo(String v) {
        String t = v == null ? "" : v.trim().toLowerCase(Locale.ROOT);
        if (t.length() > 150 || !t.matches("^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+$")) {
            throw new IllegalArgumentException("El correo para facturas no parece válido.");
        }
        return t;
    }
}
