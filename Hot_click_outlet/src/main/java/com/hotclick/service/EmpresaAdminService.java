package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmpresaAdminService {

    static final List<String> PLANES_VALIDOS = List.of("EMPRENDEDOR", "PYME", "NEGOCIO_PLUS");
    private static final List<String> ESTADOS_VALIDOS = List.of("ACTIVO", "SUSPENDIDO", "INACTIVO");

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private EmpresaAprobacionService empresaAprobacionService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(int page, int size) {
        var empresas = empresaRepository.findAll(PageRequest.of(page, Math.min(size, 200)));
        return empresas.getContent().stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long id) {
        Empresa e = empresa(id);
        Map<String, Object> data = toMap(e);
        data.put("totalUsuarios", usuarioRepository.countActivosByEmpresaId(id));
        data.put("totalProductos", productoRepository.countProductosActivosByEmpresaId(id));
        data.put("totalPedidos", pedidoRepository.countTotalPedidosByEmpresaId(id));
        data.put("totalVentas", pedidoRepository.sumTotalVentasByEmpresaId(id));
        return data;
    }

    public void cambiarEstado(Long id, String nuevoEstado) {
        if (nuevoEstado == null || !ESTADOS_VALIDOS.contains(nuevoEstado)) {
            throw new IllegalArgumentException("Estado inválido");
        }
        empresa(id);
        if ("ACTIVO".equals(nuevoEstado)) {
            empresaAprobacionService.aprobarYPublicar(id);
            return;
        }
        Empresa empresa = empresa(id);
        empresa.setEstadoEmpresa(nuevoEstado);
        empresaRepository.save(empresa);
    }

    @CacheEvict(value = "tenantInfo", key = "#id")
    public String cambiarPlan(Long id, String nombrePlan) {
        if (nombrePlan == null || !PLANES_VALIDOS.contains(nombrePlan)) {
            throw new IllegalArgumentException("Plan inválido. Valores permitidos: " + PLANES_VALIDOS);
        }
        Plan plan = planRepository.findByNombre(nombrePlan)
            .orElseThrow(() -> new IllegalStateException("Plan " + nombrePlan + " no configurado en hot_click_plan_tb"));
        Empresa empresa = empresa(id);
        empresa.setPlan(plan);
        empresa.setPlanSaas(nombrePlan);
        empresaRepository.save(empresa);
        return nombrePlan;
    }

    public boolean cambiarVisibilidad(Long id, Object val) {
        if (val == null) throw new IllegalArgumentException("Campo visibilidadPublica requerido");
        Empresa empresa = empresa(id);
        boolean visible = Boolean.parseBoolean(val.toString());
        empresa.setVisibilidadPublica(visible);
        empresaRepository.save(empresa);
        return visible;
    }

    public List<Map<String, Object>> productos(Long id) {
        empresa(id);
        var page = productoRepository.findByEmpresaIdAndEstado(id, Constants.ESTADO_ACTIVO, PageRequest.of(0, 30));
        return page.getContent().stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("nombre", p.getNombreProducto());
            m.put("precio", p.getPrecioVenta());
            m.put("stock", p.getStockActual());
            m.put("imagenUrl", p.getImagenPrincipalUrl());
            m.put("visibleCatalogo", p.getVisibleCatalogo());
            m.put("categoria", p.getCategoria() != null ? p.getCategoria().getNombreCategoria() : null);
            return m;
        }).toList();
    }

    public List<Map<String, Object>> pedidos(Long id) {
        empresa(id);
        return pedidoRepository.findUltimosByEmpresaId(id, PageRequest.of(0, 15)).stream()
            .map(this::filaPedido)
            .toList();
    }

    public List<Map<String, Object>> equipo(Long id) {
        empresa(id);
        return miembroEmpresaRepository.findByEmpresaIdAndEstado(id, 1).stream()
            .map(this::filaEquipo)
            .toList();
    }

    private Empresa empresa(Long id) {
        return empresaRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
    }

    private Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", e.getId());
        m.put("nombreEmpresa", e.getNombreEmpresa());
        m.put("nombreComercial", e.getNombreComercial());
        m.put("slug", e.getSlug());
        m.put("correoEmpresa", e.getCorreoEmpresa());
        m.put("telefonoEmpresa", e.getTelefonoEmpresa());
        m.put("plan", e.getPlan() != null ? e.getPlan().getNombre() : null);
        m.put("planSaas", e.getPlanSaas());
        m.put("estadoEmpresa", e.getEstadoEmpresa());
        m.put("visibilidadPublica", Boolean.TRUE.equals(e.getVisibilidadPublica()));
        m.put("fechaRegistro", e.getFechaRegistro());
        m.put("fechaAprobacion", e.getFechaAprobacion());
        m.put("logoUrl", e.getLogoUrl());
        return m;
    }

    private Map<String, Object> filaPedido(Pedido p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("fecha", p.getFechaPedido());
        m.put("total", p.getTotalPedido());
        m.put("estado", p.getEstadoPedido());
        m.put("cliente", nombreClientePedido(p));
        m.put("metodoPago", p.getMetodoPago());
        return m;
    }

    private Map<String, Object> filaEquipo(com.hotclick.model.MiembroEmpresa m) {
        var u = m.getUsuario();
        Map<String, Object> r = new HashMap<>();
        r.put("id", u.getId());
        r.put("nombre", u.getNombre() + " " + (u.getApellidoPaterno() != null ? u.getApellidoPaterno() : ""));
        r.put("correo", u.getCorreo());
        r.put("telefono", u.getTelefono());
        r.put("rol", m.getRolEnEmpresa());
        r.put("fechaIngreso", m.getFechaIngreso());
        r.put("estado", u.getEstado());
        return r;
    }

    private static String nombreClientePedido(Pedido p) {
        if (p.getUsuarioFinal() == null) return "—";
        String apellido = p.getUsuarioFinal().getApellidoPaterno() != null
            ? p.getUsuarioFinal().getApellidoPaterno() : "";
        return p.getUsuarioFinal().getNombre() + " " + apellido;
    }
}
