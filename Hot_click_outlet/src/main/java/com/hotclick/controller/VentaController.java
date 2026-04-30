package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    @Autowired private PedidoService pedidoService;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    @PostMapping
    public ResponseEntity<ResponseDTO> crearVenta(
            @RequestBody VentaRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (dto.getItems() == null || dto.getItems().isEmpty())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Debe agregar al menos un producto"));

            Usuario usuario;
            if (dto.getClienteId() != null) {
                usuario = usuarioRepository.findById(dto.getClienteId())
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
            } else {
                usuario = usuarioRepository.findByCorreo(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            }

            Bodega bodega = null;
            if (dto.getBodegaId() != null) {
                bodega = bodegaRepository.findById(dto.getBodegaId())
                    .orElseThrow(() -> new RuntimeException("Bodega no encontrada"));
            } else {
                List<Bodega> bodegas = bodegaRepository.findByEstado(Constants.ESTADO_ACTIVO);
                if (bodegas.isEmpty())
                    return ResponseEntity.badRequest().body(ResponseDTO.error("No hay bodegas activas"));
                bodega = bodegas.get(0);
            }

            Pedido pedido = new Pedido();
            pedido.setUsuarioFinal(usuario);
            pedido.setBodega(bodega);
            pedido.setMetodoPago(dto.getMetodoPago() != null ? dto.getMetodoPago() : "EFECTIVO");
            pedido.setMetodoEnvio(dto.getMetodoEnvio() != null ? dto.getMetodoEnvio() : "RETIRO_TIENDA");
            pedido.setNotas(dto.getNotas());
            pedido.setAplicaImpuesto(false);
            pedido.setMontoImpuesto(0);
            pedido.setDescuentoTotal(0);
            pedido.setCostoEnvio(0);

            List<PedidoItem> items = new ArrayList<>();
            int subtotal = 0;
            int costo    = 0;

            for (VentaRequestDTO.ItemVentaDTO itemDto : dto.getItems()) {
                Producto producto = productoRepository.findById(itemDto.getProductoId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + itemDto.getProductoId()));

                int precioUnit = producto.getPrecioVenta() != null ? producto.getPrecioVenta() : 0;
                int costoUnit  = producto.getPrecioCompra() != null ? producto.getPrecioCompra() : 0;
                int cant       = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;
                int subItem    = precioUnit * cant;
                int costoItem  = costoUnit * cant;

                PedidoItem item = new PedidoItem();
                item.setPedido(pedido);
                item.setProducto(producto);
                item.setCantidad(cant);
                item.setPrecioUnitarioMomento(precioUnit);
                item.setCostoUnitarioMomento(costoUnit);
                item.setDescuentoAplicado(0);
                item.setSubtotalItem(subItem);
                item.setUtilidadItem(subItem - costoItem);
                item.setEstado(Constants.ESTADO_ACTIVO);

                items.add(item);
                subtotal += subItem;
                costo    += costoItem;
            }

            pedido.setSubtotal(subtotal);
            pedido.setCostoTotalProductos(costo);
            pedido.setUtilidadBruta(subtotal - costo);
            pedido.setTotalPedido(subtotal);
            pedido.setMargenGananciaPedido(
                costo > 0
                    ? BigDecimal.valueOf((subtotal - costo) * 100.0 / costo).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO
            );
            pedido.setItems(items);

            Pedido nuevo = pedidoService.crearPedido(pedido);
            return ResponseEntity.ok(ResponseDTO.success("Venta creada exitosamente", nuevo.getId()));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/clientes")
    public ResponseEntity<ResponseDTO> buscarClientes(@RequestParam(required = false) String q) {
        List<Usuario> todos = usuarioRepository.findAll();
        if (q != null && !q.isBlank()) {
            String lower = q.toLowerCase();
            todos = todos.stream().filter(u ->
                (u.getNombre() != null && u.getNombre().toLowerCase().contains(lower)) ||
                (u.getCorreo() != null && u.getCorreo().toLowerCase().contains(lower))
            ).collect(Collectors.toList());
        }
        var resultado = todos.stream().map(u -> {
            var m = new java.util.HashMap<String, Object>();
            m.put("id", u.getId());
            m.put("nombre", u.getNombre() != null ? u.getNombre() : "");
            m.put("correo", u.getCorreo() != null ? u.getCorreo() : "");
            m.put("telefono", u.getTelefono() != null ? u.getTelefono() : "");
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(ResponseDTO.success("Clientes", resultado));
    }
}
