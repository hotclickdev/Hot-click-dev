package com.hotclick.agente.enlace;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        List<Long> ordenados = ids.stream().distinct().sorted().toList();
        Map<Long, Producto> mapa = new HashMap<>();
        if (ordenados.isEmpty()) return mapa;
        for (Producto p : productoRepository.findAllByIdsForUpdate(ordenados)) mapa.put(p.getId(), p);
        return mapa;
    }

    void guardarProductos(Collection<Producto> productos) {
        productoRepository.saveAll(productos);
    }

    Map<Long, Producto> bloquear(EnlaceCompra e) {
        return bloquear(e.getItems().stream().map(EnlaceCompraItem::getProductoId).toList());
    }

    /** Devuelve al stock lo que el enlace tenía reservado. Idempotente. Con los productos ya bloqueados. */
    void liberar(EnlaceCompra e, Map<Long, Producto> bloqueados) {
        for (EnlaceCompraItem i : e.getItems()) {
            if (i.getCantidadReservada() <= 0) continue;
            Producto p = bloqueados.get(i.getProductoId());
            if (p != null) {
                p.setStockReservado(Math.max(0, p.getStockReservado() - i.getCantidadReservada()));
                productoRepository.save(p);
            }
            i.setCantidadReservada(0);
        }
        e.setReservaHasta(null);
    }

    /** Libera la reserva del enlace (el caller ya tiene la transacción y el lock del enlace). */
    void liberar(EnlaceCompra e) {
        if (e.getItems().stream().noneMatch(i -> i.getCantidadReservada() > 0)) {
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
        if ((reservaVencida || terminal || vencer) && e.getItems().stream().anyMatch(i -> i.getCantidadReservada() > 0)) {
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
