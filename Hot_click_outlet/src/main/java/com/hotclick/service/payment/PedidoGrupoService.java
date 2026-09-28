package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Un checkout multivendedor crea un subpedido por bodega bajo un único Pago asociado al primero.
 * Todo lo que parte de un pago (confirmar, fallar, expirar, cancelar) debe actuar sobre el grupo entero.
 */
@Service
public class PedidoGrupoService {

    private final PedidoRepository pedidoRepository;
    private final PagoRepository pagoRepository;

    public PedidoGrupoService(PedidoRepository pedidoRepository, PagoRepository pagoRepository) {
        this.pedidoRepository = pedidoRepository;
        this.pagoRepository = pagoRepository;
    }

    /** Subpedidos del mismo pago, incluido el recibido. Pedidos anteriores al cambio no tienen grupo. */
    public List<Pedido> delGrupo(Pedido pedido) {
        if (pedido == null) return List.of();
        String grupo = pedido.getGrupoPago();
        if (grupo == null || grupo.isBlank()) return List.of(pedido);
        List<Pedido> grupoPedidos = pedidoRepository.findByGrupoPagoOrderByIdAsc(grupo);
        return grupoPedidos.isEmpty() ? List.of(pedido) : grupoPedidos;
    }

    /** El Pago vive en el subpedido principal; desde cualquier subpedido se llega a él. */
    public Optional<Pago> pagoDelGrupo(Pedido pedido) {
        Optional<Pago> directo = pagoRepository.findTopByPedidoId(pedido.getId());
        if (directo.isPresent()) return directo;
        for (Pedido p : delGrupo(pedido)) {
            if (p.getId() != null && !p.getId().equals(pedido.getId())) {
                Optional<Pago> pago = pagoRepository.findTopByPedidoId(p.getId());
                if (pago.isPresent()) return pago;
            }
        }
        return Optional.empty();
    }
}
