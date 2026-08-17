package com.hotclick.service.pedido;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class PedidoDetailMapper {

    private static final Logger log = LoggerFactory.getLogger(PedidoDetailMapper.class);

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private ObjectMapper objectMapper;

    public List<Map<String, Object>> listarResumenPaginado(int page, int size) {
        return listarResumenPaginadoPorEmpresa(page, size, null);
    }

    public List<Map<String, Object>> listarResumenPaginadoPorEmpresa(int page, int size, Long empresaId) {
        var pageable = PageRequest.of(page, size, Sort.by("fechaPedido").descending());
        var content = empresaId != null
            ? pedidoRepository.findByEmpresaIdOrderByFechaPedidoDesc(empresaId, pageable).getContent()
            : pedidoRepository.findAllByOrderByFechaPedidoDesc(pageable).getContent();
        return content.stream().map(p -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id",            p.getId());
                m.put("numeroPedido",  p.getNumeroPedido());
                m.put("fechaCreacion", p.getFechaPedido());
                m.put("estado",        p.getEstadoPedido());
                m.put("total",         p.getTotalPedido());
                m.put("metodoPago",    p.getMetodoPago());
                m.put("metodoEnvio",   p.getMetodoEnvio());
                m.put("costoEnvio",    p.getCostoEnvio());
                m.put("nombreCliente", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getNombre() : "—");
                m.put("clienteCorreo", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getCorreo() : "—");
                m.put("items", List.of());
                return m;
            }).toList();
    }

    public List<Map<String, Object>> listarTodosConDetallesByEmpresa(Long empresaId) {
        return pedidoRepository.findAllWithDetailsByEmpresaId(empresaId).stream()
            .map(this::mapPedidoDetalle).toList();
    }

    public List<Map<String, Object>> listarTodosConDetalles() {
        return pedidoRepository.findAllWithDetails().stream()
            .map(this::mapPedidoDetalle).toList();
    }

    public Map<String, Object> mapPedidoDetalle(Pedido p) {
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
        try {
            String rawN = p.getNotificaciones();
            m.put("notificaciones", objectMapper.readValue(
                (rawN != null && !rawN.isBlank()) ? rawN : "[]",
                new TypeReference<List<Map<String, Object>>>() {}));
        } catch (Exception e) { log.warn("notificaciones parse error: {}", e.getMessage()); m.put("notificaciones", List.of()); }
        m.put("clienteId",     p.getUsuarioFinal() != null ? p.getUsuarioFinal().getId()       : null);
        m.put("nombreCliente", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getNombre()   : "—");
        m.put("clienteCorreo", p.getUsuarioFinal() != null ? p.getUsuarioFinal().getCorreo()   : "—");
        m.put("clienteTel",    p.getUsuarioFinal() != null ? p.getUsuarioFinal().getTelefono() : "");
        List<Map<String, Object>> items = p.getItems().stream().map(i -> {
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("productoId",      i.getProducto() != null ? i.getProducto().getId() : null);
            im.put("nombreProducto",  i.getProducto() != null ? i.getProducto().getNombreProducto() : "—");
            im.put("imagenUrl",       i.getProducto() != null ? i.getProducto().getImagenPrincipalUrl() : null);
            im.put("categoriaId",     i.getProducto() != null && i.getProducto().getCategoria() != null ? i.getProducto().getCategoria().getId() : null);
            im.put("categoriaNombre", i.getProducto() != null && i.getProducto().getCategoria() != null ? i.getProducto().getCategoria().getNombreCategoria() : "—");
            im.put("cantidad",        i.getCantidad());
            im.put("precioUnitario",  i.getPrecioUnitarioMomento());
            return im;
        }).toList();
        m.put("items", items);
        return m;
    }
}
