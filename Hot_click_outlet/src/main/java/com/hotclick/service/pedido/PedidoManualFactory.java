package com.hotclick.service.pedido;

import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class PedidoManualFactory {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private N8nWebhookService n8nWebhookService;

    public Pedido crearPedidoManual(ManualPedidoDTO dto, Empresa empresa) {
        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado: " + dto.getUsuarioId()));

        Long bodegaId = dto.getBodegaId() != null ? dto.getBodegaId() : 1L;
        Bodega bodega = bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Bodega no encontrada"));

        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setMetodoEnvio(dto.getMetodoEnvio() != null ? dto.getMetodoEnvio() : Constants.ENVIO_RETIRO);
        pedido.setMetodoPago(dto.getMetodoPago() != null ? dto.getMetodoPago() : "SINPE");
        pedido.setCostoEnvio(dto.getCostoEnvio() != null ? dto.getCostoEnvio() : 0);
        pedido.setEstadoPedido(dto.getEstadoPedido() != null ? dto.getEstadoPedido() : Constants.PEDIDO_PENDIENTE);
        pedido.setNotas(dto.getNotas());
        if (dto.getOrigen() != null) pedido.setOrigen(dto.getOrigen());
        pedido.setDescuentoTotal(0);
        pedido.setAplicaImpuesto(false);
        pedido.setMontoImpuesto(0);
        pedido.setEstado(Constants.ESTADO_ACTIVO);

        int subtotal = 0;
        int costoTotalProductos = 0;
        List<PedidoItem> items = new ArrayList<>();

        // Batch-load todos los productos del pedido en una sola query — evita N+1
        List<Long> productoIds = dto.getItems().stream()
            .map(ManualPedidoDTO.ItemDTO::getProductoId).toList();
        Map<Long, Producto> productoMap = productoRepository.findAllById(productoIds).stream()
            .collect(Collectors.toMap(Producto::getId, p -> p));

        for (ManualPedidoDTO.ItemDTO itemDto : dto.getItems()) {
            Producto producto = productoMap.get(itemDto.getProductoId());
            if (producto == null) throw new RecursoNoEncontradoException("Producto", itemDto.getProductoId());

            int precio   = itemDto.getPrecioUnitario() != null ? itemDto.getPrecioUnitario() : producto.getPrecioVenta();
            int costo    = producto.getPrecioCompra();
            int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;

            PedidoItem item = new PedidoItem();
            item.setPedido(pedido);
            item.setProducto(producto);
            item.setCantidad(cantidad);
            item.setPrecioUnitarioMomento(precio);
            item.setCostoUnitarioMomento(costo);
            item.setSubtotalItem(precio * cantidad);
            item.setUtilidadItem((precio - costo) * cantidad);
            item.setDescuentoAplicado(0);
            item.setEstado(Constants.ESTADO_ACTIVO);
            items.add(item);

            subtotal           += precio * cantidad;
            costoTotalProductos += costo * cantidad;
        }

        pedido.setItems(items);
        pedido.setSubtotal(subtotal);
        int envio = pedido.getCostoEnvio() != null ? pedido.getCostoEnvio() : 0;
        pedido.setTotalPedido(subtotal + envio);
        pedido.setCostoTotalProductos(costoTotalProductos);
        pedido.setUtilidadBruta(subtotal - costoTotalProductos);
        pedido.setEmpresa(empresa);

        Pedido saved = pedidoRepository.save(pedido);
        saved.getItems().size();
        if (Constants.PEDIDO_PAGADO.equals(saved.getEstadoPedido())) {
            n8nWebhookService.notificarPedidoNuevo(saved);
        }
        return saved;
    }
}
