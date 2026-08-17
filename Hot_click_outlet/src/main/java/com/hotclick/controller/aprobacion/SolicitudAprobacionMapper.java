package com.hotclick.controller.aprobacion;

import com.hotclick.model.Empresa;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.EmpresaNombre;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class SolicitudAprobacionMapper {

    private final UsuarioRepository usuarioRepository;
    private final ProductoRepository productoRepository;
    private final SolicitudOfertaSnapshotReader solicitudOfertaSnapshotReader;

    public SolicitudAprobacionMapper(UsuarioRepository usuarioRepository,
                                     ProductoRepository productoRepository,
                                     SolicitudOfertaSnapshotReader solicitudOfertaSnapshotReader) {
        this.usuarioRepository = usuarioRepository;
        this.productoRepository = productoRepository;
        this.solicitudOfertaSnapshotReader = solicitudOfertaSnapshotReader;
    }

    public Map<String, Object> toMap(Empresa empresa) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", empresa.getId());
        map.put("nombreEmpresa", empresa.getNombreEmpresa());
        map.put("nombreComercial", empresa.getNombreComercial());
        map.put("slug", empresa.getSlug());
        map.put("correoEmpresa", empresa.getCorreoEmpresa());
        map.put("telefonoEmpresa", empresa.getTelefonoEmpresa());
        map.put("plan", empresa.getPlan() != null ? empresa.getPlan().getNombre() : empresa.getPlanSaas());
        map.put("planSaas", empresa.getPlanSaas());
        map.put("estadoEmpresa", empresa.getEstadoEmpresa());
        map.put("fechaRegistro", empresa.getFechaRegistro());

        List<Usuario> miembros = usuarioRepository.findByEmpresaIdConRoles(empresa.getId());
        miembros.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> {
                map.put("adminNombre", u.getNombre() + " " + u.getApellidoPaterno());
                map.put("adminCorreo", u.getCorreo());
            });
        return map;
    }

    public Map<String, Object> toMapProducto(SolicitudAprobacion solicitud) {
        Map<String, Object> map = createBaseSolicitudMap(solicitud);
        productoRepository.findById(solicitud.getIdEntidad()).ifPresent(producto -> {
            map.put("productoId", producto.getId());
            map.put("nombreProducto", producto.getNombreProducto());
            map.put("precioVenta", producto.getPrecioVenta());
            map.put("imagenUrl", producto.getImagenPrincipalUrl());
            map.put("sku", producto.getSku());
        });
        return map;
    }

    public Map<String, Object> toMapOferta(SolicitudAprobacion solicitud) {
        Map<String, Object> map = createBaseSolicitudMap(solicitud);
        try {
            Map<String, Object> snapshot = solicitudOfertaSnapshotReader.read(solicitud);
            map.put("enOferta", snapshot.get("enOferta"));
            map.put("porcentajeDescuento", snapshot.get("porcentajeDescuento"));
            map.put("precioOferta", snapshot.get("precioOferta"));
        } catch (Exception ignored) { /* datosSnapshot corrupto o ausente — se omiten los campos de la promo */ }
        productoRepository.findById(solicitud.getIdEntidad()).ifPresent(producto -> {
            map.put("productoId", producto.getId());
            map.put("nombreProducto", producto.getNombreProducto());
            map.put("precioVenta", producto.getPrecioVenta());
            map.put("imagenUrl", producto.getImagenPrincipalUrl());
        });
        return map;
    }

    private Map<String, Object> createBaseSolicitudMap(SolicitudAprobacion solicitud) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", solicitud.getId());
        map.put("fechaSolicitud", solicitud.getFechaSolicitud());
        map.put("empresaNombre", EmpresaNombre.mostrar(solicitud.getEmpresa(), null));
        map.put("usuarioPide", solicitud.getUsuarioPide() != null ? solicitud.getUsuarioPide().getNombre() : null);
        return map;
    }
}
