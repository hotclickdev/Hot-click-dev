package com.hotclick.agente.enlace;

import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Operaciones en memoria sobre los ítems del enlace (sin acceso a BD). Los servicios cargan y guardan en lote; los
 * bucles viven aquí para que cada consulta sea una sola por conjunto de productos (sin N+1).
 */
final class EnlaceItems {

    private EnlaceItems() { }

    /** Ids de producto del enlace, ordenados y sin repetir (orden de locks igual al del checkout). */
    static List<Long> idsProducto(EnlaceCompra e) {
        List<Long> ids = new ArrayList<>();
        for (EnlaceCompraItem i : e.getItems()) {
            if (!ids.contains(i.getProductoId())) ids.add(i.getProductoId());
        }
        ids.sort(null);
        return ids;
    }

    static Map<Long, Producto> porId(List<Producto> productos) {
        Map<Long, Producto> mapa = new HashMap<>();
        for (Producto p : productos) mapa.put(p.getId(), p);
        return mapa;
    }

    static boolean tieneReserva(EnlaceCompra e) {
        for (EnlaceCompraItem i : e.getItems()) {
            if (i.getCantidadReservada() > 0) return true;
        }
        return false;
    }

    /**
     * Devuelve al stock lo que el enlace tenía reservado (solo en memoria) y limpia la marca. Idempotente.
     * @return los productos modificados, para guardarlos de una vez.
     */
    static List<Producto> devolverReserva(EnlaceCompra e, Map<Long, Producto> bloqueados) {
        List<Producto> tocados = new ArrayList<>();
        for (EnlaceCompraItem i : e.getItems()) {
            if (i.getCantidadReservada() <= 0) continue;
            Producto p = bloqueados.get(i.getProductoId());
            if (p != null) {
                p.setStockReservado(Math.max(0, p.getStockReservado() - i.getCantidadReservada()));
                tocados.add(p);
            }
            i.setCantidadReservada(0);
        }
        e.setReservaHasta(null);
        return tocados;
    }

    /** Marca la atribución «venta del bot» en los pedidos del grupo y ata el principal al enlace. */
    static void atribuir(EnlaceCompra e, List<Pedido> pedidos) {
        for (Pedido p : pedidos) {
            p.setOrigenCanal(e.getCanal());
            p.setEnlaceCompraId(e.getId());
        }
        e.setPedidoId(pedidos.get(0).getId());
    }

    static void paraCada(List<EnlaceCompra> enlaces, java.util.function.Consumer<EnlaceCompra> accion) {
        for (EnlaceCompra e : enlaces) accion.accept(e);
    }

    /** Cambia el estado de cada enlace salvo los ya PAGADO (terminal); devuelve los que cambiaron. */
    static List<EnlaceCompra> cambiarEstado(List<EnlaceCompra> enlaces, EnlaceCompraEstado nuevo) {
        List<EnlaceCompra> cambiados = new ArrayList<>();
        for (EnlaceCompra e : enlaces) {
            if (e.getEstado() == EnlaceCompraEstado.PAGADO) continue;
            e.setEstado(nuevo);
            cambiados.add(e);
        }
        return cambiados;
    }
}
