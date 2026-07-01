package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/empresas")
public class EmpresaController {

    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private UsuarioRepository        usuarioRepository;
    @Autowired private ProductoRepository       productoRepository;
    @Autowired private PedidoRepository         pedidoRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private CompanyScope             companyScope;

    @GetMapping
    public ResponseDTO listar(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "100") int size) {
        var empresas = empresaRepository.findAll(PageRequest.of(page, Math.min(size, 200)));
        List<Map<String, Object>> result = empresas.getContent().stream().map(this::toMap).toList();
        return ResponseDTO.success("Empresas", result);
    }

    // companyScope.assertCanAccess(id) es no-op para ADMIN (rol único permitido
    // por SecurityConfig en esta ruta) y bloquea con 403 cualquier otro rol que
    // llegara a tener acceso al endpoint por un cambio futuro de configuración.
    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        companyScope.assertCanAccess(id);
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        Map<String, Object> data = toMap(e);
        data.put("totalUsuarios",  usuarioRepository.countActivosByEmpresaId(id));
        data.put("totalProductos", productoRepository.countProductosActivosByEmpresaId(id));
        data.put("totalPedidos",   pedidoRepository.countTotalPedidosByEmpresaId(id));
        data.put("totalVentas",    pedidoRepository.sumTotalVentasByEmpresaId(id));
        return ResponseEntity.ok(ResponseDTO.success("Empresa", data));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body) {
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        String nuevoEstado = body.get("estadoEmpresa");
        if (nuevoEstado == null || !List.of("ACTIVO", "SUSPENDIDO", "INACTIVO").contains(nuevoEstado))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Estado inválido"));
        Empresa empresa = opt.get();
        empresa.setEstadoEmpresa(nuevoEstado);
        empresaRepository.save(empresa);
        return ResponseEntity.ok(ResponseDTO.success("Estado actualizado", null));
    }

    @PutMapping("/{id}/plan")
    public ResponseEntity<ResponseDTO> cambiarPlan(@PathVariable Long id,
                                                   @RequestBody Map<String, String> body) {
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        String plan = body.get("planSaas");
        if (plan == null || !List.of("GRATUITO", "BASICO", "PRO", "ENTERPRISE").contains(plan))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Plan inválido"));
        Empresa empresa = opt.get();
        empresa.setPlanSaas(plan);
        empresaRepository.save(empresa);
        return ResponseEntity.ok(ResponseDTO.success("Plan actualizado a " + plan, null));
    }

    @PutMapping("/{id}/visibilidad")
    public ResponseEntity<ResponseDTO> cambiarVisibilidad(@PathVariable Long id,
                                                          @RequestBody Map<String, Object> body) {
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Object val = body.get("visibilidadPublica");
        if (val == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo visibilidadPublica requerido"));
        Empresa empresa = opt.get();
        boolean visible = Boolean.parseBoolean(val.toString());
        empresa.setVisibilidadPublica(visible);
        empresaRepository.save(empresa);
        String msg = visible ? "Negocio visible al público" : "Negocio oculto al público";
        return ResponseEntity.ok(ResponseDTO.success(msg, Map.of("visibilidadPublica", visible)));
    }

    @GetMapping("/{id}/productos")
    public ResponseEntity<ResponseDTO> productos(@PathVariable Long id) {
        if (empresaRepository.findById(id).isEmpty())
            return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        var page = productoRepository.findByEmpresaIdAndEstado(id, Constants.ESTADO_ACTIVO, PageRequest.of(0, 30));
        List<Map<String, Object>> result = page.getContent().stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",           p.getId());
            m.put("nombre",       p.getNombreProducto());
            m.put("precio",       p.getPrecioVenta());
            m.put("stock",        p.getStockActual());
            m.put("imagenUrl",    p.getImagenPrincipalUrl());
            m.put("visibleCatalogo", p.getVisibleCatalogo());
            m.put("categoria",    p.getCategoria() != null ? p.getCategoria().getNombreCategoria() : null);
            return m;
        }).toList();
        return ResponseEntity.ok(ResponseDTO.success("Productos", result));
    }

    @GetMapping("/{id}/pedidos")
    public ResponseEntity<ResponseDTO> pedidos(@PathVariable Long id) {
        if (empresaRepository.findById(id).isEmpty())
            return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        var lista = pedidoRepository.findUltimosByEmpresaId(id, PageRequest.of(0, 15));
        List<Map<String, Object>> result = lista.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",           p.getId());
            m.put("fecha",        p.getFechaPedido());
            m.put("total",        p.getTotalPedido());
            m.put("estado",       p.getEstadoPedido());
            m.put("cliente",      p.getUsuarioFinal() != null
                                ? p.getUsuarioFinal().getNombre() + " " + (p.getUsuarioFinal().getApellidoPaterno() != null ? p.getUsuarioFinal().getApellidoPaterno() : "")
                                : "—");
            m.put("metodoPago",   p.getMetodoPago());
            return m;
        }).toList();
        return ResponseEntity.ok(ResponseDTO.success("Pedidos", result));
    }

    @GetMapping("/{id}/equipo")
    public ResponseEntity<ResponseDTO> equipo(@PathVariable Long id) {
        if (empresaRepository.findById(id).isEmpty())
            return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        var miembros = miembroEmpresaRepository.findByEmpresaIdAndEstado(id, 1);
        List<Map<String, Object>> result = miembros.stream().map(m -> {
            var u = m.getUsuario();
            Map<String, Object> r = new HashMap<>();
            r.put("id",           u.getId());
            r.put("nombre",       u.getNombre() + " " + (u.getApellidoPaterno() != null ? u.getApellidoPaterno() : ""));
            r.put("correo",       u.getCorreo());
            r.put("telefono",     u.getTelefono());
            r.put("rol",          m.getRolEnEmpresa());
            r.put("fechaIngreso", m.getFechaIngreso());
            r.put("estado",       u.getEstado());
            return r;
        }).toList();
        return ResponseEntity.ok(ResponseDTO.success("Equipo", result));
    }

    private Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",                e.getId());
        m.put("nombreEmpresa",     e.getNombreEmpresa());
        m.put("nombreComercial",   e.getNombreComercial());
        m.put("slug",              e.getSlug());
        m.put("correoEmpresa",     e.getCorreoEmpresa());
        m.put("telefonoEmpresa",   e.getTelefonoEmpresa());
        m.put("planSaas",          e.getPlanSaas());
        m.put("estadoEmpresa",     e.getEstadoEmpresa());
        m.put("visibilidadPublica", Boolean.TRUE.equals(e.getVisibilidadPublica()));
        m.put("fechaRegistro",     e.getFechaRegistro());
        m.put("fechaAprobacion",   e.getFechaAprobacion());
        m.put("logoUrl",           e.getLogoUrl());
        return m;
    }
}
