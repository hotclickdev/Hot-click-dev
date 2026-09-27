package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;

import java.util.List;
import java.util.Optional;

/**
 * Navega entre un pedido, los demás paquetes de su compra y el pago único.
 * Los pedidos previos a V142 (sin compra) se tratan como compra de un paquete.
 */
public final class CompraPaquetes {

    private CompraPaquetes() {}

    public static List<Pedido> paquetesDe(Pedido pedido, PedidoRepository pedidoRepository) {
        Long compraId = pedido.getCompraId();
        if (compraId == null) return List.of(pedido);
        List<Pedido> paquetes = pedidoRepository.findByCompra_IdOrderByNumeroPaqueteAsc(compraId);
        return paquetes == null || paquetes.isEmpty() ? List.of(pedido) : paquetes;
    }

    public static Optional<Pago> pagoDe(Pedido pedido, PagoRepository pagoRepository) {
        Optional<Pago> directo = pagoRepository.findTopByPedidoId(pedido.getId());
        if (directo.isPresent() || pedido.getCompraId() == null) return directo;
        return pagoRepository.findFirstByCompra_IdOrderByFechaCreacionDesc(pedido.getCompraId());
    }
}
