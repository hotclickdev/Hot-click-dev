package com.hotclick.service;

import com.hotclick.dto.DespachoPaqueteDTO;
import com.hotclick.dto.DespachoPaqueteDTO.ClienteEnvio;
import com.hotclick.dto.DespachoPaqueteDTO.Linea;
import com.hotclick.dto.DespachoPaqueteDTO.Pago;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Compra;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.AggregatorService.DetalleComision;
import com.hotclick.service.AggregatorService.Liquidacion;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Arma la vista «Despachar paquete» del vendedor (Figma `37:1780`). El tenant se valida en el controller. */
@Service
public class DespachoPaqueteService {

    private static final String SEPARADOR_NOTAS = "\\s*\\|\\s*";

    private final PedidoRepository pedidoRepository;
    private final AggregatorService aggregatorService;

    public DespachoPaqueteService(PedidoRepository pedidoRepository, AggregatorService aggregatorService) {
        this.pedidoRepository = pedidoRepository;
        this.aggregatorService = aggregatorService;
    }

    @Transactional(readOnly = true)
    public DespachoPaqueteDTO armar(Long pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        Compra compra = pedido.getCompra();
        List<Pedido> hermanos = compra != null
            ? pedidoRepository.findByCompra_IdOrderByNumeroPaqueteAsc(compra.getId())
            : List.of(pedido);
        return new DespachoPaqueteDTO(
            pedido.getId(),
            compra != null ? compra.getNumeroCompra() : pedido.getNumeroPedido(),
            pedido.getNumeroPaquete() != null ? pedido.getNumeroPaquete() : 1,
            Math.max(hermanos.size(), 1),
            nombreNegocio(pedido.getEmpresa()),
            otrosNegocios(pedido, hermanos),
            pedido.getEstadoPedido(),
            pedido.getMetodoEnvio(),
            pedido.getNumeroGuia(),
            cliente(pedido),
            pedido.getItems().stream().map(DespachoPaqueteService::linea).toList(),
            pago(pedido));
    }

    private Pago pago(Pedido pedido) {
        long bruto = valor(pedido.getTotalPedido());
        long envio = valor(pedido.getCostoEnvio());
        if (pedido.getEmpresaId() == null || bruto <= 0) {
            return new Pago(bruto - envio, envio, 0, null, 0, null, 0);
        }
        Liquidacion liquidacion = aggregatorService.liquidar(pedido.getEmpresaId(), bruto, envio);
        DetalleComision detalle = liquidacion.detalle();
        return new Pago(bruto - liquidacion.envio(), liquidacion.envio(), detalle.resultado().totalComision(),
            detalle.porcentaje(), detalle.minimo(), detalle.plan(), liquidacion.neto());
    }

    private static List<String> otrosNegocios(Pedido pedido, List<Pedido> hermanos) {
        return hermanos.stream()
            .filter(h -> !Objects.equals(h.getId(), pedido.getId()))
            .map(h -> nombreNegocio(h.getEmpresa()))
            .toList();
    }

    private static ClienteEnvio cliente(Pedido pedido) {
        Map<String, String> notas = leerNotas(pedido.getNotas());
        Usuario usuario = pedido.getUsuarioFinal();
        String nombre = notas.getOrDefault("Nombre", usuario != null ? usuario.getNombre() : null);
        String telefono = notas.getOrDefault("Teléfono", usuario != null ? usuario.getTelefono() : null);
        return new ClienteEnvio(nombre, telefono, notas.get("Dirección"));
    }

    /** El checkout guarda «Nombre: … | Teléfono: … | Dirección: …» en las notas del pedido. */
    static Map<String, String> leerNotas(String notas) {
        Map<String, String> campos = new HashMap<>();
        if (notas == null || notas.isBlank()) return campos;
        for (String parte : notas.split(SEPARADOR_NOTAS)) {
            int dosPuntos = parte.indexOf(':');
            if (dosPuntos <= 0) continue;
            String valor = parte.substring(dosPuntos + 1).trim();
            if (!valor.isEmpty()) campos.put(parte.substring(0, dosPuntos).trim(), valor);
        }
        return campos;
    }

    private static Linea linea(PedidoItem item) {
        Producto producto = item.getProducto();
        return new Linea(
            producto != null ? producto.getNombreProducto() : "Producto",
            item.getCantidad() != null ? item.getCantidad() : 1,
            item.getSubtotalItem() != null ? item.getSubtotalItem() : 0,
            producto != null ? producto.getImagenPrincipalUrl() : null);
    }

    private static String nombreNegocio(Empresa empresa) {
        if (empresa == null) return "HotClick";
        String comercial = empresa.getNombreComercial();
        return comercial != null && !comercial.isBlank() ? comercial : empresa.getNombreEmpresa();
    }

    private static long valor(Integer monto) {
        return monto != null ? monto : 0L;
    }
}
