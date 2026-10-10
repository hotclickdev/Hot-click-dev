package com.hotclick.service.crm;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CrmPedidoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * CRM admin fase 0–1: compras con imagen y texto del producto, ficha de comprador y de negocio.
 * Solo lectura, solo ADMIN (lo exige el controller). Los montos salen tal cual de la base
 * (precio del momento, subtotal, total); nunca costo, utilidad ni margen. Datos de contacto
 * del comprador enmascarados; nunca tokens (seguimiento, recuperación).
 */
@Service
public class CrmAdminService {

    public static final int TAMANO_MAX = 50;

    /** Mismo criterio de «pedido pagado» que AdsMetricasService. */
    static final Set<String> ESTADOS_PAGADOS = Set.of(
        Constants.PEDIDO_PAGADO, Constants.PEDIDO_CONFIRMADO, Constants.PEDIDO_PREPARANDO,
        Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_ENVIADO, Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_COMPLETADO);

    @Autowired private CrmPedidoRepository crmPedidoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private AuditoriaAdminRegistroService auditoria;

    @Transactional(readOnly = true)
    public Map<String, Object> compras(Long empresaId, Long compradorId, int page, int size) {
        Page<Pedido> pagina = crmPedidoRepository.buscar(empresaId, compradorId, pageRequest(page, size));
        return paginaDeCompras(pagina);
    }

