package com.hotclick.service.pos;

import com.hotclick.model.OrigenPedido;
import com.hotclick.dto.PosVentaDTO;
import com.hotclick.exception.PosMetodoRequierePasarelaException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.TurnoCaja;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.service.VentaAvisoService;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class PosVentaService {

    private static final Logger log = LoggerFactory.getLogger(PosVentaService.class);

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private StockService stockService;
    @Autowired private TurnoCajaService turnoCajaService;
    @Autowired private CacheManager cacheManager;
    @Autowired private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Autowired private VentaAvisoService ventaAvisoService;
    @Autowired private CompanyScope companyScope;
    @Autowired private ClienteMostradorResolver clienteMostradorResolver;

    /** Revertible: con false vuelve el comportamiento anterior (la venta directa acepta cualquier método). */
    static final boolean METODOS_DIRECTOS_RESTRINGIDOS = true;

    private static final String METODO_EFECTIVO = "EFECTIVO";

    public static final String MSG_METODO_REQUIERE_PASARELA =
        "La venta directa solo admite efectivo. SINPE y tarjeta se cobran por el QR de la caja.";

    /**
     * Rechaza todo método distinto de EFECTIVO y devuelve el valor canónico a persistir ("EFECTIVO").
     * null, vacío o blanco siguen siendo efectivo. Debe correr antes de cualquier efecto.
     */
    public static String exigirMetodoDirecto(String metodoPago) {
        return exigirMetodoDirecto(metodoPago, METODOS_DIRECTOS_RESTRINGIDOS);
    }

    static String exigirMetodoDirecto(String metodoPago, boolean restringido) {
        if (!restringido) return metodoPago != null ? metodoPago : METODO_EFECTIVO;
        if (metodoPago == null || metodoPago.isBlank()) return METODO_EFECTIVO;
        if (!METODO_EFECTIVO.equals(metodoPago.trim().toUpperCase(java.util.Locale.ROOT))) {
            throw new PosMetodoRequierePasarelaException(MSG_METODO_REQUIERE_PASARELA);
        }
        return METODO_EFECTIVO;
    }

    @Transactional
    public Pedido crearVenta(PosVentaDTO dto, Long usuarioId, Long empresaId, String correo) {
        String metodoPago = exigirMetodoDirecto(dto.getMetodoPago());
        Usuario cliente = resolverCliente(dto.getClienteId());
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        Bodega bodega = resolverBodega(dto.getBodegaId(), empresaId);

        Pedido pedido = armarPedido(dto, metodoPago, cliente, bodega, empresa);
        TotalesPos totales = cargarItemsYStock(dto, pedido, correo);
        aplicarTotales(pedido, totales);

        Pedido saved = pedidoRepository.save(pedido);
        Hibernate.initialize(saved.getItems());
        evictDashboard(empresaId);
        actualizarTurno(usuarioId, saved, totales.totalPedido());
        telegramNotificacionClienteService.notificarVenta(empresaId, saved.getNumeroPedido(),
            totales.totalPedido(), saved.getMetodoPago(), cliente.getNombre(), "POS");
        ventaAvisoService.avisarVentaConfirmada(saved);
        log.info("[POS] Venta {} creada por usuario {} — total ₡{}", saved.getNumeroPedido(), usuarioId, totales.totalPedido());
        return saved;
    }

    /**
     * NP-12: antes devolvía las entidades y Jackson tocaba relaciones LAZY fuera de la transacción → 500.
     * Ahora arma solo lo que muestra el historial, dentro de una transacción de lectura y con una sola consulta.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> historial(Long empresaId) {
        return pedidoRepository.findByEmpresaIdAndOrigenOrderByFechaPedidoDesc(empresaId, "POS").stream()
            .map(PosVentaService::aFilaHistorial).toList();
    }

    /**
     * Ítem 7 (producto 565): un producto eliminado (estado ≠ activo) no se vende en caja.
     * NP-11: un personalizado «a cotizar» no tiene precio (el sistema lo guarda en ₡1): no se vende por POS.
     */
    public static void exigirVendiblePorPos(Producto producto) {
        if (producto.getEstado() == null || producto.getEstado() != Constants.ESTADO_ACTIVO) {
            throw new IllegalStateException("«" + producto.getNombreProducto() + "» fue eliminado y no se puede vender.");
        }
        if (Boolean.TRUE.equals(producto.getEsPersonalizado())
                && "COTIZACION".equalsIgnoreCase(producto.getModoPrecioPersonalizado())) {
            throw new IllegalStateException("«" + producto.getNombreProducto()
                + "» es a cotizar: no tiene precio para cobrarlo en caja. Ponele un precio fijo o vendelo como encargo.");
        }
    }

    static java.util.Map<String, Object> aFilaHistorial(Pedido p) {
        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("numeroPedido", p.getNumeroPedido());
        m.put("fechaPedido", p.getFechaPedido());
        m.put("metodoPago", p.getMetodoPago());
        m.put("totalPedido", p.getTotalPedido());
        m.put("descuentoTotal", p.getDescuentoTotal());
        m.put("usuarioFinal", p.getUsuarioFinal() != null
            ? java.util.Map.of("nombre", java.util.Objects.toString(p.getUsuarioFinal().getNombre(), "")) : null);
        List<java.util.Map<String, Object>> items = new ArrayList<>();
        for (PedidoItem i : p.getItems() != null ? p.getItems() : List.<PedidoItem>of()) {
            java.util.Map<String, Object> it = new java.util.LinkedHashMap<>();
            it.put("producto", i.getProducto() != null
                ? java.util.Map.of("nombreProducto", java.util.Objects.toString(i.getProducto().getNombreProducto(), "")) : null);
            it.put("cantidad", i.getCantidad());
            it.put("subtotalItem", i.getSubtotalItem());
            items.add(it);
        }
        m.put("items", items);
        return m;
    }

    private Usuario resolverCliente(Long clienteId) {
        if (clienteId == null) return clienteMostradorResolver.mostrador();
        return usuarioRepository.findById(clienteId).orElseGet(clienteMostradorResolver::mostrador);
    }

    private Bodega resolverBodega(Long bodegaId, Long empresaId) {
        Bodega bodega = bodegaId != null
            ? bodegaRepository.findById(bodegaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega", bodegaId))
            : bodegaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO).stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay bodega configurada"));
        Long empresaBodega = bodega.getEmpresaId();
        if (empresaBodega == null || !empresaBodega.equals(empresaId)) {
            throw new IllegalArgumentException("La bodega no pertenece a este negocio");
        }
        return bodega;
    }

    private Pedido armarPedido(PosVentaDTO dto, String metodoPago, Usuario cliente, Bodega bodega, Empresa empresa) {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("POS-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setUsuarioFinal(cliente);
        pedido.setBodega(bodega);
        pedido.setEmpresa(empresa);
        pedido.setOrigen(OrigenPedido.POS.codigo());
        pedido.setEstadoPedido("ENTREGADO");
        pedido.setMetodoEnvio("RETIRO");
        pedido.setMetodoPago(metodoPago);
        pedido.setCostoEnvio(0);
        pedido.setDescuentoTotal(resolverDescuento(dto.getDescuentoGlobal()));
        pedido.setAplicaImpuesto(false);
        pedido.setMontoImpuesto(0);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        if (dto.getNotas() != null) pedido.setNotas(dto.getNotas());
        return pedido;
    }

    private TotalesPos cargarItemsYStock(PosVentaDTO dto, Pedido pedido, String correo) {
        int subtotal = 0;
        int costoTotal = 0;
        List<PedidoItem> items = new ArrayList<>();
        for (PosVentaDTO.Item itemDto : dto.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(itemDto.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", itemDto.getProductoId()));
            PosProductoDeEmpresa.exigirMismoNegocio(producto.getEmpresaId(), pedido.getEmpresa().getId());
            exigirVendiblePorPos(producto);
            int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;
            // Precio siempre del catálogo — no confiar en el body del cliente.
            Integer precioObj = producto.getPrecioEfectivo();
            if (precioObj == null) {
                throw new IllegalStateException("Producto sin precio de venta: " + itemDto.getProductoId());
            }
            int precio = precioObj;
            int costo = producto.getPrecioCompra() != null ? producto.getPrecioCompra() : 0;
            int disponible = producto.getStockDisponible();
            if (disponible < cantidad) {
                throw new IllegalArgumentException(
                    "Stock insuficiente para '" + producto.getNombreProducto()
                    + "'. Disponible: " + disponible);
            }
            stockService.descontarPorVentaPOS(producto, cantidad, pedido.getNumeroPedido(), correo);
            items.add(itemDeVenta(pedido, producto, cantidad, precio, costo));
            subtotal += precio * cantidad;
            costoTotal += costo * cantidad;
        }
        pedido.setItems(items);
        int descuento = Math.min(Math.max(0, pedido.getDescuentoTotal()), subtotal);
        pedido.setDescuentoTotal(descuento);
        return new TotalesPos(subtotal, costoTotal, descuento);
    }

    /** Descuento manual solo con permiso pos.descuento (o ADMIN_IT). */
    private int resolverDescuento(Integer solicitado) {
        if (solicitado == null || solicitado <= 0) {
            return 0;
        }
        if (!companyScope.hasAuthority("pos.descuento") && !companyScope.isAdminIT()) {
            throw new SecurityException("Sin permiso para aplicar descuento en caja");
        }
        return solicitado;
    }

    private PedidoItem itemDeVenta(Pedido pedido, Producto producto, int cantidad, int precio, int costo) {
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
        return item;
    }

    private void aplicarTotales(Pedido pedido, TotalesPos totales) {
        pedido.setSubtotal(totales.subtotal());
        pedido.setTotalPedido(totales.totalPedido());
        pedido.setCostoTotalProductos(totales.costoTotal());
        pedido.setUtilidadBruta(totales.utilidadBruta());
        pedido.setMargenGananciaPedido(totales.margen());
    }

    private void actualizarTurno(Long usuarioId, Pedido saved, int totalPedido) {
        try {
            Optional<TurnoCaja> turnoOpt = turnoCajaService.getTurnoActivo(usuarioId);
            turnoOpt.ifPresent(t -> turnoCajaService.actualizarTotales(
                t.getId(), saved.getMetodoPago(), totalPedido));
        } catch (Exception e) {
            log.warn("[POS] No se pudo actualizar turno para venta {}: {}", saved.getId(), e.getMessage());
        }
    }

    @SuppressWarnings("null")
    private void evictDashboard(Long empresaId) {
        Cache c = cacheManager.getCache("dashboard-metricas");
        if (c == null) return;
        if (empresaId != null) {
            c.evict(empresaId.toString());
        } else {
            c.evict("global");
        }
    }

    private record TotalesPos(int subtotal, int costoTotal, int descuento) {
        int totalPedido() { return subtotal - descuento; }
        int utilidadBruta() { return totalPedido() - costoTotal; }
        BigDecimal margen() {
            if (costoTotal <= 0) return BigDecimal.ZERO;
            return BigDecimal.valueOf(utilidadBruta() * 100.0 / costoTotal)
                .setScale(2, java.math.RoundingMode.HALF_UP);
        }
    }
}
