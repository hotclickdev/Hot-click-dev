package com.hotclick.service.pos;

import com.fasterxml.jackson.core.type.TypeReference;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
            List<Map<String, Object>> items = sessionService.getMapper().readValue(
                sesion.getItemsJson(), new TypeReference<>() {});

            Empresa empresa  = sesion.getEmpresa();
            Long empresaId   = empresa.getId();
            String correo    = sesion.getUsuario().getCorreo();

            Usuario cliente  = usuarioRepo.findById(999L)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario mostrador no encontrado"));
            Bodega bodega    = bodegaRepo.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO).stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No hay bodega configurada"));

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

            int subtotal = 0;
            int costoTotal = 0;
            List<PedidoItem> pedidoItems = new ArrayList<>();

            for (Map<String, Object> itemMap : items) {
                Long productoId = ((Number) itemMap.get("productoId")).longValue();
                int cantidad    = ((Number) itemMap.getOrDefault("cantidad", 1)).intValue();
                int precio      = ((Number) itemMap.getOrDefault("precioUnitario", 0)).intValue();

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
                pedidoItems.add(pi);

                subtotal   += precio * cantidad;
                costoTotal += producto.getPrecioCompra() * cantidad;
            }

            int totalPedido   = subtotal;
            int utilidad      = totalPedido - costoTotal;
            pedido.setItems(pedidoItems);
            pedido.setSubtotal(subtotal);
            pedido.setTotalPedido(totalPedido);
            pedido.setCostoTotalProductos(costoTotal);
            pedido.setUtilidadBruta(utilidad);
            pedido.setMargenGananciaPedido(
                costoTotal > 0
                    ? java.math.BigDecimal.valueOf(utilidad * 100.0 / costoTotal)
                        .setScale(2, java.math.RoundingMode.HALF_UP)
                    : java.math.BigDecimal.ZERO);

            Pedido saved = pedidoRepo.save(pedido);

            sesion.setEstado("PAGADO");
            sesion.setPedidoId(saved.getId());
            posQrRepo.save(sesion);

            if (sesion.getTurno() != null) {
                try {
                    turnoCajaService.actualizarTotales(
                        sesion.getTurno().getId(), metodoPago, totalPedido);
                } catch (Exception e) {
                    log.warn("[POS-QR] No se pudo actualizar turno: {}", e.getMessage());
                }
            }

            log.info("[POS-QR] Venta {} registrada — método={} total={}", saved.getNumeroPedido(), metodoPago, totalPedido);

            telegramNotificacionClienteService.notificarVenta(empresaId, saved.getNumeroPedido(),
                totalPedido, metodoPago, null, "POS");

        } catch (RuntimeException e) {
            log.error("[POS-QR] Error creando pedido POS: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("[POS-QR] Error creando pedido POS: {}", e.getMessage(), e);
            throw new IllegalStateException("Error al registrar la venta: " + e.getMessage(), e);
        }
    }
}
