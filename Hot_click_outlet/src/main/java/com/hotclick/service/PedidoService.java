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

    @Autowired
    private NotificacionEmailService notificacionEmailService;

    @Transactional
    public Pedido crearPedido(Pedido pedido) {
        pedido.setNumeroPedido("ORD-" + System.currentTimeMillis());
        pedido.setFechaPedido(LocalDateTime.now());
        if (pedido.getEstadoPedido() == null) {
            pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        }
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        return pedidoRepository.save(pedido);
    }

    @Transactional
    public Pedido cambiarEstado(Long id, String nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setEstadoPedido(nuevoEstado);
        pedido = pedidoRepository.save(pedido);
        pedido.getItems().size(); // force-initialize within session
        return pedido;
    }

    @Transactional(readOnly = true)
    public Pedido buscarPorId(Long id) {
        Pedido p = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        p.getItems().size(); // force-initialize within session
        return p;
    }

    @Transactional(readOnly = true)
    public Page<Pedido> listarPorUsuario(Long usuarioId, Pageable pageable) {
        Page<Pedido> page = pedidoRepository.findByUsuarioFinalIdOrderByFechaPedidoDesc(usuarioId, pageable);
        page.getContent().forEach(p -> p.getItems().size());
        return page;
    }

    @Transactional(readOnly = true)
    public List<Pedido> listarPendientes() {
        List<Pedido> list = pedidoRepository.findByEstadoPedidoAndEstado(Constants.PEDIDO_PENDIENTE, Constants.ESTADO_ACTIVO);
        list.forEach(p -> p.getItems().size());
        return list;
    }

    @Transactional
    public Pedido asignarGuia(Long id, String numeroGuia) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setNumeroGuia(numeroGuia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + numeroGuia);
        pedido.setFechaEnvio(LocalDateTime.now());
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        pedido.getItems().size();
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    @Transactional
    public Pedido procesarEnvio(Long id, String guia, Integer costoEnvio) {
        Pedido pedido = pedidoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
        pedido.setNumeroGuia(guia);
        pedido.setUrlTracking("https://rastreo.correos.go.cr/?codigo=" + guia);
        pedido.setFechaEnvio(LocalDateTime.now());
        if (costoEnvio != null) pedido.setCostoEnvio(costoEnvio);
        pedido.setEstadoPedido(Constants.PEDIDO_ENVIADO);
        pedido = pedidoRepository.save(pedido);
        pedido.getItems().size();
        notificacionEmailService.enviarNotificacionGuia(pedido);
        return pedido;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarTodosConDetalles() {
        return pedidoRepository.findAllWithDetails().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",            p.getId());
            m.put("numeroPedido",  p.getNumeroPedido());
            m.put("fechaCreacion", p.getFechaPedido());
            m.put("estado",        p.getEstadoPedido());
            m.put("total",         p.getTotalPedido());
            m.put("metodoPago",    p.getMetodoPago());
            m.put("metodoEnvio",   p.getMetodoEnvio());
            m.put("costoEnvio",    p.getCostoEnvio());
            m.put("numeroGuia",    p.getNumeroGuia());
            m.put("notas",         p.getNotas());
            m.put("clienteId",     p.getUsuarioFinal() != null ? p.getUsuarioFinal().getId()      : null);
            m.put("nombreCliente", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getNombre()  : "—");
            m.put("clienteCorreo", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getCorreo()  : "—");
            m.put("clienteTel",    p.getUsuarioFinal() != null ? p.getUsuarioFinal().getTelefono(): "");
            List<Map<String, Object>> items = p.getItems().stream().map(i -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("productoId",      i.getProducto() != null ? i.getProducto().getId()                        : null);
                im.put("nombreProducto",  i.getProducto() != null ? i.getProducto().getNombreProducto()              : "—");
                im.put("imagenUrl",       i.getProducto() != null ? i.getProducto().getImagenPrincipalUrl()          : null);
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
