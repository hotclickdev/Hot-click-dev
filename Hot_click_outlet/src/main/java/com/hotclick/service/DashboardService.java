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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;

    public DashboardDTO obtenerMetricas() {
        DashboardDTO dto = new DashboardDTO();

        dto.setTotalUsuarios(usuarioRepository.countUsuariosActivos());
        dto.setTotalProductos(productoRepository.countProductosActivos());
        dto.setTotalPedidos(pedidoRepository.countTotalPedidos());
        dto.setTotalVentas(pedidoRepository.sumTotalVentas());
        dto.setPedidosPendientes(
            pedidoRepository.countByEstadoPedidoAndEstado("PENDIENTE", 1)
        );
        dto.setProductosBajoStock(
            productoRepository.findProductosConStockBajo().size()
        );

        List<CategoriaConteoDTO> categorias = productoRepository.countPorCategoria()
            .stream()
            .map(row -> new CategoriaConteoDTO((String) row[0], (Long) row[1]))
            .collect(Collectors.toList());
        dto.setCategorias(categorias);

        List<Pedido> ultimoLista = pedidoRepository.findAll(
            PageRequest.of(0, 1, Sort.by("fechaPedido").descending())
        ).getContent();

        if (!ultimoLista.isEmpty()) {
            Pedido p = ultimoLista.get(0);
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
            dto.setUltimoPedido(up);
        }

        return dto;
    }
}
