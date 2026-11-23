package com.hotclick.service.retiro;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.PedidoRetiroToken;
import com.hotclick.utils.Constants;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Armado en memoria para el retiro por QR. Sin acceso a base de datos: los bucles viven acá, no junto a los repositorios. */
final class RetiroTokenMapeos {

    private RetiroTokenMapeos() {}

    static List<Long> ids(List<Pedido> pedidos) {
        List<Long> out = new ArrayList<>();
        for (Pedido p : pedidos) out.add(p.getId());
        return out;
    }

    /** Un token nuevo por cada pedido que todavía no tiene uno. */
    static List<PedidoRetiroToken> faltantes(List<Pedido> pedidos, List<PedidoRetiroToken> existentes,
                                             LocalDateTime ahora, int horasVigencia) {
        Set<Long> con = new HashSet<>();
        for (PedidoRetiroToken t : existentes) con.add(t.getPedidoId());
        List<PedidoRetiroToken> nuevos = new ArrayList<>();
        for (Pedido p : pedidos) {
            if (!con.contains(p.getId())) nuevos.add(nuevo(p, ahora, horasVigencia));
        }
        return nuevos;
    }

    static PedidoRetiroToken nuevo(Pedido pedido, LocalDateTime ahora, int horasVigencia) {
        PedidoRetiroToken t = new PedidoRetiroToken();
        t.setToken(PedidoRetiroTokenService.nuevoToken());
        t.setPedidoId(pedido.getId());
        t.setEmpresaId(pedido.getEmpresaId());
        t.setEstado(PedidoRetiroToken.PENDIENTE);
        t.setFechaCreacion(ahora);
        t.setExpira(ahora.plusHours(Math.max(1, horasVigencia)));
        return t;
    }

    /** Ítems activos con su producto ya cargado → líneas del canje. */
    static List<PedidoRetiroTokenService.Canje.Linea> lineas(List<PedidoItem> items) {
        List<PedidoRetiroTokenService.Canje.Linea> out = new ArrayList<>();
        for (PedidoItem i : items) {
            if (i.getEstado() != null && i.getEstado() != Constants.ESTADO_ACTIVO) continue;
            String nombre = i.getProducto() != null ? i.getProducto().getNombreProducto() : "Producto";
            out.add(new PedidoRetiroTokenService.Canje.Linea(nombre, i.getCantidad() != null ? i.getCantidad() : 0));
        }
        return out;
    }
}
