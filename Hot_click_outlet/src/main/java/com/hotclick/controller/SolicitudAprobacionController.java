package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.NotificacionEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/solicitudes-aprobacion")
public class SolicitudAprobacionController {

    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private UsuarioRepository        usuarioRepository;
    @Autowired private ProductoRepository       productoRepository;
    @Autowired private SolicitudAprobacionRepository solicitudAprobacionRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private CompanyScope             companyScope;
    @Autowired private com.hotclick.service.TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Autowired private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    @Autowired private com.hotclick.service.ProductoService productoService;
    @Autowired private com.hotclick.service.EmpresaAprobacionService empresaAprobacionService;

    // toMap() resuelve e.getPlan().getNombre() (relación LAZY); con open-in-view=false
    // hace falta una transacción activa para que el proxy se pueda inicializar.
    @Transactional(readOnly = true)
    @GetMapping
    public ResponseDTO listar() {
        List<Empresa> pendientes = empresaRepository
            .findByEstadoEmpresaOrderByFechaRegistroDesc("PENDIENTE_APROBACION");
        List<Map<String, Object>> result = pendientes.stream().map(this::toMap).toList();
        return ResponseDTO.success("Solicitudes pendientes", result);
    }

    @GetMapping("/stats")
    public ResponseDTO stats() {
        Map<String, Object> data = new HashMap<>();
        data.put("pendientes", empresaRepository.countByEstadoEmpresa("PENDIENTE_APROBACION"));
        data.put("activas",    empresaRepository.countByEstadoEmpresa("ACTIVO"));
        data.put("suspendidas",empresaRepository.countByEstadoEmpresa("SUSPENDIDO"));
        return ResponseDTO.success("Stats aprobacion", data);
    }

