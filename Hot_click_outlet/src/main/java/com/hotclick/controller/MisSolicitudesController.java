package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Producto;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Solicitudes de aprobación (productos/ofertas) de la propia empresa —
 * a diferencia de SolicitudAprobacionController (solo ADMIN), acá cualquier
 * miembro de la empresa ve sus propias solicitudes, sin importar el estado.
 */
@RestController
@RequestMapping("/api/mis-solicitudes")
public class MisSolicitudesController {

    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CompanyScope companyScope;
    @Autowired private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @GetMapping("/ofertas")
    public ResponseEntity<ResponseDTO> misOfertas() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return ResponseEntity.ok(ResponseDTO.success("Sin solicitudes", List.of()));

        List<SolicitudAprobacion> solicitudes = solicitudAprobacionRepository
            .findByEmpresa_IdOrderByFechaSolicitudDesc(empresaId).stream()
            .filter(s -> "OFERTA".equals(s.getTipoEntidad()))
            .toList();
        List<Map<String, Object>> result = solicitudes.stream().map(this::toMap).toList();
        return ResponseEntity.ok(ResponseDTO.success("Mis solicitudes de promoción", result));
    }

    private Map<String, Object> toMap(SolicitudAprobacion sol) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",               sol.getId());
        m.put("estadoSolicitud",  sol.getEstadoSolicitud());
        m.put("comentarioRevisor", sol.getComentarioRevisor());
        m.put("fechaSolicitud",   sol.getFechaSolicitud());
        m.put("fechaResolucion",  sol.getFechaResolucion());
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> snapshot = objectMapper.readValue(sol.getDatosSnapshot(), Map.class);
            m.put("porcentajeDescuento", snapshot.get("porcentajeDescuento"));
            m.put("precioOferta",        snapshot.get("precioOferta"));
        } catch (Exception ignored) { /* datosSnapshot corrupto o ausente */ }
        Producto p = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        if (p != null) {
            m.put("productoId",     p.getId());
            m.put("nombreProducto", p.getNombreProducto());
            m.put("imagenUrl",      p.getImagenPrincipalUrl());
            m.put("precioVenta",    p.getPrecioVenta());
        }
        return m;
    }
}
