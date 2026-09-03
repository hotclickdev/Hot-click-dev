package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Producto;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ModeracionAvisoService;
import com.hotclick.service.ProductoService;
import com.hotclick.utils.Constants;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Aprobación / rechazo de solicitudes de promoción (oferta).
 * Extraído bit-idéntico de SolicitudAprobacionController — no cambia comportamiento.
 */
@Component
public class SolicitudOfertaHandler {

    private final SolicitudAprobacionRepository    solicitudAprobacionRepository;
    private final ProductoRepository               productoRepository;
    private final CompanyScope                     companyScope;
    private final SolicitudAdminGuard              solicitudAdminGuard;
    private final SolicitudAprobacionMapper        solicitudAprobacionMapper;
    private final SolicitudLookupHelper            solicitudLookupHelper;
    private final SolicitudOfertaSnapshotReader    solicitudOfertaSnapshotReader;
    private final ProductoService                    productoService;
    private final ModeracionAvisoService             moderacionAvisoService;

    SolicitudOfertaHandler(SolicitudAprobacionRepository solicitudAprobacionRepository,
                           ProductoRepository productoRepository,
                           CompanyScope companyScope,
                           SolicitudAdminGuard solicitudAdminGuard,
                           SolicitudAprobacionMapper solicitudAprobacionMapper,
                           SolicitudLookupHelper solicitudLookupHelper,
                           SolicitudOfertaSnapshotReader solicitudOfertaSnapshotReader,
                           ProductoService productoService,
                           ModeracionAvisoService moderacionAvisoService) {
        this.solicitudAprobacionRepository    = solicitudAprobacionRepository;
        this.productoRepository               = productoRepository;
        this.companyScope                     = companyScope;
        this.solicitudAdminGuard              = solicitudAdminGuard;
        this.solicitudAprobacionMapper        = solicitudAprobacionMapper;
        this.solicitudLookupHelper            = solicitudLookupHelper;
        this.solicitudOfertaSnapshotReader    = solicitudOfertaSnapshotReader;
        this.productoService                  = productoService;
        this.moderacionAvisoService           = moderacionAvisoService;
    }

    public ResponseEntity<ResponseDTO> listarOfertas() {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        List<SolicitudAprobacion> pendientes = solicitudAprobacionRepository
            .findByEstadoSolicitudOrderByFechaSolicitudDesc("PENDIENTE").stream()
            .filter(s -> "OFERTA".equals(s.getTipoEntidad()))
            .toList();
        List<Map<String, Object>> result = pendientes.stream().map(solicitudAprobacionMapper::toMapOferta).toList();
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes de promoción pendientes", result));
    }

    public ResponseEntity<ResponseDTO> aprobarOferta(Long id) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        SolicitudAprobacion sol = solicitudLookupHelper.findByTipo(id, "OFERTA");
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        Producto producto = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        try {
            Map<String, Object> snapshot = solicitudOfertaSnapshotReader.read(sol);
            boolean enOferta = Boolean.TRUE.equals(snapshot.get("enOferta"));
            Integer pct = snapshot.get("porcentajeDescuento") != null
                ? ((Number) snapshot.get("porcentajeDescuento")).intValue() : null;
            Integer precio = snapshot.get("precioOferta") != null
                ? ((Number) snapshot.get("precioOferta")).intValue() : null;
            if (producto != null) productoService.aplicarOferta(producto.getId(), enOferta, pct, precio);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se pudo aplicar la promoción"));
        }

        sol.setEstadoSolicitud("APROBADO");
        sol.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudAprobacionRepository.save(sol);
        if (sol.getEmpresa() != null && producto != null) {
            moderacionAvisoService.avisarAprobado(
                sol.getEmpresa().getId(), "Tu promoción", producto.getNombreProducto());
        }
        return ResponseEntity.ok(ResponseDTO.success("Promoción aprobada y aplicada", null));
    }

    public ResponseEntity<ResponseDTO> rechazarOferta(Long id, Map<String, String> body) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        SolicitudAprobacion sol = solicitudLookupHelper.findByTipo(id, "OFERTA");
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        sol.setEstadoSolicitud("RECHAZADO");
        sol.setComentarioRevisor(body != null ? body.get("comentario") : null);
        sol.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudAprobacionRepository.save(sol);
        Producto producto = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        if (sol.getEmpresa() != null && producto != null) {
            moderacionAvisoService.avisarRechazado(
                sol.getEmpresa().getId(), "Tu promoción", producto.getNombreProducto(),
                sol.getComentarioRevisor());
        }
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", null));
    }
}
