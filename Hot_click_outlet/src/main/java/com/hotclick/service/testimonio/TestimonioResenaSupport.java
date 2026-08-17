package com.hotclick.service.testimonio;

import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.TestimonioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class TestimonioResenaSupport {

    public static final int MAX_RESENAS_POR_PRODUCTO = 3;

    @Autowired private TestimonioRepository repo;
    @Autowired private PedidoRepository pedidoRepo;

    /**
     * Productos entregados al usuario con cuántas reseñas ya dejó (máx 3).
     */
    public List<Map<String, Object>> productosParaResenar(Long usuarioId) {
        var pedidos = pedidoRepo.findEntregadosConItemsByUsuarioId(usuarioId);

        Map<Long, Map<String, Object>> vistos = new LinkedHashMap<>();
        for (var pedido : pedidos) {
            if (pedido.getItems() == null) continue;
            for (var item : pedido.getItems()) {
                var p = item.getProducto();
                if (p == null || vistos.containsKey(p.getId())) continue;
                long resenasEnviadas = repo.countByUsuarioIdAndProductoIdAndTipo(usuarioId, p.getId(), "RESENA");
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("productoId", p.getId());
                m.put("nombre", p.getNombreProducto());
                m.put("imagenUrl", p.getImagenPrincipalUrl());
                m.put("pedidoId", pedido.getId());
                m.put("resenasEnviadas", resenasEnviadas);
                m.put("puedeResenar", resenasEnviadas < MAX_RESENAS_POR_PRODUCTO);
                vistos.put(p.getId(), m);
            }
        }
        return new ArrayList<>(vistos.values());
    }
}
