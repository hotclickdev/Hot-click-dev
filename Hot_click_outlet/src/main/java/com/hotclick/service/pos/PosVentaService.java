package com.hotclick.service.pos;

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

    @Transactional
    public Pedido crearVenta(PosVentaDTO dto, Long usuarioId, Long empresaId, String correo) {
        Usuario cliente = resolverCliente(dto.getClienteId());
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        Bodega bodega = resolverBodega(dto.getBodegaId(), empresaId);

        Pedido pedido = armarPedido(dto, cliente, bodega, empresa);
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

    public List<Pedido> historial(Long empresaId) {
        return pedidoRepository.findByEmpresaIdAndOrigenOrderByFechaPedidoDesc(empresaId, "POS");
    }

    private Usuario resolverCliente(Long clienteId) {
        Long id = clienteId != null ? clienteId : Constants.ID_USUARIO_MOSTRADOR;
        return usuarioRepository.findById(id)
            .orElseGet(() -> usuarioRepository.findById(Constants.ID_USUARIO_MOSTRADOR)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario mostrador (id=999) no encontrado")));
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
        pedido.setOrigen("POS");
        pedido.setEstadoPedido("ENTREGADO");
        pedido.setMetodoEnvio("RETIRO");
        pedido.setMetodoPago(dto.getMetodoPago() != null ? dto.getMetodoPago() : "EFECTIVO");
        pedido.setCostoEnvio(0);
        pedido.setDescuentoTotal(dto.getDescuentoGlobal() != null ? dto.getDescuentoGlobal() : 0);
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
            int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;
            int precio = itemDto.getPrecioUnitario() != null
                ? itemDto.getPrecioUnitario() : producto.getPrecioEfectivo();
            int costo = producto.getPrecioCompra();
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
        return new TotalesPos(subtotal, costoTotal, pedido.getDescuentoTotal());
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
