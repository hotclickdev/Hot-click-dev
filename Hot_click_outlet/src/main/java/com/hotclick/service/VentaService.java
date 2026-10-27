package com.hotclick.service;

import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.producto.BodegaTenantGuard;
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
    @Autowired private BodegaTenantGuard           bodegaTenantGuard;
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
        String metodoPago = normalizarMetodo(dto.getMetodoPago());
        String estadoInicialSeguro = resolverEstadoInicial(metodoPago, dto.getEstadoInicial());
        pedido.setMetodoPago(metodoPago);
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

            // IDOR-11: no se vende (ni se descuenta stock de) un producto de otro negocio
            com.hotclick.service.pos.PosProductoDeEmpresa.exigirMismoNegocio(producto.getEmpresaId(), empresaId);
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
        pedido.setEstadoPedido(estadoInicialSeguro);
        OrigenPedido origen = OrigenPedido.normalizar(dto.getOrigen());
        if (origen != null) {
            pedido.setOrigen(origen.codigo());
        }

        Pedido nuevo = pedidoService.crearPedido(pedido);

        // Ahora que tenemos el número de pedido real, actualizamos la referencia en los movimientos
        actualizarReferenciaMovimientos(items, nuevo.getNumeroPedido());

        if (desdeCarrito) {
            convertirCarrito(dto.getCarritoId(), nuevo.getNumeroPedido());
        }

        return nuevo;
    }

    // ── Validaciones ────────────────────────────────────────────────────────────

    /** Métodos cobrados fuera de la plataforma (en mano). Cualquier otro requiere cobro confirmado de pasarela. */
    static final String METODO_EFECTIVO = "EFECTIVO";
    static final String MSG_ESTADO_NO_PERMITIDO = "Estado inicial no permitido";
    static final String MSG_SOLO_PENDIENTE =
        "Este método de pago solo se registra PENDIENTE: el cobro lo confirma la pasarela";

    /** Método normalizado (trim + mayúsculas); en blanco o ausente → EFECTIVO. Es el valor que se guarda. */
    public static String normalizarMetodo(String metodoPago) {
        String m = normalizar(metodoPago);
        return m != null ? m : METODO_EFECTIVO;
    }

    static final java.util.Set<String> METODOS_SIN_PASARELA =
        java.util.Set.of(METODO_EFECTIVO);

    /** Lista blanca de estados con los que puede nacer una venta manual. */
    static final java.util.Set<String> ESTADOS_INICIALES_PERMITIDOS = java.util.Set.of(
        Constants.PEDIDO_PENDIENTE, Constants.PEDIDO_CONFIRMADO, Constants.PEDIDO_PAGADO,
        Constants.PEDIDO_PREPARANDO, Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_COMPLETADO);

    static String normalizar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim().toUpperCase(java.util.Locale.ROOT);
    }

    public static boolean esMetodoSinPasarela(String metodoPago) {
        String m = normalizar(metodoPago);
        return m != null && METODOS_SIN_PASARELA.contains(m);
    }

    /**
     * Fail-closed (#221/#225): devuelve el estado inicial normalizado. Solo EFECTIVO puede nacer en cualquier
     * estado de la lista blanca (por defecto COMPLETADO); SINPE (G1), TARJETA, ONVO, STRIPE, TILOPAY y métodos
     * desconocidos solo nacen PENDIENTE, porque únicamente la pasarela confirma su cobro.
     */
    static String resolverEstadoInicial(String metodoPago, String estadoInicial) {
        String estado = normalizar(estadoInicial);
        if (estado != null && !ESTADOS_INICIALES_PERMITIDOS.contains(estado)) {
            throw new IllegalArgumentException(MSG_ESTADO_NO_PERMITIDO);
        }
        if (esMetodoSinPasarela(metodoPago)) {
            return estado != null ? estado : Constants.PEDIDO_COMPLETADO;
        }
        if (estado != null && !Constants.PEDIDO_PENDIENTE.equals(estado)) {
            throw new IllegalArgumentException(MSG_SOLO_PENDIENTE);
        }
        return Constants.PEDIDO_PENDIENTE;
    }

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
            // Una bodega ajena responde igual que una inexistente (404 con el mismo mensaje): no revela que existe.
            return bodegaTenantGuard.exigirDeLaEmpresa(dto.getBodegaId(), empresaId);
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