    @Transactional
    public Map<String, Object> fichaComprador(Long compradorId, int page, int size) {
        Usuario u = usuarioRepository.findById(compradorId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Comprador no encontrado"));
        Map<String, Object> ficha = new LinkedHashMap<>();
        ficha.put("id", u.getId());
        ficha.put("nombre", nombreCompleto(u));
        ficha.put("correo", enmascararCorreo(u.getCorreo()));
        ficha.put("telefono", enmascararTelefono(u.getTelefono()));
        ficha.put("fechaRegistro", u.getFechaRegistro());
        ficha.put("resumen", resumen(crmPedidoRepository.resumenComprador(compradorId, ESTADOS_PAGADOS)));
        ficha.put("compras", paginaDeCompras(crmPedidoRepository.buscar(null, compradorId, pageRequest(page, size))));
        auditoria.registrar("CRM_VER_COMPRADOR", "USUARIO", compradorId, null,
            "Ficha CRM del comprador " + compradorId);
        return ficha;
    }

    @Transactional
    public Map<String, Object> fichaNegocio(Long empresaId, int page, int size) {
        Empresa e = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Negocio no encontrado"));
        Map<String, Object> ficha = new LinkedHashMap<>();
        ficha.put("id", e.getId());
        ficha.put("nombre", nombreNegocio(e));
        ficha.put("slug", e.getSlug());
        ficha.put("logoUrl", e.getLogoUrl());
        ficha.put("estado", e.getEstadoEmpresa());
        ficha.put("plan", e.getPlan() != null ? e.getPlan().getNombre() : null);
        ficha.put("fechaRegistro", e.getFechaRegistro());
        ficha.put("productosActivos", productoRepository.countProductosActivosByEmpresaId(empresaId));
        Map<String, Object> resumen = resumen(crmPedidoRepository.resumenNegocio(empresaId, ESTADOS_PAGADOS));
        resumen.put("compradoresDistintos", crmPedidoRepository.compradoresDistintosDeNegocio(empresaId));
        ficha.put("resumen", resumen);
        ficha.put("compras", paginaDeCompras(crmPedidoRepository.buscar(empresaId, null, pageRequest(page, size))));
        auditoria.registrar("CRM_VER_NEGOCIO", "EMPRESA", empresaId, empresaId,
            "Ficha CRM del negocio " + empresaId);
        return ficha;
    }

    // ── mapeo ────────────────────────────────────────────────────────────────

    private Map<String, Object> paginaDeCompras(Page<Pedido> pagina) {
        List<Long> ids = pagina.getContent().stream().map(Pedido::getId).toList();
        Map<Long, List<PedidoItem>> itemsPorPedido = ids.isEmpty() ? Map.of()
            : crmPedidoRepository.itemsDe(ids).stream()
                .collect(Collectors.groupingBy(i -> i.getPedido().getId(), LinkedHashMap::new, Collectors.toList()));
        List<Map<String, Object>> contenido = new ArrayList<>();
        for (Pedido p : pagina.getContent()) {
            contenido.add(compra(p, itemsPorPedido.getOrDefault(p.getId(), List.of())));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", contenido);
        out.put("page", pagina.getNumber());
        out.put("size", pagina.getSize());
        out.put("totalElements", pagina.getTotalElements());
        out.put("totalPages", pagina.getTotalPages());
        return out;
    }

    private Map<String, Object> compra(Pedido p, List<PedidoItem> items) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("numeroPedido", p.getNumeroPedido());
        m.put("fecha", p.getFechaPedido());
        m.put("estado", p.getEstadoPedido());
        m.put("origen", p.getOrigen());
        m.put("metodoPago", p.getMetodoPago());
        m.put("total", p.getTotalPedido());
        Usuario u = p.getUsuarioFinal();
        if (u != null) {
            m.put("comprador", Map.of("id", u.getId(), "nombre", nombreCompleto(u)));
        }
        Empresa e = p.getEmpresa();
        if (e != null) {
            Map<String, Object> neg = new LinkedHashMap<>();
            neg.put("id", e.getId());
            neg.put("nombre", nombreNegocio(e));
            neg.put("logoUrl", e.getLogoUrl());
            m.put("negocio", neg);
        }
        List<Map<String, Object>> lineas = new ArrayList<>();
        for (PedidoItem i : items) {
            Producto pr = i.getProducto();
            Map<String, Object> l = new LinkedHashMap<>();
            l.put("productoId", pr != null ? pr.getId() : null);
            l.put("nombre", pr != null ? pr.getNombreProducto() : null);
            l.put("descripcion", pr != null ? pr.getDescripcionCorta() : null);
            l.put("imagenUrl", pr != null ? pr.getImagenPrincipalUrl() : null);
            l.put("cantidad", i.getCantidad());
            l.put("precioUnitario", i.getPrecioUnitarioMomento());
            l.put("subtotal", i.getSubtotalItem());
            lineas.add(l);
        }
        m.put("lineas", lineas);
        return m;
    }

    private static Map<String, Object> resumen(List<Object[]> filas) {
        Object[] r = filas.isEmpty() ? new Object[]{0L, 0L, null, null, 0L} : filas.get(0);
        Map<String, Object> m = new LinkedHashMap<>();
        long pedidos = numero(r[0]);
        m.put("pedidos", pedidos);
        m.put("pedidosPagados", numero(r[4]));
        // Sin pedidos pagados no hay monto que mostrar: null (el front pinta «—»), nunca 0 inventado.
        m.put("totalPagado", numero(r[4]) > 0 ? numero(r[1]) : null);
        m.put("primeraCompra", r[2] instanceof LocalDateTime d ? d : null);
        m.put("ultimaCompra", r[3] instanceof LocalDateTime d ? d : null);
        return m;
    }

    private static long numero(Object o) {
        return o instanceof Number n ? n.longValue() : 0L;
    }

    private static PageRequest pageRequest(int page, int size) {
        return PageRequest.of(Math.max(0, page), Math.max(1, Math.min(TAMANO_MAX, size)));
    }

    private static String nombreCompleto(Usuario u) {
        String n = ((u.getNombre() != null ? u.getNombre() : "") + " "
            + (u.getApellidoPaterno() != null ? u.getApellidoPaterno() : "")).trim();
        return n.isEmpty() ? null : n;
    }

    private static String nombreNegocio(Empresa e) {
        return e.getNombreComercial() != null && !e.getNombreComercial().isBlank()
            ? e.getNombreComercial() : e.getNombreEmpresa();
    }

    /** «ana@correo.com» → «a***@correo.com». */
    static String enmascararCorreo(String correo) {
        if (correo == null || !correo.contains("@")) return null;
        int at = correo.indexOf('@');
        return correo.charAt(0) + "***" + correo.substring(at);
    }

    /** Deja solo los últimos 4 dígitos: «88881234» → «••••1234». */
    static String enmascararTelefono(String tel) {
        if (tel == null) return null;
        String d = tel.replaceAll("\\D", "");
        if (d.length() < 4) return null;
        return "••••" + d.substring(d.length() - 4);
    }
}
