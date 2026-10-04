package com.hotclick.service.invitacion;

import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.AltaEmprendedorNotificador;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.CupoEmprendedorService;
import com.hotclick.service.ModeracionAdminAvisoService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Alta de un negocio sin propietario. El admin lo llena (impersonando)
 * y después lo asigna con un enlace.
 */
@Service
public class NegocioPreparadoService {

    static final Set<String> PLANES = Set.of("EMPRENDEDOR", "PYME", "NEGOCIO_PLUS");

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private CupoEmprendedorService cupoEmprendedorService;
    @Autowired private AuthSupport authSupport;
    @Autowired private InputSanitizer sanitizer;
    @Autowired private ModeracionAdminAvisoService moderacionAdminAvisoService;
    @Autowired private AltaEmprendedorNotificador altaEmprendedorNotificador;
    @Autowired private AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    @Transactional
    public Map<String, Object> crear(String nombreEmpresa, String nombreComercial,
                                     String correoEmpresa, String telefonoEmpresa,
                                     String plan) {
        String nombre = sanitizer.cleanWithLimit(nombreEmpresa, 150);
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre del negocio es requerido");
        }
        if (correoEmpresa == null || correoEmpresa.isBlank() || !correoEmpresa.contains("@")) {
            throw new IllegalArgumentException("El correo del negocio es requerido");
        }
        String correo = correoEmpresa.trim().toLowerCase();
        if (empresaRepository.existsByCorreoEmpresa(correo)) {
            throw new IllegalArgumentException("Ese correo de negocio ya está en uso");
        }
        String planNorm = plan == null || plan.isBlank() ? "EMPRENDEDOR" : plan.trim().toUpperCase();
        if (!PLANES.contains(planNorm)) {
            throw new IllegalArgumentException("Plan inválido. Valores permitidos: EMPRENDEDOR, PYME, NEGOCIO_PLUS");
        }

        String comercial = sanitizer.cleanWithLimit(nombreComercial, 150);
        if (comercial == null || comercial.isBlank()) comercial = nombre;

        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa(nombre.trim());
        empresa.setNombreComercial(comercial.trim());
        empresa.setSlug(slugUnico(authSupport.slugify(nombre)));
        empresa.setCorreoEmpresa(correo);
        empresa.setTelefonoEmpresa(telefonoEmpresa == null || telefonoEmpresa.isBlank() ? null : telefonoEmpresa.trim());
        ResultadoAltaCupo alta = cupoEmprendedorService.aplicarAlta(empresa, correo);
        if (!"EMPRENDEDOR".equals(planNorm)) {
            Plan planEntidad = planRepository.findByNombre(planNorm)
                .orElseThrow(() -> new RecursoNoEncontradoException("Plan " + planNorm + " no configurado"));
            empresa.setPlan(planEntidad);
            empresa.setPlanSaas(planNorm);
        }
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        empresa.setVisibilidadPublica(false);
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa.setEstado(Constants.ESTADO_ACTIVO);
        empresa = empresaRepository.save(empresa);

        String visible = empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa();
        moderacionAdminAvisoService.avisarEmpresaPendiente(empresa.getId(), visible);
        altaEmprendedorNotificador.notificar(visible, correo, alta);
        auditoriaAdminRegistroService.registrarSiAdmin("EMPRESA_CREAR", "EMPRESA", empresa.getId(), empresa.getId(),
            "Negocio creado sin propietario");

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", empresa.getId());
        data.put("nombreEmpresa", empresa.getNombreEmpresa());
        data.put("nombreComercial", visible);
        data.put("slug", empresa.getSlug());
        data.put("plan", empresa.getPlanSaas());
        data.put("estadoEmpresa", empresa.getEstadoEmpresa());
        return data;
    }

    private String slugUnico(String base) {
        String slug = (base == null || base.isBlank()) ? "negocio" : base;
        String candidato = slug;
        int i = 2;
        while (empresaRepository.existsBySlug(candidato)) {
            candidato = slug + "-" + i++;
        }
        return candidato;
    }
}
