package com.hotclick.service.pos;

import com.hotclick.model.OrigenPedido;
import com.hotclick.dto.PosVentaDTO;
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
    @Autowired private com.hotclick.repository.PosVentaTurnoRepository ventaTurnoRepository;

    @Transactional
    public Pedido crearVenta(PosVentaDTO dto, Long usuarioId, Long empresaId, String correo) {
        Usuario cliente = resolverCliente(dto.getClienteId());
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        Bodega bodega = resolverBodega(dto.getBodegaId(), empresaId);
        TurnoCaja turno = exigirTurnoAbierto(usuarioId, empresaId);
        exigirCantidadesValidas(dto);

        Pedido pedido = armarPedido(dto, cliente, bodega, empresa);
        TotalesPos totales = cargarItemsYStock(dto, pedido, correo);
        aplicarTotales(pedido, totales);

        Pedido saved = pedidoRepository.save(pedido);
        Hibernate.initialize(saved.getItems());
        evictDashboard(empresaId);
        // C-05: dentro de la transacción; si falla, la venta no queda sin turno.
        turnoCajaService.actualizarTotales(turno.getId(), saved.getMetodoPago(), totales.totalPedido());
        // A3: la venta queda ligada a su turno para decidir quién la puede anular.
        ventaTurnoRepository.save(new com.hotclick.model.PosVentaTurno(saved.getId(), turno.getId()));
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

    /**
     * Fail-closed (#221): la venta directa de caja nace ENTREGADO, así que solo admite cobros en mano
     * (EFECTIVO). SINPE (G1: solo se confirma por pasarela), tarjeta y cualquier otra van por el QR del POS.
     */
    static void exigirMetodoSinPasarela(String metodoPago) {
        if (!com.hotclick.service.VentaService.esMetodoSinPasarela(metodoPago)) {
            throw new IllegalArgumentException("En caja directa solo se registra EFECTIVO; "
                + "para tarjeta o SINPE generá el QR de cobro");
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

    private Pedido armarPedido(PosVentaDTO dto, Usuario cliente, Bodega bodega, Empresa empresa) {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("POS-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setUsuarioFinal(cliente);
        pedido.setBodega(bodega);
        pedido.setEmpresa(empresa);
        pedido.setOrigen(OrigenPedido.POS.codigo());
        pedido.setEstadoPedido("ENTREGADO");
        pedido.setMetodoEnvio("RETIRO");
        String metodoPago = com.hotclick.service.VentaService.normalizarMetodo(dto.getMetodoPago());
        exigirMetodoSinPasarela(metodoPago);
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
        List<com.hotclick.service.hacienda.CalculadoraIva.Linea> lineasIva = new ArrayList<>();
        for (PosVentaDTO.Item itemDto : dto.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(itemDto.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", itemDto.getProductoId()));
            PosProductoDeEmpresa.exigirMismoNegocio(producto.getEmpresaId(), pedido.getEmpresa().getId());
            exigirVendiblePorPos(producto);
            int cantidad = cantidadValida(itemDto.getCantidad());
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
            lineasIva.add(new com.hotclick.service.hacienda.CalculadoraIva.Linea(precio, cantidad, producto.getPorcentajeIva()));
        }
        pedido.setItems(items);
        // M4: en régimen simplificado la factura suma el IVA; el tiquete cobra el precio tal cual.
        int impuesto = (int) com.hotclick.service.hacienda.CalculadoraIva.ivaACobrar(
            pedido.getEmpresa(), dto.isFacturaElectronica(), lineasIva);
        pedido.setMontoImpuesto(impuesto);
        pedido.setAplicaImpuesto(impuesto > 0);
        int descuento = Math.min(Math.max(0, pedido.getDescuentoTotal()), subtotal);
        pedido.setDescuentoTotal(descuento);
        return new TotalesPos(subtotal, costoTotal, descuento, impuesto);
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

    static final int CANTIDAD_MAXIMA_POS = 999;

    /** C-01: cantidad 1..999 (mismo rango que el QR). Null = 1 por compatibilidad. */
    static int cantidadValida(Integer solicitada) {
        int cantidad = solicitada != null ? solicitada : 1;
        if (cantidad < 1 || cantidad > CANTIDAD_MAXIMA_POS) {
            throw new IllegalArgumentException("La cantidad de cada producto tiene que estar entre 1 y "
                + CANTIDAD_MAXIMA_POS + ". Revisá el carrito.");
        }
        return cantidad;
    }

    /** Valida todo el carrito antes de tocar stock o totales. */
    private static void exigirCantidadesValidas(PosVentaDTO dto) {
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new IllegalArgumentException("La venta no tiene productos.");
        }
        for (PosVentaDTO.Item item : dto.getItems()) {
            if (item == null) throw new IllegalArgumentException("La venta tiene un producto vacío.");
            cantidadValida(item.getCantidad());
        }
    }

    /** C-05 (fail-closed): sin turno ABIERTO del cajero en este negocio no se vende en caja. */
    private TurnoCaja exigirTurnoAbierto(Long usuarioId, Long empresaId) {
        TurnoCaja turno = usuarioId == null ? null : turnoCajaService.getTurnoActivo(usuarioId).orElse(null);
        if (turno == null || turno.getId() == null) {
            throw new IllegalStateException("Abrí caja antes de vender: no tenés un turno abierto.");
        }
        Long empresaTurno = turno.getEmpresa() != null ? turno.getEmpresa().getId() : null;
        if (empresaTurno == null || !empresaTurno.equals(empresaId)) {
            throw new IllegalStateException("Tu turno abierto es de otro negocio. Cerralo y abrí caja en este.");
        }
        return turno;
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

    private record TotalesPos(int subtotal, int costoTotal, int descuento, int impuesto) {
        int totalPedido() { return subtotal - descuento + impuesto; }
        /** El IVA cobrado es de Hacienda, no utilidad. */
        int utilidadBruta() { return subtotal - descuento - costoTotal; }
        BigDecimal margen() {
            if (costoTotal <= 0) return BigDecimal.ZERO;
            return BigDecimal.valueOf(utilidadBruta() * 100.0 / costoTotal)
                .setScale(2, java.math.RoundingMode.HALF_UP);
        }
    }
}
