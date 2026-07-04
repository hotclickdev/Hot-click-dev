package com.hotclick.service;

import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class VentaService {

    private static final Logger log = LoggerFactory.getLogger(VentaService.class);

    @Autowired private PedidoService               pedidoService;
    @Autowired private StockService                stockService;
    @Autowired private ProductoRepository          productoRepository;
    @Autowired private BodegaRepository            bodegaRepository;
    @Autowired private UsuarioRepository           usuarioRepository;
    @Autowired private CarritoRepository           carritoRepository;
    @Autowired private MovimientoStockRepository   movimientoStockRepository;
    @Autowired private EmpresaRepository           empresaRepository;

    /**
     * Crea una venta validando y descontando stock con bloqueo pesimista (SELECT FOR UPDATE).
     *
     * Si el DTO incluye {@code carritoId}, también libera las reservas de ese carrito
     * y lo marca como CONVERTIDO — todo dentro de la misma transacción.
     */
    @Transactional
    public Pedido crearVenta(VentaRequestDTO dto, String correoOperador, Long empresaId) {
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("Debe agregar al menos un producto");
        }
        if (empresaId == null) {
            throw new IllegalStateException("No se pudo determinar la empresa del usuario actual");
        }
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada: id=" + empresaId));

        boolean desdeCarrito = dto.getCarritoId() != null;
        Usuario usuario      = resolverUsuario(dto, correoOperador);
        Bodega  bodega       = resolverBodega(dto, empresaId);

        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setMetodoPago(dto.getMetodoPago() != null ? dto.getMetodoPago() : "EFECTIVO");
        pedido.setMetodoEnvio(resolverMetodoEnvio(dto));
        pedido.setNotas(dto.getNotas());
        pedido.setAplicaImpuesto(false);
        pedido.setMontoImpuesto(0);
        pedido.setDescuentoTotal(0);
        int costoEnvio = dto.getCostoEnvio() != null && dto.getCostoEnvio() > 0 ? dto.getCostoEnvio() : 0;
        pedido.setCostoEnvio(costoEnvio);

        List<PedidoItem> items = new ArrayList<>();
        int subtotal = 0;
        int costo    = 0;

        for (VentaRequestDTO.ItemVentaDTO itemDto : dto.getItems()) {
            // SELECT FOR UPDATE: bloquea la fila en PostgreSQL hasta el COMMIT.
            // Si otra transacción concurrente intenta modificar el mismo producto, espera aquí.
            Producto producto = productoRepository.findByIdForUpdate(itemDto.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", itemDto.getProductoId()));

            int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;

            validarProductoParaVenta(producto, cantidad, desdeCarrito);

            // Descontar stock real + registrar auditoría.
            // Si viene de carrito: también libera la reserva (stockReservado--)
            stockService.descontarPorVenta(producto, cantidad, desdeCarrito,
                "pendiente", correoOperador);

            int precioUnit = producto.getPrecioVenta()  != null ? producto.getPrecioVenta()  : 0;
            int costoUnit  = producto.getPrecioCompra() != null ? producto.getPrecioCompra() : 0;
            int subItem    = precioUnit * cantidad;
            int costoItem  = costoUnit  * cantidad;

            PedidoItem item = new PedidoItem();
            item.setPedido(pedido);
            item.setProducto(producto);
            item.setCantidad(cantidad);
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
        pedido.setTotalPedido(subtotal + costoEnvio);
        pedido.setMargenGananciaPedido(
            costo > 0
                ? BigDecimal.valueOf((subtotal - costo) * 100.0 / costo).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO
        );
        pedido.setItems(items);
        String estadoInicial = dto.getEstadoInicial();
        pedido.setEstadoPedido(estadoInicial != null && !estadoInicial.isBlank()
            ? estadoInicial
            : Constants.PEDIDO_COMPLETADO);

        Pedido nuevo = pedidoService.crearPedido(pedido);

        // Ahora que tenemos el número de pedido real, actualizamos la referencia en los movimientos
        actualizarReferenciaMovimientos(items, nuevo.getNumeroPedido());

        if (desdeCarrito) {
            convertirCarrito(dto.getCarritoId(), nuevo.getNumeroPedido());
        }

        return nuevo;
    }

    // ── Validaciones ────────────────────────────────────────────────────────────

    private void validarProductoParaVenta(Producto producto, int cantidad, boolean desdeCarrito) {
        if (producto.getEstado() != Constants.ESTADO_ACTIVO) {
            throw new IllegalStateException("Producto no disponible: " + producto.getNombreProducto());
        }
        if (Boolean.TRUE.equals(producto.getEsUnico()) && Boolean.TRUE.equals(producto.getVendido())) {
            throw new IllegalStateException("El artículo único '" + producto.getNombreProducto() + "' ya fue vendido");
        }
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        // Si viene de carrito: la reserva YA existe, por eso comparamos contra stockActual.
        // Si es venta directa (admin): comparamos contra stockDisponible = stockActual - stockReservado,
        // respetando las reservas activas de otros usuarios.
        int comparar = desdeCarrito ? producto.getStockActual() : producto.getStockDisponible();
        if (comparar < cantidad) {
            throw new StockInsuficienteException(producto.getNombreProducto(), comparar, cantidad);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private void actualizarReferenciaMovimientos(List<PedidoItem> items, String numeroPedido) {
        items.forEach(item -> {
            List<MovimientoStock> movs = movimientoStockRepository
                .findByProductoIdOrderByFechaMovimientoDesc(item.getProducto().getId());
            if (!movs.isEmpty()) {
                MovimientoStock ultimo = movs.get(0);
                ultimo.setReferencia(numeroPedido);
                movimientoStockRepository.save(ultimo);
            }
        });
    }

    private void convertirCarrito(Long carritoId, String numeroPedido) {
        carritoRepository.findById(carritoId).ifPresent(carrito -> {
            carrito.setEstadoCarrito(Constants.CARRITO_CONVERTIDO);
            carrito.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
            carrito.getItems().clear();
            carrito.setTotalCarrito(0);
            carritoRepository.save(carrito);
            log.info("Carrito id={} convertido por pedido {}", carritoId, numeroPedido);
        });
    }

    private Usuario resolverUsuario(VentaRequestDTO dto, String correoOperador) {
        if (dto.getClienteId() != null) {
            return usuarioRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado: id=" + dto.getClienteId()));
        }
        return usuarioRepository.findByCorreo(correoOperador)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario operador no encontrado: " + correoOperador));
    }

    private String resolverMetodoEnvio(VentaRequestDTO dto) {
        if (dto.getMetodoEnvio() != null) return dto.getMetodoEnvio();
        if ("DOMICILIO".equalsIgnoreCase(dto.getTipoEntrega())) return Constants.ENVIO_DOMICILIO;
        return Constants.ENVIO_RETIRO;
    }

    private Bodega resolverBodega(VentaRequestDTO dto, Long empresaId) {
        if (dto.getBodegaId() != null) {
            Bodega bodega = bodegaRepository.findById(dto.getBodegaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega no encontrada: id=" + dto.getBodegaId()));
            // Evita que una empresa registre una venta contra la bodega de otra empresa.
            if (bodega.getEmpresa() != null && !empresaId.equals(bodega.getEmpresa().getId())) {
                throw new IllegalArgumentException("La bodega indicada no pertenece a tu empresa");
            }
            return bodega;
        }
        // Antes caía a la PRIMERA bodega activa de TODO el sistema (fuga entre empresas).
        // Ahora se limita a las bodegas de la empresa actual.
        List<Bodega> bodegas = bodegaRepository
            .findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO);
        if (bodegas.isEmpty()) {
            throw new IllegalStateException("No tenés bodegas activas configuradas. Creá una bodega antes de registrar una venta.");
        }
        return bodegas.get(0);
    }
}
