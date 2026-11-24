package com.hotclick.agente.enlace;

import com.hotclick.model.Producto;
import com.hotclick.service.payment.OrderPricingService;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * AG-07 / AG-09: abre el enlace. Recalcula el precio actual, detecta cambios de precio y stock, marca ABIERTO y
 * reserva el stock {@code reserva-minutos} (30 por defecto). Abrir de nuevo renueva la reserva (no la duplica).
 * Código inexistente, mal formado, vencido o ya pagado/cancelado: {@link Optional#empty()} sin distinguir (→ 404).
 */
@Service
public class EnlaceCompraAperturaService {

    private static final Logger log = LoggerFactory.getLogger(EnlaceCompraAperturaService.class);

    private final EnlaceCompraRepository repo;
    private final EnlaceCompraReserva reserva;
    private final int reservaMinutos;
    Supplier<LocalDateTime> reloj = () -> LocalDateTime.now(Constants.ZONA_CR);

    public EnlaceCompraAperturaService(EnlaceCompraRepository repo, EnlaceCompraReserva reserva,
                                       @Value("${hotclick.agente.enlace.reserva-minutos:30}") int reservaMinutos) {
        this.repo = repo;
        this.reserva = reserva;
        this.reservaMinutos = reservaMinutos;
    }

    @Transactional
    public Optional<EnlaceAbiertoDto> abrir(String codigo) {
        if (!CodigoEnlace.formatoValido(codigo)) return Optional.empty();
        EnlaceCompra e = repo.findByCodigoForUpdate(codigo).orElse(null);
        LocalDateTime ahora = reloj.get();
        if (e == null || !e.estaVigente(ahora)) {
            log.info("[enlace] código no disponible {}", CodigoEnlace.paraLog(codigo));
            return Optional.empty();
        }

        Map<Long, Producto> productos = reserva.bloquear(e);
        // Reabrir renueva: primero se devuelve lo reservado antes y luego se reserva con el stock de ahora.
        reserva.liberar(e, productos);

        List<EnlaceAbiertoDto.Item> items = new ArrayList<>();
        int totalActual = 0;
        boolean precioCambio = false;
        boolean stockCambio = false;
        boolean algunaReserva = false;

        for (EnlaceCompraItem i : e.getItems()) {
            Producto p = productos.get(i.getProductoId());
            boolean comprable = p != null && StockReservationService.esPublicableEnMemoria(p) && p.getEmpresa() != null
                && !Boolean.TRUE.equals(p.getVendido()) && !p.esACotizar() && OrderPricingService.precioEfectivo(p) != null
                && (e.getEmpresaId() == null || e.getEmpresaId().equals(p.getEmpresa().getId()));
            if (!comprable) {
                stockCambio = true;
                items.add(new EnlaceAbiertoDto.Item(i.getProductoId(), p != null ? p.getNombreProducto() : "Producto",
                    p != null ? p.getImagenPrincipalUrl() : null, 0, i.getCantidad(), 0, i.getPrecioUnitarioCreado(), false));
                continue;
            }
            int precio = OrderPricingService.precioEfectivo(p);
            boolean personalizado = Boolean.TRUE.equals(p.getEsPersonalizado());
            // «Bajo pedido»: se vende sin stock, no se reserva nada (igual que el checkout, M-08).
            int cantidad = personalizado ? i.getCantidad() : Math.min(i.getCantidad(), Math.max(0, p.getStockDisponible()));
            if (cantidad < i.getCantidad()) stockCambio = true;
            if (precio != i.getPrecioUnitarioCreado()) precioCambio = true;
            if (!personalizado && cantidad > 0) {
                p.setStockReservado(p.getStockReservado() + cantidad);
                i.setCantidadReservada(cantidad);
                algunaReserva = true;
            }
            totalActual += precio * cantidad;
            items.add(new EnlaceAbiertoDto.Item(p.getId(), p.getNombreProducto(), p.getImagenPrincipalUrl(), cantidad,
                i.getCantidad(), precio, i.getPrecioUnitarioCreado(), cantidad > 0));
        }

        if (algunaReserva) {
            e.setReservaHasta(ahora.plusMinutes(reservaMinutos));
            reserva.guardarProductos(productos.values());
        }
        if (e.getAbierto() == null || e.getEstado() == EnlaceCompraEstado.RECHAZADO) e.setAbierto(ahora);
        e.setEstado(EnlaceCompraEstado.ABIERTO);
        repo.save(e);

        return Optional.of(new EnlaceAbiertoDto(e.getVence(), e.getReservaHasta(), e.getNombreCliente(),
            mascara(e), precioCambio, stockCambio, e.getPrecioTotalCreado(), totalActual, items));
    }

    /** Solo WhatsApp (el contacto es un número). Deja los últimos 4 dígitos: «****5678». */
    static String mascara(EnlaceCompra e) {
        if (!"WHATSAPP".equals(e.getCanal()) || e.getContactoExterno() == null) return null;
        String d = e.getContactoExterno().replaceAll("\\D", "");
        if (d.length() < 8) return null;
        return "****" + d.substring(d.length() - 4);
    }
}
