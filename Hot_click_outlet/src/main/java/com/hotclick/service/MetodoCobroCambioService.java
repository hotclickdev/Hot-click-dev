package com.hotclick.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.MetodoCobroCambioPendienteDto;
import com.hotclick.dto.MetodoCobroCambioSnapshot;
import com.hotclick.dto.MetodoCobroCreateRequest;
import com.hotclick.dto.MetodoCobroDto;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.MetodoCobro;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MetodoCobroCambioService {

    private static final String PENDIENTE = "PENDIENTE";
    private static final String APROBADO = "APROBADO";
    private static final String RECHAZADO = "RECHAZADO";

    private final MetodoCobroRepository metodoRepo;
    private final SolicitudAprobacionRepository solicitudRepo;
    private final CompanyScope companyScope;
    private final InputSanitizer sanitizer;
    private final ObjectMapper objectMapper;
    private final MetodoCobroNotificacionService notificacionService;
    private final ModeracionAvisoService moderacionAvisoService;

    public MetodoCobroCambioService(
            MetodoCobroRepository metodoRepo,
            SolicitudAprobacionRepository solicitudRepo,
            CompanyScope companyScope,
            InputSanitizer sanitizer,
            ObjectMapper objectMapper,
            MetodoCobroNotificacionService notificacionService,
            ModeracionAvisoService moderacionAvisoService) {
        this.metodoRepo = metodoRepo;
        this.solicitudRepo = solicitudRepo;
        this.companyScope = companyScope;
        this.sanitizer = sanitizer;
        this.objectMapper = objectMapper;
        this.notificacionService = notificacionService;
        this.moderacionAvisoService = moderacionAvisoService;
    }

    @Transactional
    public MetodoCobroDto solicitarCambio(Long id, MetodoCobroCreateRequest req) {
        MetodoCobro metodo = cargarDeMiEmpresa(id);
        validarCambioPermitido(metodo, req);
        String datoLimpio = sanitizer.cleanWithLimit(req.getDato(), 80);
        String destinoNuevo = MetodoCobroFormato.limpiarDestino(metodo.getTipo(), datoLimpio);
        if (destinoNuevo.equals(metodo.getDestino())) {
            throw new IllegalArgumentException("El dato es el mismo que el vigente.");
        }
        guardarSolicitud(metodo, destinoNuevo);
        metodo.setEnRevision(true);
        metodoRepo.save(metodo);
        notificacionService.avisarCambioPendiente(
                metodo.getEmpresa(),
                companyScope.getCurrentUser(),
                MetodoCobroFormato.nombre(metodo.getTipo()),
                MetodoCobroFormato.mascara(metodo.getTipo(), destinoNuevo));
        return MetodoCobroDto.from(metodo);
    }

    @Transactional(readOnly = true)
    public List<MetodoCobroCambioPendienteDto> listarPendientes() {
        return solicitudRepo
                .findPendientesConEmpresa(PENDIENTE, MetodoCobro.TIPO_SOLICITUD)
                .stream()
                .map(this::aPendienteDto)
                .toList();
    }

    @Transactional
    public void aprobar(Long solicitudId) {
        SolicitudAprobacion sol = cargarPendiente(solicitudId);
        MetodoCobro metodo = cargarMetodo(sol.getIdEntidad());
        companyScope.assertCanAccess(metodo.getEmpresa().getId());
        MetodoCobroCambioSnapshot snap = leerSnapshot(sol);
        metodo.setDestino(snap.getDestinoNuevo());
        metodo.setMascara(MetodoCobroFormato.mascara(metodo.getTipo(), snap.getDestinoNuevo()));
        metodo.setEnRevision(false);
        metodoRepo.save(metodo);
        resolver(sol, APROBADO, null);
        moderacionAvisoService.avisarAprobado(
                sol.getEmpresa().getId(), "Tu cuenta de cobro", MetodoCobroFormato.nombre(metodo.getTipo()));
    }

    @Transactional
    public void rechazar(Long solicitudId, String comentario) {
        SolicitudAprobacion sol = cargarPendiente(solicitudId);
        MetodoCobro metodo = metodoRepo.findActivoById(sol.getIdEntidad()).orElse(null);
        if (metodo != null) {
            companyScope.assertCanAccess(metodo.getEmpresa().getId());
            metodo.setEnRevision(false);
            metodoRepo.save(metodo);
        }
        resolver(sol, RECHAZADO, comentario);
        if (sol.getEmpresa() != null) {
            String nombre = metodo != null ? MetodoCobroFormato.nombre(metodo.getTipo()) : "cuenta de cobro";
            moderacionAvisoService.avisarRechazado(sol.getEmpresa().getId(), "Tu cuenta de cobro", nombre, comentario);
        }
    }

    private void validarCambioPermitido(MetodoCobro metodo, MetodoCobroCreateRequest req) {
        if (!MetodoCobroFormato.esEditable(metodo.getTipo())) {
            throw new IllegalArgumentException("Las cuentas tarjeta no se editan. Agregá SINPE o IBAN.");
        }
        if (metodo.isEnRevision()
                || solicitudRepo.existsByTipoEntidadAndIdEntidadAndEstadoSolicitud(
                        MetodoCobro.TIPO_SOLICITUD, metodo.getId(), PENDIENTE)) {
            throw new IllegalStateException("Este método ya tiene un cambio en revisión.");
        }
        if (req.getTipo() != null && !req.getTipo().isBlank()) {
            String tipoReq = MetodoCobroFormato.normalizarTipo(req.getTipo());
            if (!metodo.getTipo().equals(tipoReq)) {
                throw new IllegalArgumentException("No se puede cambiar el tipo de una cuenta existente.");
            }
        }
    }

    private void guardarSolicitud(MetodoCobro metodo, String destinoNuevo) {
        Usuario pide = companyScope.getCurrentUser();
        if (pide == null) {
            throw new IllegalStateException("Necesitás iniciar sesión para pedir el cambio.");
        }
        SolicitudAprobacion sol = new SolicitudAprobacion();
        sol.setTipoEntidad(MetodoCobro.TIPO_SOLICITUD);
        sol.setAccionSolicitada(MetodoCobro.ACCION_CAMBIO);
        sol.setIdEntidad(metodo.getId());
        sol.setDatosSnapshot(snapshotJson(metodo, destinoNuevo));
        sol.setMotivoPeticion("Cambio de destino de cobro");
        sol.setEstadoSolicitud(PENDIENTE);
        sol.setEmpresa(metodo.getEmpresa());
        sol.setUsuarioPide(pide);
        solicitudRepo.save(sol);
    }

    private String snapshotJson(MetodoCobro metodo, String destinoNuevo) {
        MetodoCobroCambioSnapshot snap = new MetodoCobroCambioSnapshot();
        snap.setTipo(metodo.getTipo());
        snap.setDestinoNuevo(destinoNuevo);
        snap.setMascaraNueva(MetodoCobroFormato.mascara(metodo.getTipo(), destinoNuevo));
        snap.setMascaraActual(MetodoCobroFormato.mascara(metodo.getTipo(), metodo.getDestino()));
        try {
            return objectMapper.writeValueAsString(snap);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo registrar el cambio de cobro", e);
        }
    }

    private MetodoCobroCambioPendienteDto aPendienteDto(SolicitudAprobacion sol) {
        MetodoCobroCambioSnapshot snap = leerSnapshotSilencioso(sol);
        MetodoCobroCambioPendienteDto dto = new MetodoCobroCambioPendienteDto();
        dto.setId(sol.getId());
        dto.setEmpresaNombre(EmpresaNombre.mostrar(sol.getEmpresa(), null));
        dto.setUsuarioPide(sol.getUsuarioPide() != null ? sol.getUsuarioPide().getNombre() : null);
        dto.setTipo(MetodoCobroFormato.tipoApi(snap.getTipo()));
        dto.setMascaraActual(snap.getMascaraActual());
        dto.setMascaraNueva(snap.getMascaraNueva());
        dto.setFechaSolicitud(sol.getFechaSolicitud());
        return dto;
    }

    private MetodoCobroCambioSnapshot leerSnapshot(SolicitudAprobacion sol) {
        try {
            MetodoCobroCambioSnapshot snap = objectMapper.readValue(
                    sol.getDatosSnapshot(), MetodoCobroCambioSnapshot.class);
            if (snap.getDestinoNuevo() == null || snap.getDestinoNuevo().isBlank()) {
                throw new IllegalArgumentException("La solicitud no tiene el destino nuevo.");
            }
            return snap;
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("No se pudo leer el cambio solicitado.");
        }
    }

    private MetodoCobroCambioSnapshot leerSnapshotSilencioso(SolicitudAprobacion sol) {
        try {
            if (sol.getDatosSnapshot() == null) {
                return new MetodoCobroCambioSnapshot();
            }
            return objectMapper.readValue(sol.getDatosSnapshot(), MetodoCobroCambioSnapshot.class);
        } catch (JsonProcessingException e) {
            return new MetodoCobroCambioSnapshot();
        }
    }

    private void resolver(SolicitudAprobacion sol, String estado, String comentario) {
        sol.setEstadoSolicitud(estado);
        sol.setComentarioRevisor(comentario);
        sol.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudRepo.save(sol);
    }

    private SolicitudAprobacion cargarPendiente(Long id) {
        SolicitudAprobacion sol = solicitudRepo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Solicitud", id));
        if (!MetodoCobro.TIPO_SOLICITUD.equals(sol.getTipoEntidad())) {
            throw new RecursoNoEncontradoException("Solicitud", id);
        }
        if (!PENDIENTE.equals(sol.getEstadoSolicitud())) {
            throw new IllegalStateException("Esta solicitud ya fue resuelta");
        }
        return sol;
    }

    private MetodoCobro cargarDeMiEmpresa(Long id) {
        MetodoCobro m = cargarMetodo(id);
        companyScope.assertCanAccess(m.getEmpresa().getId());
        return m;
    }

    private MetodoCobro cargarMetodo(Long id) {
        return metodoRepo.findActivoById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Método de cobro", id));
    }
}
