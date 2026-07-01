package com.hotclick.controller;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.utils.Constants;

import com.hotclick.dto.OrdenCompraDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.StockService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/compras")
public class OrdenCompraController {

    @Autowired private OrdenCompraRepository ordenCompraRepository;
    @Autowired private ProveedorRepository   proveedorRepository;
    @Autowired private ProductoRepository    productoRepository;
    @Autowired private EmpresaRepository     empresaRepository;
    @Autowired private UsuarioRepository     usuarioRepository;
    @Autowired private StockService          stockService;
    @Autowired private CompanyScope          companyScope;
    @Autowired private JwtUtil               jwtUtil;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO','CONTABILIDAD')")
    public ResponseEntity<?> listar() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null)
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida"));
        return ResponseEntity.ok(ResponseDTO.success("OK",
            ordenCompraRepository.findByEmpresaIdConDetalles(empresaId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return ordenCompraRepository.findByIdConDetalles(id)
            .map(o -> ResponseEntity.ok(ResponseDTO.success("OK", o)))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    @Transactional
    public ResponseEntity<?> crear(@RequestBody OrdenCompraDTO dto, HttpServletRequest request) {
        try {
            Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
            if (empresaId == null)
                return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida"));
            if (dto.getItems() == null || dto.getItems().isEmpty())
                return ResponseEntity.badRequest().body(ResponseDTO.error("La orden debe tener al menos un ítem"));

            Long userId = jwtUtil.extractUserId(request.getHeader("Authorization").substring(7));

            OrdenCompra orden = new OrdenCompra();
            orden.setNumeroOrden(com.hotclick.utils.Constants.generarNumeroPedido("OC-"));
            orden.setFechaOrden(LocalDateTime.now(Constants.ZONA_CR));
            orden.setEstado("PENDIENTE");

            empresaRepository.findById(empresaId).ifPresent(orden::setEmpresa);
            usuarioRepository.findById(userId).ifPresent(orden::setUsuario);

            if (dto.getProveedorId() != null) {
                proveedorRepository.findById(dto.getProveedorId()).ifPresent(orden::setProveedor);
            }
            if (dto.getNotas() != null) orden.setNotas(dto.getNotas());

            int total = 0;
            for (OrdenCompraDTO.Item itemDto : dto.getItems()) {
                Producto producto = productoRepository.findById(itemDto.getProductoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Producto", itemDto.getProductoId()));

                int cant  = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;
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
            orden.setTotal(total);

            OrdenCompra saved = ordenCompraRepository.save(orden);
            saved.getItems().size();
            return ResponseEntity.ok(ResponseDTO.success("Orden de compra creada", saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al crear la orden"));
        }
    }

    @PutMapping("/{id}/recibir")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    @Transactional
    public ResponseEntity<?> recibirMercancia(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body,
                                               HttpServletRequest request) {
        try {
            OrdenCompra orden = ordenCompraRepository.findByIdConDetalles(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Orden no encontrada"));
            if ("RECIBIDA".equals(orden.getEstado()) || "CANCELADA".equals(orden.getEstado()))
                return ResponseEntity.badRequest().body(ResponseDTO.error("La orden ya está " + orden.getEstado().toLowerCase()));

            String correo = jwtUtil.extractUsername(request.getHeader("Authorization").substring(7));

            // Map itemId → cantidadRecibida desde el body
            Object rawItems = body.get("items");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsBody = (rawItems instanceof List)
                ? (List<Map<String, Object>>) rawItems : null;
            if (itemsBody == null || itemsBody.isEmpty())
                return ResponseEntity.badRequest().body(ResponseDTO.error("items requeridos"));

            // F30: un solo SELECT FOR UPDATE para todos los productos del lote
            List<Long> productoIds = itemsBody.stream()
                .map(m -> {
                    Long itemId = Long.parseLong(m.get("itemId").toString());
                    return orden.getItems().stream()
                        .filter(i -> i.getId().equals(itemId))
                        .findFirst()
                        .map(i -> i.getProducto().getId())
                        .orElse(null);
                })
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

            Map<Long, Producto> productosPorId = productoIds.isEmpty()
                ? Map.of()
                : productoRepository.findAllByIdsForUpdate(productoIds).stream()
                    .collect(Collectors.toMap(Producto::getId, p -> p));

            for (Map<String, Object> itemMap : itemsBody) {
                Long itemId  = Long.parseLong(itemMap.get("itemId").toString());
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
                if (producto == null)
                    throw new RecursoNoEncontradoException("Producto", item.getProducto().getId());
                stockService.ajustarEntrada(producto.getId(), delta,
                    "Recepción OC " + orden.getNumeroOrden(), correo);
            }

            boolean todoRecibido = orden.getItems().stream()
                .allMatch(i -> i.getCantidadRecibida() >= i.getCantidad());
            orden.setEstado(todoRecibido ? "RECIBIDA" : "PARCIAL");
            if (todoRecibido) orden.setFechaRecepcion(LocalDateTime.now(Constants.ZONA_CR));

            OrdenCompra saved = ordenCompraRepository.save(orden);
            return ResponseEntity.ok(ResponseDTO.success("Recepción registrada", saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al recibir mercancía"));
        }
    }

    @PutMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    @Transactional
    public ResponseEntity<?> cancelar(@PathVariable Long id) {
        try {
            OrdenCompra orden = ordenCompraRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Orden no encontrada"));
            if ("RECIBIDA".equals(orden.getEstado()))
                return ResponseEntity.badRequest().body(ResponseDTO.error("No se puede cancelar una orden ya recibida"));
            orden.setEstado("CANCELADA");
            return ResponseEntity.ok(ResponseDTO.success("Orden cancelada", ordenCompraRepository.save(orden)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
