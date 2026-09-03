package com.hotclick.controller.aprobacion;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Producto;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.utils.Constants;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * LEGACY drain only: lista/aprueba/rechaza filas {@code PRODUCTO} ya existentes en BD.
 * No crear nuevas solicitudes PRODUCTO — el gate es el negocio, no el producto.
 */
@Component
public class SolicitudProductoHandler {

    private final SolicitudAprobacionRepository    solicitudAprobacionRepository;
    private final ProductoRepository               productoRepository;
    private final CompanyScope                     companyScope;
    private final SolicitudAdminGuard              solicitudAdminGuard;
    private final SolicitudAprobacionMapper        solicitudAprobacionMapper;
    private final SolicitudLookupHelper            solicitudLookupHelper;
    private final TelegramNotificacionClienteService telegramNotificacionClienteService;

    SolicitudProductoHandler(SolicitudAprobacionRepository solicitudAprobacionRepository,
                               ProductoRepository productoRepository,
                               CompanyScope companyScope,
                               SolicitudAdminGuard solicitudAdminGuard,
                               SolicitudAprobacionMapper solicitudAprobacionMapper,
                               SolicitudLookupHelper solicitudLookupHelper,
                               TelegramNotificacionClienteService telegramNotificacionClienteService) {
        this.solicitudAprobacionRepository    = solicitudAprobacionRepository;
        this.productoRepository               = productoRepository;
        this.companyScope                     = companyScope;
        this.solicitudAdminGuard              = solicitudAdminGuard;
        this.solicitudAprobacionMapper        = solicitudAprobacionMapper;
        this.solicitudLookupHelper            = solicitudLookupHelper;
        this.telegramNotificacionClienteService = telegramNotificacionClienteService;
    }

    public ResponseEntity<ResponseDTO> listarProductos() {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        List<SolicitudAprobacion> pendientes = solicitudAprobacionRepository
            .findByEstadoSolicitudOrderByFechaSolicitudDesc("PENDIENTE").stream()
            .filter(s -> "PRODUCTO".equals(s.getTipoEntidad()))
            .toList();
        List<Map<String, Object>> result = pendientes.stream().map(solicitudAprobacionMapper::toMapProducto).toList();
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes de producto pendientes", result));
    }

    public ResponseEntity<ResponseDTO> aprobarProducto(Long id) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        SolicitudAprobacion sol = solicitudLookupHelper.findByTipo(id, "PRODUCTO");
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        Producto producto = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        if (producto != null) {
            producto.setVisibleCatalogo(true);
            productoRepository.save(producto);
        }
        sol.setEstadoSolicitud("APROBADO");
        sol.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudAprobacionRepository.save(sol);
        if (sol.getEmpresa() != null && producto != null) {
            telegramNotificacionClienteService.notificarSolicitudAprobada(
                sol.getEmpresa().getId(), "Tu producto", producto.getNombreProducto());
        }
        return ResponseEntity.ok(ResponseDTO.success("Producto aprobado y publicado en el catálogo", null));
    }

    public ResponseEntity<ResponseDTO> rechazarProducto(Long id, Map<String, String> body) {
        ResponseEntity<ResponseDTO> denied = solicitudAdminGuard.denyIfNotAdmin();
        if (denied != null) return denied;
        SolicitudAprobacion sol = solicitudLookupHelper.findByTipo(id, "PRODUCTO");
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        sol.setEstadoSolicitud("RECHAZADO");
        sol.setComentarioRevisor(body != null ? body.get("comentario") : null);
        sol.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudAprobacionRepository.save(sol);
        Producto productoRechazado = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        if (sol.getEmpresa() != null && productoRechazado != null) {
            telegramNotificacionClienteService.notificarSolicitudRevision(
                sol.getEmpresa().getId(), "Tu producto", productoRechazado.getNombreProducto(),
                sol.getComentarioRevisor());
        }
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", null));
    }
}
