package com.hotclick.service.consola;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoItemRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ConsolaPedidoService {

    private final PedidoRepository pedidoRepo;
    private final PedidoItemRepository itemRepo;
    private final ProductoRepository productoRepo;
    private final AuditoriaAdminRegistroService auditoria;

    public ConsolaPedidoService(PedidoRepository pedidoRepo,
                                PedidoItemRepository itemRepo,
                                ProductoRepository productoRepo,
                                AuditoriaAdminRegistroService auditoria) {
        this.pedidoRepo = pedidoRepo;
        this.itemRepo = itemRepo;
        this.productoRepo = productoRepo;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long id) {
        Pedido pedido = pedidoRepo.findParaConsola(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido", id));
        Map<String, Object> mapa = base(pedido);
        mapa.put("items", items(pedido));
        mapa.put("hermanos", hermanos(pedido));
        return mapa;
    }

    @Transactional
    public Map<String, Object> resolver(Long id, String tipo, String nota) {
        if (nota == null || nota.trim().length() < 3) {
            throw new IllegalArgumentException("Escribí qué se acordó. La plata no sale sola.");
        }
        String normal = tipo == null ? "" : tipo.trim().toUpperCase();
        if (!"REEMBOLSO".equals(normal) && !"CAMBIO".equals(normal)) {
            throw new IllegalArgumentException("La resolución es reembolso o cambio.");
        }
        Pedido pedido = pedidoRepo.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido", id));
        pedido.setResolucionOperador(normal);
        pedido.setResolucionNota(nota.trim());
        pedidoRepo.save(pedido);
        auditoria.registrar("PEDIDO_RESOLUCION", "PEDIDO", id, pedido.getEmpresaId(), normal + " · " + nota.trim());
        return Map.of("tipo", normal, "nota", nota.trim());
    }

    @Transactional
    public Map<String, Object> sinInventario(Long pedidoId, Long itemId) {
        PedidoItem item = itemRepo.findParaConsola(itemId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Línea", itemId));
        if (!pedidoId.equals(item.getPedido().getId())) {
            throw new IllegalArgumentException("La línea no pertenece a ese pedido.");
        }
        item.setSinInventario(true);
        itemRepo.save(item);
        Long empresaId = item.getPedido().getEmpresaId();
        auditoria.registrar("SIN_INVENTARIO", "PEDIDO_ITEM", itemId, empresaId,
            item.getProducto().getNombreProducto());
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("itemId", itemId);
        mapa.put("alternativas", alternativas(empresaId, item.getProducto().getId()));
        return mapa;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> delComprador(Long usuarioId) {
        return pedidoRepo.findPorComprador(usuarioId).stream().limit(30).map(this::resumen).toList();
    }

    private Map<String, Object> base(Pedido pedido) {
        Usuario cliente = pedido.getUsuarioFinal();
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("id", pedido.getId());
        mapa.put("numero", pedido.getNumeroPedido());
        mapa.put("fecha", pedido.getFechaPedido());
        mapa.put("estado", pedido.getEstadoPedido());
        mapa.put("guia", pedido.getNumeroGuia());
        mapa.put("total", pedido.getTotalPedido());
        mapa.put("subtotal", pedido.getSubtotal());
        mapa.put("envio", pedido.getCostoEnvio());
        mapa.put("metodoPago", pedido.getMetodoPago());
        mapa.put("grupoPago", pedido.getGrupoPago());
        mapa.put("direccion", pedido.getDireccionEntrega());
        mapa.put("resolucion", pedido.getResolucionOperador());
        mapa.put("resolucionNota", pedido.getResolucionNota());
        mapa.put("clienteNombre", cliente != null ? cliente.getNombre() : pedido.getClienteNombre());
        mapa.put("clienteTel", cliente != null && cliente.getTelefono() != null ? cliente.getTelefono() : pedido.getClienteTel());
        mapa.put("cedula", cliente != null ? cliente.getIdentificacion() : null);
        mapa.put("usuarioId", cliente != null ? cliente.getId() : null);
        mapa.put("empresaId", pedido.getEmpresaId());
        mapa.put("empresaNombre", pedido.getNombreNegocio());
        mapa.put("whatsappNegocio", whatsapp(pedido));
        return mapa;
    }

    private String whatsapp(Pedido pedido) {
        if (pedido.getEmpresa() == null) return null;
        String wa = pedido.getEmpresa().getNumeroWhatsapp();
        return wa != null && !wa.isBlank() ? wa : pedido.getEmpresa().getTelefonoEmpresa();
    }

    private List<Map<String, Object>> items(Pedido pedido) {
        List<Map<String, Object>> filas = new ArrayList<>();
        for (PedidoItem item : pedido.getItems()) {
            Producto producto = item.getProducto();
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("id", item.getId());
            fila.put("productoId", producto != null ? producto.getId() : null);
            fila.put("nombre", producto != null ? producto.getNombreProducto() : "Producto");
            fila.put("cantidad", item.getCantidad());
            fila.put("precio", item.getPrecioUnitarioMomento());
            fila.put("stock", producto != null ? producto.getStockActual() : null);
            fila.put("sinInventario", item.isSinInventario());
            filas.add(fila);
        }
        return filas;
    }

    private List<Map<String, Object>> hermanos(Pedido pedido) {
        if (pedido.getGrupoPago() == null || pedido.getGrupoPago().isBlank()) return List.of();
        return pedidoRepo.findByGrupoPagoOrderByIdAsc(pedido.getGrupoPago()).stream()
            .filter(otro -> !otro.getId().equals(pedido.getId()))
            .map(this::resumen)
            .toList();
    }

    private Map<String, Object> resumen(Pedido pedido) {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("id", pedido.getId());
        mapa.put("numero", pedido.getNumeroPedido());
        mapa.put("fecha", pedido.getFechaPedido());
        mapa.put("estado", pedido.getEstadoPedido());
        mapa.put("total", pedido.getTotalPedido());
        mapa.put("empresaId", pedido.getEmpresaId());
        mapa.put("empresaNombre", pedido.getNombreNegocio());
        return mapa;
    }

    private List<Map<String, Object>> alternativas(Long empresaId, Long productoId) {
        return productoRepo.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO, PageRequest.of(0, 40))
            .getContent().stream()
            .filter(producto -> producto.getStockActual() != null && producto.getStockActual() > 0)
            .filter(producto -> !producto.getId().equals(productoId))
            .limit(8)
            .map(producto -> {
                Map<String, Object> fila = new LinkedHashMap<>();
                fila.put("id", producto.getId());
                fila.put("nombre", producto.getNombreProducto());
                fila.put("precio", producto.getPrecioVenta());
                fila.put("stock", producto.getStockActual());
                return fila;
            })
            .toList();
    }
}
