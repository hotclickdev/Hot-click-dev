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
    @Autowired(required = false) private com.hotclick.repository.ClienteEmpresaRepository clienteEmpresaRepository;

    /** Ficha del negocio para un cliente compartido (vacía si aún no hay fila). */
    private com.hotclick.model.ClienteEmpresa fichaNegocio(Usuario usuario, Long empresaId) {
        if (clienteEmpresaRepository == null || empresaId == null) return new com.hotclick.model.ClienteEmpresa();
        return clienteEmpresaRepository.findByEmpresaIdAndUsuarioId(empresaId, usuario.getId())
            .orElseGet(com.hotclick.model.ClienteEmpresa::new);
    }

    /** P8-01 residual: en ficha compartida el contacto va enmascarado ("j***@gmail.com"). */
    public static String enmascararCorreo(String correo) {
        return com.hotclick.utils.CorreoEnmascarado.enmascarar(correo);
    }

    /** "****5678": deja los últimos 4 dígitos. */
    public static String enmascararTelefono(String telefono) {
        if (telefono == null || telefono.isBlank()) return "";
        String d = telefono.replaceAll("[^0-9]", "");
        return d.length() <= 4 ? "****" : "****" + d.substring(d.length() - 4);
    }

    public Map<String, Object> toClienteMap(Usuario usuario) {
        return toClienteMap(usuario, null);
    }

    /** P8-01: el cliente es "propio" si se registró en ese negocio (o mira el ADMIN, empresaId null). */
    public static boolean esClientePropio(Usuario usuario, Long empresaId) {
        return empresaId == null || (usuario.getEmpresaRegistro() != null
            && empresaId.equals(usuario.getEmpresaRegistro().getId()));
    }

    /**
     * P8-01: con empresaId de un vendedor, las estadísticas cuentan solo sus pedidos y los campos
     * globales del usuario (notas, crédito, puntos, segmento manual) se ocultan si el cliente lo
     * registró otro negocio.
     */
    public Map<String, Object> toClienteMap(Usuario usuario, Long empresaId) {
        boolean propio = esClientePropio(usuario, empresaId);
        com.hotclick.model.ClienteEmpresa ficha = propio ? null : fichaNegocio(usuario, empresaId);
        Map<String, Object> cliente = new LinkedHashMap<>();
        cliente.put("id", usuario.getId());
        cliente.put("nombre", usuario.getNombre());
        cliente.put("apellidoPaterno", usuario.getApellidoPaterno());
        cliente.put("correo", propio ? usuario.getCorreo() : enmascararCorreo(usuario.getCorreo()));
        cliente.put("telefono", propio ? usuario.getTelefono() : enmascararTelefono(usuario.getTelefono()));
        cliente.put("fechaRegistro", usuario.getFechaRegistro());
        cliente.put("fechaUltimoAcceso", usuario.getFechaUltimoAcceso());
        cliente.put("puntosFidelidad", propio ? usuario.getPuntosFidelidad() : ficha.getPuntosFidelidad());
        cliente.put("limiteCredito", propio ? usuario.getLimiteCredito() : null);
        cliente.put("saldoCredito", propio ? usuario.getSaldoCredito() : null);
        cliente.put("notasInternas", propio ? usuario.getNotasInternas() : ficha.getNotasInternas());
        cliente.put("compartido", !propio);

        int numPedidos = empresaId == null ? usuario.getNumPedidosHist() : 0; // tenant-global-ok: null solo ADMIN (requireEmpresaIdOrAdmin en CrmController)
        int totalCompras = empresaId == null ? usuario.getTotalComprasHist() : 0; // tenant-global-ok: null solo ADMIN (requireEmpresaIdOrAdmin en CrmController)
        if (numPedidos == 0) {
            List<Object[]> stats = empresaId == null // tenant-global-ok: null solo ADMIN (requireEmpresaIdOrAdmin en CrmController)
                ? pedidoRepository.statsPorUsuario(usuario.getId())
                : pedidoRepository.statsPorUsuarioYEmpresa(usuario.getId(), empresaId);
            if (!stats.isEmpty()) {
                Object[] row = stats.get(0);
                numPedidos = row[0] != null ? ((Number) row[0]).intValue() : 0;
                totalCompras = row[1] != null ? ((Number) row[1]).intValue() : 0;
            }
        }
        cliente.put("numPedidosHist", numPedidos);
        cliente.put("totalComprasHist", totalCompras);

        String segmento = propio ? usuario.getSegmento() : ficha.getSegmento();
        if (segmento == null || segmento.isBlank()) {
            segmento = calcularSegmento(numPedidos, totalCompras, usuario.getFechaUltimoAcceso());
        }
        cliente.put("segmento", segmento);
        return cliente;
    }

    /** P8-01: versión acotada al negocio (oculta puntos y segmento de clientes compartidos). */
    public Map<String, Object> toClienteMapSimple(Usuario usuario, Long empresaId) {
        if (esClientePropio(usuario, empresaId)) return toClienteMapSimple(usuario);
        com.hotclick.model.ClienteEmpresa ficha = fichaNegocio(usuario, empresaId);
        Map<String, Object> m = new LinkedHashMap<>(toClienteMapSimple(usuario));
        m.put("correo", enmascararCorreo(usuario.getCorreo()));
        m.put("telefono", enmascararTelefono(usuario.getTelefono()));
        m.put("puntosFidelidad", ficha.getPuntosFidelidad());
        m.put("segmento", ficha.getSegmento() != null ? ficha.getSegmento() : "NUEVO");
        m.put("compartido", true);
        return m;
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
