package com.hotclick.service;

import com.hotclick.dto.RecoleccionCreateRequest;
import com.hotclick.dto.RecoleccionRechazarRequest;
import com.hotclick.dto.RecoleccionTarifaRequest;
import com.hotclick.dto.SolicitudRecoleccionDto;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.SolicitudRecoleccion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SolicitudRecoleccionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.logistica.ZonaLogistica;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RecoleccionService {

    private final SolicitudRecoleccionRepository repo;
    private final EmpresaRepository empresaRepo;
    private final CompanyScope companyScope;
    private final InputSanitizer sanitizer;
    private final ModeracionAvisoService moderacionAvisoService;
    private final ModeracionAdminAvisoService moderacionAdminAvisoService;

    public RecoleccionService(
            SolicitudRecoleccionRepository repo,
            EmpresaRepository empresaRepo,
            CompanyScope companyScope,
            InputSanitizer sanitizer,
            ModeracionAvisoService moderacionAvisoService,
            ModeracionAdminAvisoService moderacionAdminAvisoService) {
        this.repo = repo;
        this.empresaRepo = empresaRepo;
        this.companyScope = companyScope;
        this.sanitizer = sanitizer;
        this.moderacionAvisoService = moderacionAvisoService;
        this.moderacionAdminAvisoService = moderacionAdminAvisoService;
    }

    @Transactional
    public SolicitudRecoleccionDto crear(RecoleccionCreateRequest req) {
        ZonaLogistica.exigirGam(req.getZona());
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            throw new IllegalStateException("Tu cuenta no tiene un negocio asociado");
        }
        Empresa empresa = empresaRepo.findById(empresaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));

        SolicitudRecoleccion s = new SolicitudRecoleccion();
        s.setEmpresa(empresa);
        s.setUsuario(companyScope.getCurrentUser());
        s.setZona(ZonaLogistica.GAM);
        aplicarDirecciones(s, req);
        s.setEstado(SolicitudRecoleccion.ESTADO_PENDIENTE);
        SolicitudRecoleccion guardada = repo.save(s);
        moderacionAdminAvisoService.avisarRecoleccion(
            guardada.getId(),
            empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa());
        return SolicitudRecoleccionDto.from(guardada);
    }

    @Transactional(readOnly = true)
    public List<SolicitudRecoleccionDto> listar() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        List<SolicitudRecoleccion> lista = empresaId == null
                ? repo.findAllConEmpresa()
                : repo.findByEmpresaIdConEmpresa(empresaId);
        return lista.stream().map(SolicitudRecoleccionDto::from).toList();
    }

    @Transactional
    public SolicitudRecoleccionDto cotizarTarifa(Long id, RecoleccionTarifaRequest req) {
        exigirAdminIt();
        SolicitudRecoleccion s = cargar(id);
        if (!SolicitudRecoleccion.ESTADO_PENDIENTE.equals(s.getEstado())) {
            throw new IllegalStateException("Solo se cotiza una solicitud pendiente");
        }
        s.setTarifaColones(req.getTarifaColones());
        if (req.getNotasAdmin() != null) {
            s.setNotasAdmin(sanitizer.cleanWithLimit(req.getNotasAdmin(), 1000));
        }
        s.setEstado(SolicitudRecoleccion.ESTADO_COTIZADA);
        s.setFechaCotizacion(LocalDateTime.now(Constants.ZONA_CR));
        SolicitudRecoleccionDto dto = SolicitudRecoleccionDto.from(repo.save(s));
        moderacionAvisoService.avisarAprobado(
            s.getEmpresa().getId(), "Tu recolección", "Solicitud #" + s.getId());
        return dto;
    }

    @Transactional
    public SolicitudRecoleccionDto rechazar(Long id, RecoleccionRechazarRequest req) {
        exigirAdminIt();
        SolicitudRecoleccion s = cargar(id);
        if (!SolicitudRecoleccion.ESTADO_PENDIENTE.equals(s.getEstado())) {
            throw new IllegalStateException("Solo se rechaza una solicitud pendiente");
        }
        s.setEstado(SolicitudRecoleccion.ESTADO_RECHAZADA);
        s.setNotasAdmin(sanitizer.cleanWithLimit(req.getMotivo(), 1000));
        SolicitudRecoleccionDto dto = SolicitudRecoleccionDto.from(repo.save(s));
        moderacionAvisoService.avisarRechazado(
            s.getEmpresa().getId(), "Tu recolección", "Solicitud #" + s.getId(), req.getMotivo());
        return dto;
    }

    @Transactional
    public SolicitudRecoleccionDto cancelar(Long id) {
        SolicitudRecoleccion s = cargar(id);
        companyScope.assertCanAccess(s.getEmpresa().getId());
        if (!SolicitudRecoleccion.ESTADO_PENDIENTE.equals(s.getEstado())) {
            throw new IllegalStateException("Solo podés cancelar una solicitud pendiente");
        }
        s.setEstado(SolicitudRecoleccion.ESTADO_CANCELADA);
        return SolicitudRecoleccionDto.from(repo.save(s));
    }

    private void aplicarDirecciones(SolicitudRecoleccion s, RecoleccionCreateRequest req) {
        s.setDireccionRecoleccion(sanitizer.cleanWithLimit(req.getDireccionRecoleccion(), 500));
        s.setContactoRecoleccion(sanitizer.cleanWithLimit(req.getContactoRecoleccion(), 120));
        s.setTelefonoRecoleccion(sanitizer.cleanWithLimit(req.getTelefonoRecoleccion(), 30));
        s.setDireccionEntrega(sanitizer.cleanWithLimit(req.getDireccionEntrega(), 500));
        s.setContactoEntrega(sanitizer.cleanWithLimit(req.getContactoEntrega(), 120));
        s.setTelefonoEntrega(sanitizer.cleanWithLimit(req.getTelefonoEntrega(), 30));
        if (req.getNotas() != null && !req.getNotas().isBlank()) {
            s.setNotas(sanitizer.cleanWithLimit(req.getNotas(), 2000));
        }
    }

    private SolicitudRecoleccion cargar(Long id) {
        return repo.findByIdConEmpresa(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Solicitud de recolección", id));
    }

    private void exigirAdminIt() {
        if (!companyScope.isAdminIT()) {
            throw new IllegalStateException("Solo el equipo HOTCLICK puede cotizar o rechazar");
        }
    }
}
