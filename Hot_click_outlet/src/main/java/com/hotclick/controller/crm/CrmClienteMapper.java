package com.hotclick.controller.crm;

import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class CrmClienteMapper {

    @Autowired private PedidoRepository pedidoRepository;

    public Map<String, Object> toClienteMap(Usuario usuario) {
        Map<String, Object> cliente = new LinkedHashMap<>();
        cliente.put("id", usuario.getId());
        cliente.put("nombre", usuario.getNombre());
        cliente.put("apellidoPaterno", usuario.getApellidoPaterno());
        cliente.put("correo", usuario.getCorreo());
        cliente.put("telefono", usuario.getTelefono());
        cliente.put("fechaRegistro", usuario.getFechaRegistro());
        cliente.put("fechaUltimoAcceso", usuario.getFechaUltimoAcceso());
        cliente.put("puntosFidelidad", usuario.getPuntosFidelidad());
        cliente.put("limiteCredito", usuario.getLimiteCredito());
        cliente.put("saldoCredito", usuario.getSaldoCredito());
        cliente.put("notasInternas", usuario.getNotasInternas());

        int numPedidos = usuario.getNumPedidosHist();
        int totalCompras = usuario.getTotalComprasHist();
        if (numPedidos == 0) {
            List<Object[]> stats = pedidoRepository.statsPorUsuario(usuario.getId());
            if (!stats.isEmpty()) {
                Object[] row = stats.get(0);
                numPedidos = row[0] != null ? ((Number) row[0]).intValue() : 0;
                totalCompras = row[1] != null ? ((Number) row[1]).intValue() : 0;
            }
        }
        cliente.put("numPedidosHist", numPedidos);
        cliente.put("totalComprasHist", totalCompras);

        String segmento = usuario.getSegmento();
        if (segmento == null || segmento.isBlank()) {
            segmento = calcularSegmento(numPedidos, totalCompras, usuario.getFechaUltimoAcceso());
        }
        cliente.put("segmento", segmento);
        return cliente;
    }

    public Map<String, Object> toClienteMapSimple(Usuario usuario) {
        return Map.of(
            "id", usuario.getId(),
            "nombre", usuario.getNombre() != null ? usuario.getNombre() : "",
            "apellidoPaterno", usuario.getApellidoPaterno() != null ? usuario.getApellidoPaterno() : "",
            "correo", usuario.getCorreo() != null ? usuario.getCorreo() : "",
            "telefono", usuario.getTelefono() != null ? usuario.getTelefono() : "",
            "puntosFidelidad", usuario.getPuntosFidelidad(),
            "segmento", usuario.getSegmento() != null ? usuario.getSegmento() : "NUEVO"
        );
    }

    public String calcularSegmento(int numPedidos, int totalCompras, LocalDateTime ultimoAcceso) {
        if (numPedidos == 0) return "NUEVO";
        boolean inactivo = ultimoAcceso != null
            && ultimoAcceso.isBefore(LocalDateTime.now(Constants.ZONA_CR).minusDays(90));
        if (inactivo && numPedidos < 5) return "INACTIVO";
        if (numPedidos >= 10 || totalCompras >= 500_000) return "VIP";
        if (numPedidos >= 2) return "FRECUENTE";
        return "NUEVO";
    }
}
