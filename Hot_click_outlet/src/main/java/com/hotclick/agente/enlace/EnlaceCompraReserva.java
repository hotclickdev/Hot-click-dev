package com.hotclick.agente.enlace;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/**
 * AG-09: la reserva de stock del enlace es la misma que usa el checkout (suma a {@code producto.stock_reservado}),
 * pero se anota por ítem ({@code cantidad_reservada}) para poder devolverla exactamente. Al crear el pedido, el
 * checkout reserva por su cuenta y esta reserva se libera antes ({@link EnlaceCompraVinculo}); al pagar, el pedido
 * consume la suya. Orden de locks: enlace y luego productos por id ascendente.
 */
@Service
public class EnlaceCompraReserva {

    private final ProductoRepository productoRepository;
    private final EnlaceCompraRepository repo;

    public EnlaceCompraReserva(ProductoRepository productoRepository, EnlaceCompraRepository repo) {
        this.productoRepository = productoRepository;
        this.repo = repo;
    }

    /** Un solo SELECT … FOR UPDATE con ids únicos y ordenados (mismo orden que el checkout: sin deadlock). */
    Map<Long, Producto> bloquear(Collection<Long> ids) {
        List<Long> ordenados = new ArrayList<>(new TreeSet<>(ids));
        if (ordenados.isEmpty()) return new HashMap<>();
        return EnlaceItems.porId(productoRepository.findAllByIdsForUpdate(ordenados));
    }

    void guardarProductos(Collection<Producto> productos) {
        productoRepository.saveAll(productos);
    }

    Map<Long, Producto> bloquear(EnlaceCompra e) {
        return bloquear(EnlaceItems.idsProducto(e));
    }

    /** Devuelve al stock lo que el enlace tenía reservado. Idempotente. Con los productos ya bloqueados. */
    void liberar(EnlaceCompra e, Map<Long, Producto> bloqueados) {
        productoRepository.saveAll(EnlaceItems.devolverReserva(e, bloqueados));
    }

    /** Libera la reserva del enlace (el caller ya tiene la transacción y el lock del enlace). */
    void liberar(EnlaceCompra e) {
        if (!EnlaceItems.tieneReserva(e)) {
            e.setReservaHasta(null);
            return;
        }
        liberar(e, bloquear(e));
    }

    /**
     * Barrido del scheduler, una transacción por enlace. Libera la reserva y, si {@code vencer}, marca VENCIDO
     * (solo si sigue sin pedido y en CREADO/ABIERTO: otro hilo pudo haberlo cambiado).
     */
    @Transactional
    public boolean liberarYVencer(Long id, boolean vencer, LocalDateTime ahora) {
        EnlaceCompra e = repo.findByIdForUpdate(id).orElse(null);
        if (e == null) return false;
        boolean cambio = false;
        boolean reservaVencida = e.getReservaHasta() == null || !e.getReservaHasta().isAfter(ahora);
        boolean terminal = !(e.getEstado() == EnlaceCompraEstado.CREADO || e.getEstado() == EnlaceCompraEstado.ABIERTO
            || e.getEstado() == EnlaceCompraEstado.RECHAZADO);
        if ((reservaVencida || terminal || vencer) && EnlaceItems.tieneReserva(e)) {
            liberar(e);
            cambio = true;
        }
        if (vencer && e.getPedidoId() == null
            && (e.getEstado() == EnlaceCompraEstado.CREADO || e.getEstado() == EnlaceCompraEstado.ABIERTO)
            && !e.getVence().isAfter(ahora)) {
            e.setEstado(EnlaceCompraEstado.VENCIDO);
            cambio = true;
        }
        if (cambio) repo.save(e);
        return cambio;
    }
}
