package com.hotclick.service;

import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PedidoService {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Transactional
    public Pedido crearPedido(Pedido pedido) {
        pedido.setNumeroPedido("ORD-" + System.currentTimeMillis());
        pedido.setFechaPedido(LocalDateTime.now());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        return pedidoRepository.save(pedido);
    }

    @Transactional
    public Pedido cambiarEstado(Long id, String nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setEstadoPedido(nuevoEstado);
        return pedidoRepository.save(pedido);
    }

    public Pedido buscarPorId(Long id) {
        return pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
    }

    public Page<Pedido> listarPorUsuario(Long usuarioId, Pageable pageable) {
        return pedidoRepository.findByUsuarioFinalIdOrderByFechaPedidoDesc(usuarioId, pageable);
    }

    public List<Pedido> listarPendientes() {
        return pedidoRepository.findByEstadoPedidoAndEstado(Constants.PEDIDO_PENDIENTE, Constants.ESTADO_ACTIVO);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosConDetalles() {
        return pedidoRepository.findAllWithDetails().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           p.getId());
            m.put("numeroPedido", p.getNumeroPedido());
            m.put("fechaPedido",  p.getFechaPedido());
            m.put("estadoPedido", p.getEstadoPedido());
            m.put("totalPedido",  p.getTotalPedido());
            m.put("metodoPago",   p.getMetodoPago());
            m.put("notas",        p.getNotas());
            m.put("clienteId",    p.getUsuarioFinal() != null ? p.getUsuarioFinal().getId()      : null);
            m.put("clienteNombre",p.getUsuarioFinal() != null ? p.getUsuarioFinal().getNombre()  : "—");
            m.put("clienteCorreo",p.getUsuarioFinal() != null ? p.getUsuarioFinal().getCorreo()  : "—");
            m.put("clienteTel",   p.getUsuarioFinal() != null ? p.getUsuarioFinal().getTelefono(): "");
            List<Map<String, Object>> items = p.getItems().stream().map(i -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("productoId",      i.getProducto() != null ? i.getProducto().getId()              : null);
                im.put("nombreProducto",  i.getProducto() != null ? i.getProducto().getNombreProducto()  : "—");
                im.put("categoriaId",     i.getProducto() != null && i.getProducto().getCategoria() != null ? i.getProducto().getCategoria().getId()              : null);
                im.put("categoriaNombre", i.getProducto() != null && i.getProducto().getCategoria() != null ? i.getProducto().getCategoria().getNombreCategoria() : "—");
                im.put("cantidad",        i.getCantidad());
                im.put("precioUnitario",  i.getPrecioUnitarioMomento());
                return im;
            }).collect(Collectors.toList());
            m.put("items", items);
            return m;
        }).collect(Collectors.toList());
    }
}
