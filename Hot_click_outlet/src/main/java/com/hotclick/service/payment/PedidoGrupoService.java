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
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

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

    /**
     * fix2 (locks entre procesos): bloquea los pedidos del grupo con {@code FOR UPDATE ORDER BY id} (sin grupo, solo el
     * pedido por id) y los relee bajo el lock. Para quien YA tiene el Pago bloqueado y va a liberar reservas del grupo:
     * orden Pago → Pedidos → Productos. Fail-closed: si el pedido base no aparece en el resultado, aborta. Los cambios
     * pendientes de la sesión se escriben antes de releer (el refresh los descartaría). Sin EntityManager (solo
     * construcción manual en pruebas) no hay sesión que releer.
     */
    public List<Pedido> bloquearGrupo(Pedido base) {
        if (base == null) return List.of();
        if (entityManager != null) entityManager.flush();
        String grupo = base.getGrupoPago();
        List<Pedido> bloqueados = (grupo == null || grupo.isBlank())
            ? pedidoRepository.findByIdForUpdate(base.getId()).map(List::of).orElse(List.of())
            : pedidoRepository.findByGrupoPagoForUpdateOrderById(grupo);
        if (bloqueados.stream().noneMatch(p -> java.util.Objects.equals(p.getId(), base.getId()))) {
            throw new IllegalStateException("Pedido " + base.getId() + " ausente al bloquear su grupo");
        }
        if (entityManager != null) {
            for (Pedido p : bloqueados) entityManager.refresh(p);
        }
        return bloqueados;
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
