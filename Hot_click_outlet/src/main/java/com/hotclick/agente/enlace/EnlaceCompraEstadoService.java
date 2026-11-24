package com.hotclick.agente.enlace;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ganchos para AG-08 (confirmación de pago) y AG-12 (recordatorios). Esta historia solo los deja listos y probados;
 * quien confirma el pago llama a estos métodos desde su propio flujo.
 */
@Service
public class EnlaceCompraEstadoService {

    private final EnlaceCompraRepository repo;
    private final EnlaceCompraReserva reserva;

    public EnlaceCompraEstadoService(EnlaceCompraRepository repo, EnlaceCompraReserva reserva) {
        this.repo = repo;
        this.reserva = reserva;
    }

    /** El pedido del enlace se pagó. Idempotente. La reserva del pedido la consume el flujo de pago existente. */
    @Transactional
    public void marcarPagadoPorPedido(Long pedidoId) {
        cambiar(pedidoId, EnlaceCompraEstado.PAGADO);
    }

    /** El pago se rechazó: el enlace queda reabrible (RECHAZADO) mientras no venza. */
    @Transactional
    public void marcarRechazadoPorPedido(Long pedidoId) {
        cambiar(pedidoId, EnlaceCompraEstado.RECHAZADO);
    }

    /** AG-12: cuenta un recordatorio enviado; devuelve el total. */
    @Transactional
    public int registrarRecordatorio(Long enlaceId) {
        EnlaceCompra e = repo.findByIdForUpdate(enlaceId).orElse(null);
        if (e == null) return 0;
        e.setRecordatoriosEnviados(e.getRecordatoriosEnviados() + 1);
        repo.save(e);
        return e.getRecordatoriosEnviados();
    }

    private void cambiar(Long pedidoId, EnlaceCompraEstado nuevo) {
        if (pedidoId == null) return;
        for (EnlaceCompra e : repo.findByPedidoIdForUpdate(pedidoId)) {
            if (e.getEstado() == EnlaceCompraEstado.PAGADO) continue; // PAGADO es terminal
            e.setEstado(nuevo);
            reserva.liberar(e); // por si quedó alguna reserva del enlace
            repo.save(e);
        }
    }
}