    @PutMapping("/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        // Aprobar = activar + hacer visible + publicar productos, en una transacción.
        // Setear solo estado_empresa dejaba a la empresa fuera del catálogo público
        // (visibilidad_publica quedaba en false desde el registro).
        Empresa e = empresaAprobacionService.aprobarYPublicar(id);
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarAprobacionNegocio(
                u.getCorreo(), u.getNombre(),
                e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa()
            ));
        return ResponseEntity.ok(ResponseDTO.success("Empresa aprobada", null));
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(@PathVariable Long id) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        e.setEstadoEmpresa("RECHAZADO");
        empresaRepository.save(e);
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarRechazoNegocio(
                u.getCorreo(), u.getNombre(),
                e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa()
            ));
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", null));
    }

    // ── Productos ────────────────────────────────────────────────────────────

    @GetMapping("/productos")
    public ResponseEntity<ResponseDTO> listarProductos() {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        List<SolicitudAprobacion> pendientes = solicitudAprobacionRepository
            .findByEstadoSolicitudOrderByFechaSolicitudDesc("PENDIENTE").stream()
            .filter(s -> "PRODUCTO".equals(s.getTipoEntidad()))
            .toList();
        List<Map<String, Object>> result = pendientes.stream().map(this::toMapProducto).toList();
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes de producto pendientes", result));
    }

    @PutMapping("/productos/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobarProducto(@PathVariable Long id) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        SolicitudAprobacion sol = solicitudAprobacionRepository.findById(id)
            .filter(s -> "PRODUCTO".equals(s.getTipoEntidad()))
            .orElse(null);
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        Producto producto = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        if (producto != null) {
            producto.setVisibleCatalogo(true);
            productoRepository.save(producto);
        }
        sol.setEstadoSolicitud("APROBADO");
        sol.setFechaResolucion(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudAprobacionRepository.save(sol);
        if (sol.getEmpresa() != null && producto != null) {
            telegramNotificacionClienteService.notificarSolicitudAprobada(
                sol.getEmpresa().getId(), "Tu producto", producto.getNombreProducto());
        }
        return ResponseEntity.ok(ResponseDTO.success("Producto aprobado y publicado en el catálogo", null));
    }

    @PutMapping("/productos/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazarProducto(@PathVariable Long id,
                                                         @RequestBody(required = false) Map<String, String> body) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        SolicitudAprobacion sol = solicitudAprobacionRepository.findById(id)
            .filter(s -> "PRODUCTO".equals(s.getTipoEntidad()))
            .orElse(null);
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        sol.setEstadoSolicitud("RECHAZADO");
        sol.setComentarioRevisor(body != null ? body.get("comentario") : null);
        sol.setFechaResolucion(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR));
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

    // ── Ofertas (Promociones) ───────────────────────────────────────────────────

    @GetMapping("/ofertas")
    public ResponseEntity<ResponseDTO> listarOfertas() {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        List<SolicitudAprobacion> pendientes = solicitudAprobacionRepository
            .findByEstadoSolicitudOrderByFechaSolicitudDesc("PENDIENTE").stream()
            .filter(s -> "OFERTA".equals(s.getTipoEntidad()))
            .toList();
        List<Map<String, Object>> result = pendientes.stream().map(this::toMapOferta).toList();
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes de promoción pendientes", result));
    }

    @PutMapping("/ofertas/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobarOferta(@PathVariable Long id) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        SolicitudAprobacion sol = solicitudAprobacionRepository.findById(id)
            .filter(s -> "OFERTA".equals(s.getTipoEntidad()))
            .orElse(null);
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        Producto producto = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        try {
            Map<String, Object> snapshot = objectMapper.readValue(sol.getDatosSnapshot(), Map.class);
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
        sol.setFechaResolucion(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudAprobacionRepository.save(sol);
        if (sol.getEmpresa() != null && producto != null) {
            telegramNotificacionClienteService.notificarSolicitudAprobada(
                sol.getEmpresa().getId(), "Tu promoción", producto.getNombreProducto());
        }
        return ResponseEntity.ok(ResponseDTO.success("Promoción aprobada y aplicada", null));
    }

    @PutMapping("/ofertas/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazarOferta(@PathVariable Long id,
                                                       @RequestBody(required = false) Map<String, String> body) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        SolicitudAprobacion sol = solicitudAprobacionRepository.findById(id)
            .filter(s -> "OFERTA".equals(s.getTipoEntidad()))
            .orElse(null);
        if (sol == null) return ResponseEntity.status(404).body(ResponseDTO.error("Solicitud no encontrada"));
        if (!"PENDIENTE".equals(sol.getEstadoSolicitud()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Esta solicitud ya fue resuelta"));

        sol.setEstadoSolicitud("RECHAZADO");
        sol.setComentarioRevisor(body != null ? body.get("comentario") : null);
        sol.setFechaResolucion(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR));
        sol.setUsuarioResuelve(companyScope.getCurrentUser());
        solicitudAprobacionRepository.save(sol);
        Producto producto = productoRepository.findById(sol.getIdEntidad()).orElse(null);
        if (sol.getEmpresa() != null && producto != null) {
            telegramNotificacionClienteService.notificarSolicitudRevision(
                sol.getEmpresa().getId(), "Tu promoción", producto.getNombreProducto(),
                sol.getComentarioRevisor());
        }
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", null));
    }

    private Map<String, Object> toMapOferta(SolicitudAprobacion sol) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",            sol.getId());
        m.put("fechaSolicitud", sol.getFechaSolicitud());
        m.put("empresaNombre", sol.getEmpresa() != null
            ? (sol.getEmpresa().getNombreComercial() != null ? sol.getEmpresa().getNombreComercial() : sol.getEmpresa().getNombreEmpresa())
            : null);
        m.put("usuarioPide", sol.getUsuarioPide() != null ? sol.getUsuarioPide().getNombre() : null);
        try {
            Map<String, Object> snapshot = objectMapper.readValue(sol.getDatosSnapshot(), Map.class);
            m.put("enOferta",             snapshot.get("enOferta"));
            m.put("porcentajeDescuento",  snapshot.get("porcentajeDescuento"));
            m.put("precioOferta",         snapshot.get("precioOferta"));
        } catch (Exception ignored) { /* datosSnapshot corrupto o ausente — se omiten los campos de la promo */ }
        productoRepository.findById(sol.getIdEntidad()).ifPresent(p -> {
            m.put("productoId",     p.getId());
            m.put("nombreProducto", p.getNombreProducto());
            m.put("precioVenta",    p.getPrecioVenta());
            m.put("imagenUrl",      p.getImagenPrincipalUrl());
        });
        return m;
    }

    private Map<String, Object> toMapProducto(SolicitudAprobacion sol) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",            sol.getId());
        m.put("fechaSolicitud", sol.getFechaSolicitud());
        m.put("empresaNombre", sol.getEmpresa() != null
            ? (sol.getEmpresa().getNombreComercial() != null ? sol.getEmpresa().getNombreComercial() : sol.getEmpresa().getNombreEmpresa())
            : null);
        m.put("usuarioPide", sol.getUsuarioPide() != null ? sol.getUsuarioPide().getNombre() : null);
        productoRepository.findById(sol.getIdEntidad()).ifPresent(p -> {
            m.put("productoId",     p.getId());
            m.put("nombreProducto", p.getNombreProducto());
            m.put("precioVenta",    p.getPrecioVenta());
            m.put("imagenUrl",      p.getImagenPrincipalUrl());
            m.put("sku",            p.getSku());
        });
        return m;
    }

    private Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",              e.getId());
        m.put("nombreEmpresa",   e.getNombreEmpresa());
        m.put("nombreComercial", e.getNombreComercial());
        m.put("slug",            e.getSlug());
        m.put("correoEmpresa",   e.getCorreoEmpresa());
        m.put("telefonoEmpresa", e.getTelefonoEmpresa());
        m.put("plan",            e.getPlan() != null ? e.getPlan().getNombre() : e.getPlanSaas());
        m.put("planSaas",        e.getPlanSaas());
        m.put("estadoEmpresa",   e.getEstadoEmpresa());
        m.put("fechaRegistro",   e.getFechaRegistro());

        // Obtener el emprendedor admin de esta empresa
        List<Usuario> miembros = usuarioRepository.findByEmpresaIdConRoles(e.getId());
        miembros.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> {
                m.put("adminNombre", u.getNombre() + " " + u.getApellidoPaterno());
                m.put("adminCorreo", u.getCorreo());
            });
        return m;
    }
}
