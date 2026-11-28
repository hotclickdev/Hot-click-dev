package com.hotclick.service.fiscal;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.CedulaCr;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Verificación de la inscripción en Hacienda por un ADMIN de plataforma. El extra de comisión solo se quita al
 * aprobar; rechazar devuelve el negocio a NO_INSCRITO. Un negocio nunca se verifica solo: solo ADMIN, y no desde
 * una sesión de soporte (impersonación).
 */
@Service
public class FiscalVerificacionService {

    static final int MAX_MOTIVO = 200;
    static final int MAX_OTROS = 5;
    static final String MENSAJE_CAMBIO = "El negocio cambió sus datos, recargá.";

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
        // Declaración jurada del negocio (cuándo y qué usuario; sin IP).
        m.put("declaracionFecha", e.getFiscalDeclaracionFecha());
        m.put("declaracionPor", e.getFiscalDeclaracionPor());
        m.put("fechaFiscalVerificado", e.getFechaFiscalVerificado());
        m.put("pendienteVerificacion", pendiente(e));
        // Huella de lo que el ADMIN está viendo: verificar la exige igual, para no aprobar datos que ya cambiaron.
        m.put("huella", huella(e));
        // Cédula declarada por otro negocio (posible cédula ajena) y contra la cédula ya conocida de esta cuenta.
        List<Long> otros = e.getCedulaFiscal() == null ? List.of()
            : empresaRepository.idsConMismaCedulaFiscal(e.getCedulaFiscal(), e.getId(), PageRequest.of(0, MAX_OTROS));
        m.put("cedulaFiscalDuplicada", !otros.isEmpty());
        m.put("otrosNegociosMismaCedula", otros);
        String conocida = cedulaConocidaDeLaCuenta(e);
        m.put("cedulaCuenta", conocida);
        m.put("cedulaCoincideConCuenta", conocida == null || e.getCedulaFiscal() == null ? null : conocida.equals(e.getCedulaFiscal()));
        // Comprobación automática: lo que respondió Hacienda, para compararlo con lo declarado.
        m.put("verifAuto", e.getFiscalVerifAuto());
        m.put("verifAutoFecha", e.getFiscalVerifAutoFecha());
        m.put("hacienda", FiscalVerificacionAuto.leerDetalle(e.getFiscalVerifAutoDetalle()));
        return m;
    }

    /**
     * "Consultar Hacienda de nuevo": repite la comprobación con los datos ya declarados. No decide nada.
     * Sin @Transactional: la llamada a Hacienda va primero y fuera de transacción; después un UPDATE dirigido a las
     * columnas de la comprobación, solo si el negocio no cambió sus datos mientras tanto.
     */
    public Map<String, Object> reconsultar(Long empresaId) {
        exigirAdmin();
        Empresa e = cargar(empresaId);
        SituacionFiscal declarada = SituacionFiscal.desde(e.getSituacionFiscal()).orElse(null);
        if (declarada == null || declarada == SituacionFiscal.NO_INSCRITO
            || e.getCedulaFiscal() == null || e.getCedulaFiscal().isBlank()) {
            throw new IllegalStateException("Este negocio no declaró una inscripción para consultar.");
        }
        // Lo consultado: el UPDATE solo aplica si la fila sigue con esta misma cédula y fecha de declaración.
        String cedulaConsultada = e.getCedulaFiscal();
        LocalDateTime declaracionConsultada = e.getFechaSituacionFiscal();
        FiscalVerificacionAuto.Resultado r = verificacionAuto.comprobar(cedulaConsultada, declarada,
            e.getNombreFiscal(), e.getActividadFiscal());
        int filas = empresaRepository.actualizarVerifAutoFiscal(e.getId(), cedulaConsultada, declaracionConsultada,
            r.estado(), r.detalle(), LocalDateTime.now(Constants.ZONA_CR));
        if (filas == 0) throw new IllegalStateException(MENSAJE_CAMBIO);
        auditoria.registrar("FISCAL_RECONSULTA", "EMPRESA", e.getId(), e.getId(), r.estado());
        return detalle(empresaId);
    }

    @Transactional
    @CacheEvict(value = "tenantInfo", key = "#empresaId")
    public Map<String, Object> verificar(Long empresaId, boolean aprobar, String motivo, String huellaVista) {
        exigirAdmin();
        Empresa e = cargar(empresaId);
        // M2: el ADMIN aprueba o rechaza exactamente lo que vio; si el negocio reenvió datos, hay que recargar.
        if (huellaVista == null || !MessageDigest.isEqual(huellaVista.getBytes(StandardCharsets.UTF_8),
            huella(e).getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalStateException(MENSAJE_CAMBIO);
        }
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

    /** SHA-256 de lo declarado (situación, cédula, nombre, actividad, correo y fecha de la declaración). */
    public static String huella(Empresa e) {
        String base = String.join("\u001f", Objects.toString(e.getSituacionFiscal(), ""),
            Objects.toString(e.getCedulaFiscal(), ""), Objects.toString(e.getNombreFiscal(), ""),
            Objects.toString(e.getActividadFiscal(), ""), Objects.toString(e.getCorreoFacturacion(), ""),
            Objects.toString(e.getFechaSituacionFiscal(), ""));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(base.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    /** Cédula ya conocida de la cuenta (la de la configuración fiscal o la del registro), solo si es una cédula real. */
    static String cedulaConocidaDeLaCuenta(Empresa e) {
        String c = CedulaCr.realONulo(e.getCedulaJuridica());
        return c != null ? c : CedulaCr.realONulo(e.getRucCedula());
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
