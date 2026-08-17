package com.hotclick.service;

import com.hotclick.dto.OrdenCompraDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.OrdenCompra;
import com.hotclick.model.OrdenCompraItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.OrdenCompraRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.ProveedorRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class OrdenCompraService {

    @Autowired private OrdenCompraRepository ordenCompraRepository;
    @Autowired private ProveedorRepository proveedorRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private StockService stockService;
    @Autowired private CompanyScope companyScope;

    public List<OrdenCompra> listarDeEmpresa(Long empresaId) {
        return ordenCompraRepository.findByEmpresaIdConDetalles(empresaId);
    }

    public OrdenCompra buscarConDetalles(Long id) {
        return ordenCompraRepository.findByIdConDetalles(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Orden no encontrada"));
    }

    @Transactional
    public OrdenCompra crear(OrdenCompraDTO dto, Long empresaId, Long userId) {
        OrdenCompra orden = new OrdenCompra();
        orden.setNumeroOrden(Constants.generarNumeroPedido("OC-"));
        orden.setFechaOrden(LocalDateTime.now(Constants.ZONA_CR));
        orden.setEstado("PENDIENTE");
        empresaRepository.findById(empresaId).ifPresent(orden::setEmpresa);
        usuarioRepository.findById(userId).ifPresent(orden::setUsuario);
        if (dto.getProveedorId() != null) {
            proveedorRepository.findById(dto.getProveedorId()).ifPresent(orden::setProveedor);
        }
        if (dto.getNotas() != null) orden.setNotas(dto.getNotas());
        orden.setTotal(agregarItems(orden, dto.getItems()));
        OrdenCompra saved = ordenCompraRepository.save(orden);
        Hibernate.initialize(saved.getItems());
        return saved;
    }

    @Transactional
    public OrdenCompra recibir(Long id, List<Map<String, Object>> itemsBody, String correo) {
        OrdenCompra orden = buscarConDetalles(id);
        companyScope.assertCanAccessNullable(orden.getEmpresa() != null ? orden.getEmpresa().getId() : null);
        if ("RECIBIDA".equals(orden.getEstado()) || "CANCELADA".equals(orden.getEstado())) {
            throw new IllegalStateException("La orden ya está " + orden.getEstado().toLowerCase());
        }
        aplicarRecepcion(orden, itemsBody, correo);
        boolean todoRecibido = orden.getItems().stream()
            .allMatch(i -> i.getCantidadRecibida() >= i.getCantidad());
        orden.setEstado(todoRecibido ? "RECIBIDA" : "PARCIAL");
        if (todoRecibido) orden.setFechaRecepcion(LocalDateTime.now(Constants.ZONA_CR));
        return ordenCompraRepository.save(orden);
    }

    @Transactional
    public OrdenCompra cancelar(Long id) {
        OrdenCompra orden = ordenCompraRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Orden no encontrada"));
        companyScope.assertCanAccessNullable(orden.getEmpresa() != null ? orden.getEmpresa().getId() : null);
        if ("RECIBIDA".equals(orden.getEstado())) {
            throw new IllegalStateException("No se puede cancelar una orden ya recibida");
        }
        orden.setEstado("CANCELADA");
        return ordenCompraRepository.save(orden);
    }

    private int agregarItems(OrdenCompra orden, List<OrdenCompraDTO.Item> items) {
        int total = 0;
        for (OrdenCompraDTO.Item itemDto : items) {
            Producto producto = productoRepository.findById(itemDto.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", itemDto.getProductoId()));
            int cant = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;
            int precio = itemDto.getPrecioUnitario() != null ? itemDto.getPrecioUnitario() : 0;
            OrdenCompraItem item = new OrdenCompraItem();
            item.setOrden(orden);
            item.setProducto(producto);
            item.setCantidad(cant);
            item.setPrecioUnitario(precio);
            item.setCantidadRecibida(0);
            orden.getItems().add(item);
            total += cant * precio;
        }
        return total;
    }

    private void aplicarRecepcion(OrdenCompra orden, List<Map<String, Object>> itemsBody, String correo) {
        Map<Long, Producto> productosPorId = bloquearProductos(orden, itemsBody);
        for (Map<String, Object> itemMap : itemsBody) {
            Long itemId = Long.parseLong(itemMap.get("itemId").toString());
            int recibido = Integer.parseInt(itemMap.get("cantidadRecibida").toString());
            OrdenCompraItem item = orden.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElse(null);
            if (item == null || recibido <= 0) continue;
            int delta = Math.min(recibido, item.getCantidad() - item.getCantidadRecibida());
            if (delta <= 0) continue;
            item.setCantidadRecibida(item.getCantidadRecibida() + delta);
            Producto producto = productosPorId.get(item.getProducto().getId());
            if (producto == null) {
                throw new RecursoNoEncontradoException("Producto", item.getProducto().getId());
            }
            stockService.ajustarEntrada(producto.getId(), delta,
                "Recepción OC " + orden.getNumeroOrden(), correo);
        }
    }

    private Map<Long, Producto> bloquearProductos(OrdenCompra orden, List<Map<String, Object>> itemsBody) {
        List<Long> productoIds = itemsBody.stream()
            .map(m -> productoIdDeItem(orden, Long.parseLong(m.get("itemId").toString())))
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());
        if (productoIds.isEmpty()) return Map.of();
        return productoRepository.findAllByIdsForUpdate(productoIds).stream()
            .collect(Collectors.toMap(Producto::getId, p -> p));
    }

    private Long productoIdDeItem(OrdenCompra orden, Long itemId) {
        return orden.getItems().stream()
            .filter(i -> i.getId().equals(itemId))
            .findFirst()
            .map(i -> i.getProducto().getId())
            .orElse(null);
    }
}
