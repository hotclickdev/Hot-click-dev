package com.hotclick.service.pos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PosQrPedidoFactory {

    private static final Logger log = LoggerFactory.getLogger(PosQrPedidoFactory.class);

    @Autowired private UsuarioRepository                  usuarioRepo;
    @Autowired private BodegaRepository                   bodegaRepo;
    @Autowired private ProductoRepository                 productoRepo;
    @Autowired private PedidoRepository                   pedidoRepo;
    @Autowired private PosQrSesionRepository              posQrRepo;
    @Autowired private StockService                       stockService;
    @Autowired private TurnoCajaService                   turnoCajaService;
    @Autowired private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Autowired private PosQrSessionService                sessionService;

    public void crearPedidoPOS(PosQrSesion sesion, String metodoPago) {
        try {
            List<Map<String, Object>> items = leerItems(sesion);
            Empresa empresa = sesion.getEmpresa();
            Usuario cajero  = sesion.getUsuario();
            Usuario cliente = resolverCliente(sesion.getClienteId());
            Bodega bodega   = resolverBodega(sesion.getBodegaId(), empresa.getId());

            Pedido pedido = armarPedido(sesion, metodoPago, empresa, cliente, bodega, cajero);
            TotalesQr totales = cargarItems(items, pedido, correoCajero(cajero));
            aplicarTotales(pedido, totales);

            Pedido saved = pedidoRepo.save(pedido);
            marcarPagado(sesion, saved);
            actualizarTurno(sesion, metodoPago, totales.totalPedido());

            log.info("[POS-QR] Venta {} registrada — método={} total={} cajero={} cliente={}",
                saved.getNumeroPedido(), metodoPago, totales.totalPedido(),
                idCajero(cajero), cliente.getId());
            telegramNotificacionClienteService.notificarVenta(empresa.getId(), saved.getNumeroPedido(),
                totales.totalPedido(), metodoPago, cliente.getNombre(), "POS");
        } catch (RuntimeException e) {
            log.error("[POS-QR] Error creando pedido POS: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("[POS-QR] Error creando pedido POS: {}", e.getMessage(), e);
            throw new IllegalStateException("Error al registrar la venta: " + e.getMessage(), e);
        }
    }

    private List<Map<String, Object>> leerItems(PosQrSesion sesion) throws Exception {
        return sessionService.getMapper().readValue(sesion.getItemsJson(), new TypeReference<>() {});
    }

    Usuario resolverCliente(Long clienteId) {
        Long id = clienteId != null ? clienteId : Constants.ID_USUARIO_MOSTRADOR;
        return usuarioRepo.findById(id)
            .orElseGet(() -> usuarioRepo.findById(Constants.ID_USUARIO_MOSTRADOR)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario mostrador no encontrado")));
    }

    Bodega resolverBodega(Long bodegaId, Long empresaId) {
        if (bodegaId != null) {
            Bodega bodega = bodegaRepo.findById(bodegaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega", bodegaId));
            PosProductoDeEmpresa.exigirMismoNegocio(bodega.getEmpresaId(), empresaId);
            return bodega;
        }
        return bodegaRepo.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO).stream().findFirst()
            .orElseThrow(() -> new IllegalStateException("No hay bodega configurada"));
    }

    private Pedido armarPedido(PosQrSesion sesion, String metodoPago,
                               Empresa empresa, Usuario cliente, Bodega bodega, Usuario cajero) {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("POS-QR-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setUsuarioFinal(cliente);
        pedido.setBodega(bodega);
        pedido.setEmpresa(empresa);
        pedido.setOrigen("POS");
        pedido.setEstadoPedido("ENTREGADO");
        pedido.setMetodoEnvio("RETIRO");
        pedido.setMetodoPago(metodoPago);
        pedido.setCostoEnvio(0);
        pedido.setDescuentoTotal(0);
        pedido.setAplicaImpuesto(false);
        pedido.setMontoImpuesto(0);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedido.setNotas(notaConCajero(sesion.getNotas(), cajero));
        return pedido;
    }

    static String notaConCajero(String notas, Usuario cajero) {
        String cajeroTxt = "Cajero: " + nombreCajero(cajero);
        if (notas == null || notas.isBlank()) return cajeroTxt;
        return notas.trim() + " · " + cajeroTxt;
    }

    static String nombreCajero(Usuario cajero) {
        if (cajero == null) return "POS";
        if (cajero.getNombre() != null && !cajero.getNombre().isBlank()) return cajero.getNombre();
        if (cajero.getCorreo() != null && !cajero.getCorreo().isBlank()) return cajero.getCorreo();
        return "POS";
    }

    static String correoCajero(Usuario cajero) {
        if (cajero == null) return "pos@hotclick.local";
        if (cajero.getCorreo() != null && !cajero.getCorreo().isBlank()) return cajero.getCorreo();
        return "pos@hotclick.local";
    }

    static Long idCajero(Usuario cajero) {
        return cajero != null ? cajero.getId() : null;
    }

    private TotalesQr cargarItems(List<Map<String, Object>> items, Pedido pedido, String correo) {
        int subtotal = 0;
        int costoTotal = 0;
        List<PedidoItem> pedidoItems = new ArrayList<>();
        for (Map<String, Object> itemMap : items) {
            PedidoItem linea = lineaDeItem(itemMap, pedido, correo);
            pedidoItems.add(linea);
            subtotal   += linea.getSubtotalItem();
            costoTotal += linea.getCostoUnitarioMomento() * linea.getCantidad();
        }
        pedido.setItems(pedidoItems);
        return new TotalesQr(subtotal, costoTotal);
    }

    private PedidoItem lineaDeItem(Map<String, Object> itemMap, Pedido pedido, String correo) {
        Long productoId = PosQrSessionService.productoIdDe(itemMap);
        int cantidad    = PosQrSessionService.enteroDe(itemMap, "cantidad", 1);
        int precio      = PosQrSessionService.enteroDe(itemMap, "precioUnitario", 0);

        Producto producto = productoRepo.findByIdForUpdate(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));
        if (producto.getStockDisponible() < cantidad) {
            throw new StockInsuficienteException(producto.getNombreProducto(),
                producto.getStockDisponible(), cantidad);
        }
        stockService.descontarPorVentaPOS(producto, cantidad, pedido.getNumeroPedido(), correo);

        PedidoItem pi = new PedidoItem();
        pi.setPedido(pedido);
        pi.setProducto(producto);
        pi.setCantidad(cantidad);
        pi.setPrecioUnitarioMomento(precio);
        pi.setCostoUnitarioMomento(producto.getPrecioCompra());
        pi.setSubtotalItem(precio * cantidad);
        pi.setUtilidadItem((precio - producto.getPrecioCompra()) * cantidad);
        pi.setDescuentoAplicado(0);
        pi.setEstado(Constants.ESTADO_ACTIVO);
        return pi;
    }

    private void aplicarTotales(Pedido pedido, TotalesQr totales) {
        int utilidad = totales.totalPedido() - totales.costoTotal();
        pedido.setSubtotal(totales.subtotal());
        pedido.setTotalPedido(totales.totalPedido());
        pedido.setCostoTotalProductos(totales.costoTotal());
        pedido.setUtilidadBruta(utilidad);
        pedido.setMargenGananciaPedido(
            totales.costoTotal() > 0
                ? BigDecimal.valueOf(utilidad * 100.0 / totales.costoTotal()).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
    }

    private void marcarPagado(PosQrSesion sesion, Pedido saved) {
        sesion.setEstado("PAGADO");
        sesion.setPedidoId(saved.getId());
        posQrRepo.save(sesion);
    }

    private void actualizarTurno(PosQrSesion sesion, String metodoPago, int totalPedido) {
        if (sesion.getTurno() == null) return;
        try {
            turnoCajaService.actualizarTotales(sesion.getTurno().getId(), metodoPago, totalPedido);
        } catch (Exception e) {
            log.warn("[POS-QR] No se pudo actualizar turno: {}", e.getMessage());
        }
    }

    private record TotalesQr(int subtotal, int costoTotal) {
        int totalPedido() { return subtotal; }
    }
}
