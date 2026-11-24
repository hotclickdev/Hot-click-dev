package com.hotclick.agente.pago;

import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraEstado;
import com.hotclick.agente.enlace.EnlaceCompraEstadoService;
import com.hotclick.agente.enlace.EnlaceCompraRepository;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.payment.PedidoGrupoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Parte de base de datos de AG-08, en transacciones PROPIAS (REQUIRES_NEW): el listener corre después del COMMIT del
 * pago, donde una transacción REQUIRED no escribiría. El estado del enlace es la guarda de idempotencia: devuelve
 * contexto solo la primera vez que el pedido cambia el enlace; una notificación repetida devuelve vacío.
 */
@Service
public class PagoBotTransicion {

    private final EnlaceCompraRepository enlaces;
    private final EnlaceCompraEstadoService estado;
    private final PedidoRepository pedidos;
    private final PedidoGrupoService grupos;

    public PagoBotTransicion(EnlaceCompraRepository enlaces, EnlaceCompraEstadoService estado,
                             PedidoRepository pedidos, PedidoGrupoService grupos) {
        this.enlaces = enlaces;
        this.estado = estado;
        this.pedidos = pedidos;
        this.grupos = grupos;
    }

    /** Marca PAGADO. Vacío si el enlace ya estaba PAGADO (duplicado) o no existe. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<ContextoPago> registrarPagado(Long enlaceId, Long pedidoId) {
        EnlaceCompra e = enlaceId == null ? null : enlaces.findByIdForUpdate(enlaceId).orElse(null);
        if (e == null || pedidoId == null || e.getEstado() == EnlaceCompraEstado.PAGADO) return Optional.empty();
        // Si pagó un pedido anterior del enlace (reintento), el enlace pasa a apuntar a ese pedido.
        e.setPedidoId(pedidoId);
        e.setAvisoPendiente(null);
        enlaces.saveAndFlush(e);
        estado.marcarPagadoPorPedido(pedidoId);
        return Optional.of(contexto(e, pedidoId));
    }

    /**
     * Marca RECHAZADO y suma el rechazo. Vacío si el enlace ya pagó, ya venció, el rechazo ya estaba registrado
     * (duplicado) o es de un pedido que ya no es el vigente del enlace.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<ContextoPago> registrarRechazado(Long enlaceId, Long pedidoId) {
        EnlaceCompra e = enlaceId == null ? null : enlaces.findByIdForUpdate(enlaceId).orElse(null);
        if (e == null || pedidoId == null || !pedidoId.equals(e.getPedidoId())) return Optional.empty();
        if (e.getEstado() != EnlaceCompraEstado.CREADO && e.getEstado() != EnlaceCompraEstado.ABIERTO) {
            return Optional.empty();
        }
        e.setRechazosPago(e.getRechazosPago() + 1);
        e.setAvisoPendiente(null);
        enlaces.saveAndFlush(e);
        estado.marcarRechazadoPorPedido(pedidoId);
        return Optional.of(contexto(e, pedidoId));
    }

    /** El cliente estaba fuera de la ventana y no hay plantilla: el aviso queda anotado en el enlace. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void marcarAvisoPendiente(Long enlaceId, String tipo) {
        EnlaceCompra e = enlaceId == null ? null : enlaces.findByIdForUpdate(enlaceId).orElse(null);
        if (e == null) return;
        e.setAvisoPendiente(tipo);
        enlaces.saveAndFlush(e);
    }

    private ContextoPago contexto(EnlaceCompra e, Long pedidoId) {
        Pedido principal = pedidos.findById(pedidoId).orElse(null);
        List<Pedido> grupo = grupos.delGrupo(principal);
        int total = 0;
        LocalDate entrega = null;
        StringBuilder numeros = new StringBuilder();
        for (Pedido p : grupo) {
            total += p.getTotalPedido() == null ? 0 : p.getTotalPedido();
            if (p.getFechaEntregaEstimada() != null
                && (entrega == null || p.getFechaEntregaEstimada().isAfter(entrega))) {
                entrega = p.getFechaEntregaEstimada();
            }
            if (numeros.length() > 0) numeros.append(", ");
            numeros.append(p.getNumeroPedido());
        }
        return new ContextoPago(e.getId(), e.getEmpresaId(), e.getChatSesionId(), e.getCodigo(),
            numeros.toString(), total, entrega, e.getRechazosPago());
    }
}
