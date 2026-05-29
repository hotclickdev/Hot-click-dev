package com.hotclick.service;

import com.hotclick.dto.DashboardDTO;
import com.hotclick.dto.DashboardDTO.CategoriaConteoDTO;
import com.hotclick.dto.DashboardDTO.UltimoPedidoDTO;
import com.hotclick.dto.DashboardDTO.ItemDTO;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;

    @Cacheable(value = "dashboard-metricas", key = "#empresaId != null ? #empresaId.toString() : 'global'")
    @Transactional(readOnly = true)
    public DashboardDTO obtenerMetricas(Long empresaId) {
        DashboardDTO dto = new DashboardDTO();

        if (empresaId != null) {
            dto.setTotalUsuarios(usuarioRepository.countActivosByEmpresaId(empresaId));
            dto.setTotalProductos(productoRepository.countProductosActivosByEmpresaId(empresaId));
            dto.setTotalPedidos(pedidoRepository.countTotalPedidosByEmpresaId(empresaId));
            dto.setTotalVentas(pedidoRepository.sumTotalVentasByEmpresaId(empresaId));
            dto.setPedidosPendientes(
                pedidoRepository.findByEmpresaIdAndEstadoPedidoAndEstado(empresaId, "PENDIENTE", 1).size()
            );
            dto.setUsuariosPendientes(0);
            dto.setStockBajo((int) productoRepository.countProductosConStockBajoByEmpresaId(empresaId));

            List<CategoriaConteoDTO> categorias = productoRepository.countPorCategoriaByEmpresaId(empresaId)
                .stream()
                .map(row -> new CategoriaConteoDTO((String) row[0], (Long) row[1]))
                .collect(Collectors.toList());
            dto.setCategorias(categorias);

            List<Pedido> ultimoLista = pedidoRepository.findUltimosByEmpresaId(
                empresaId, PageRequest.of(0, 1)
            );
            if (!ultimoLista.isEmpty()) {
                dto.setUltimoPedido(mapUltimoPedido(ultimoLista.get(0)));
            }
        } else {
            dto.setTotalUsuarios(usuarioRepository.countUsuariosActivos());
            dto.setTotalProductos(productoRepository.countProductosActivos());
            dto.setTotalPedidos(pedidoRepository.countTotalPedidos());
            dto.setTotalVentas(pedidoRepository.sumTotalVentas());
            dto.setPedidosPendientes(
                pedidoRepository.countByEstadoPedidoAndEstado("PENDIENTE", 1)
            );
            dto.setUsuariosPendientes(usuarioRepository.countUsuariosPendientes());
            dto.setStockBajo((int) productoRepository.countProductosConStockBajo());

            List<CategoriaConteoDTO> categorias = productoRepository.countPorCategoria()
                .stream()
                .map(row -> new CategoriaConteoDTO((String) row[0], (Long) row[1]))
                .collect(Collectors.toList());
            dto.setCategorias(categorias);

            List<Pedido> ultimoLista = pedidoRepository.findAll(
                PageRequest.of(0, 1, Sort.by("fechaPedido").descending())
            ).getContent();
            if (!ultimoLista.isEmpty()) {
                dto.setUltimoPedido(mapUltimoPedido(ultimoLista.get(0)));
            }
        }

        return dto;
    }

    private UltimoPedidoDTO mapUltimoPedido(Pedido p) {
        UltimoPedidoDTO up = new UltimoPedidoDTO();
        up.setNumeroPedido(p.getNumeroPedido());
        up.setFechaPedido(p.getFechaPedido());
        up.setEstadoPedido(p.getEstadoPedido());
        up.setTotalPedido(p.getTotalPedido());
        if (p.getUsuarioFinal() != null) {
            up.setClienteNombre(p.getUsuarioFinal().getNombre());
            up.setClienteCorreo(p.getUsuarioFinal().getCorreo());
        }
        List<ItemDTO> items = p.getItems().stream()
            .map(i -> new ItemDTO(
                i.getProducto().getNombreProducto(),
                i.getCantidad(),
                i.getPrecioUnitarioMomento()
            ))
            .collect(Collectors.toList());
        up.setItems(items);
        return up;
    }
}
