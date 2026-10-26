package com.hotclick.service.pedido;

import com.hotclick.model.OrigenPedido;
import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class PedidoManualFactory {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private N8nWebhookService n8nWebhookService;
    @Autowired private PedidoPagoManualService pedidoPagoManualService;

    /** P7-02: estados con los que un pedido manual de /api/pedidos/manual puede nacer (los de la UI). */
    public static final java.util.Set<String> ESTADOS_INICIALES = java.util.Set.of(
        Constants.PEDIDO_PENDIENTE, Constants.PEDIDO_PAGADO, "EN_PREPARACION");
    static final String METODO_COMPRA_EXTERNA = "EXTERNO";
    static final String MSG_CLIENTE = "Cliente no encontrado. Búscalo en tus clientes o créalo primero.";

    public Pedido crearPedidoManual(ManualPedidoDTO dto, Empresa empresa) {
        Long empresaId = empresa != null ? empresa.getId() : null; // null solo ADMIN de plataforma
        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
            .orElseThrow(() -> new RecursoNoEncontradoException(MSG_CLIENTE));
        if (empresaId != null && !usuarioRepository.esClienteDeEmpresa(usuario.getId(), empresaId)) {
            // P7-02: mismo mensaje que si no existiera, para no enumerar usuarios de otros negocios.
            throw new RecursoNoEncontradoException(MSG_CLIENTE);
        }

        Bodega bodega = resolverBodega(dto.getBodegaId(), empresaId);
        String metodoPago = dto.getMetodoPago() != null ? dto.getMetodoPago() : "SINPE";
        String estadoInicial = estadoInicialPermitido(dto.getEstadoPedido(), metodoPago, dto.getOrigen());

        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setMetodoEnvio(dto.getMetodoEnvio() != null ? dto.getMetodoEnvio() : Constants.ENVIO_RETIRO);
        pedido.setMetodoPago(metodoPago);
        pedido.setCostoEnvio(dto.getCostoEnvio() != null ? dto.getCostoEnvio() : 0);
        pedido.setEstadoPedido(estadoInicial);
        pedido.setNotas(dto.getNotas());
        OrigenPedido origen = OrigenPedido.normalizar(dto.getOrigen());
        if (origen != null) pedido.setOrigen(origen.codigo());
        pedido.setDescuentoTotal(0);
        pedido.setAplicaImpuesto(false);
        pedido.setMontoImpuesto(0);
        pedido.setEstado(Constants.ESTADO_ACTIVO);

        int subtotal = 0;
        int costoTotalProductos = 0;
        List<PedidoItem> items = new ArrayList<>();

        // Batch-load todos los productos del pedido en una sola query — evita N+1
        List<Long> productoIds = dto.getItems().stream()
            .map(ManualPedidoDTO.ItemDTO::getProductoId).toList();
        Map<Long, Producto> productoMap = productoRepository.findAllById(productoIds).stream()
            .collect(Collectors.toMap(Producto::getId, p -> p));

        for (ManualPedidoDTO.ItemDTO itemDto : dto.getItems()) {
            Producto producto = productoMap.get(itemDto.getProductoId());
            if (producto == null || (empresaId != null && (producto.getEmpresa() == null
                    || !empresaId.equals(producto.getEmpresa().getId())))) {
                throw new RecursoNoEncontradoException("Producto", itemDto.getProductoId());
            }

            int precioCatalogo = producto.getPrecioVenta() != null ? producto.getPrecioVenta() : 0;
            int precio   = itemDto.getPrecioUnitario() != null ? itemDto.getPrecioUnitario() : precioCatalogo;
            // P7-02: el vendedor puede rebajar su precio, no inflarlo ni dejarlo negativo.
            if (precio < 0 || precio > precioCatalogo) {
                throw new IllegalArgumentException("El precio debe estar entre 0 y el precio de venta del producto.");
            }
            int costo    = producto.getPrecioCompra() != null ? producto.getPrecioCompra() : 0;
            int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;
            if (cantidad < 1) throw new IllegalArgumentException("La cantidad debe ser al menos 1.");

            PedidoItem item = new PedidoItem();
            item.setPedido(pedido);
            item.setProducto(producto);
            item.setCantidad(cantidad);
            item.setPrecioUnitarioMomento(precio);
            item.setCostoUnitarioMomento(costo);
            item.setSubtotalItem(precio * cantidad);
            item.setUtilidadItem((precio - costo) * cantidad);
            item.setDescuentoAplicado(0);
            item.setEstado(Constants.ESTADO_ACTIVO);
            items.add(item);

            subtotal           += precio * cantidad;
            costoTotalProductos += costo * cantidad;
        }

        pedido.setItems(items);
        pedido.setSubtotal(subtotal);
        int envio = pedido.getCostoEnvio() != null ? pedido.getCostoEnvio() : 0;
        pedido.setTotalPedido(subtotal + envio);
        pedido.setCostoTotalProductos(costoTotalProductos);
        pedido.setUtilidadBruta(subtotal - costoTotalProductos);
        pedido.setEmpresa(empresa);

        Pedido saved = pedidoRepository.save(pedido);
        Hibernate.initialize(saved.getItems());
        // SEC-09: si nace ya pagada (método manual), deja el Pago manual que habilita el despacho.
        pedidoPagoManualService.registrarPagoAlCrear(saved);
        if (Constants.PEDIDO_PAGADO.equals(saved.getEstadoPedido())) {
            n8nWebhookService.notificarPedidoNuevo(saved);
        }
        return saved;
    }

    /**
     * G1 (misma política que {@link PedidoPagoManualService}): solo un pedido en EFECTIVO puede nacer
     * pagado o avanzado. SINPE, TARJETA, ONVO y cualquier otro método nacen PENDIENTE: el cobro lo
     * confirma la pasarela o el flujo de comprobantes, nunca la creación manual.
     */
    static String estadoInicialPermitido(String estadoPedido, String metodoPago) {
        return estadoInicialPermitido(estadoPedido, metodoPago, null);
    }

    /**
     * QA5-M-01: «asignar compra» (origen MANUAL, método EXTERNO) registra una compra que ya se pagó y
     * entregó fuera de HotClick; nace ENTREGADO como pidió el admin. No crea Pago (EXTERNO no es método
     * manual cobrable) ni habilita despacho. /api/pedidos/manual no puede pedir ENTREGADO (P7-02).
     */
    static String estadoInicialPermitido(String estadoPedido, String metodoPago, String origen) {
        if (Constants.PEDIDO_ENTREGADO.equals(estadoPedido)
                && METODO_COMPRA_EXTERNA.equals(PedidoPagoManualService.normalizarMetodo(metodoPago))
                && OrigenPedido.normalizar(origen) == OrigenPedido.MANUAL) {
            return Constants.PEDIDO_ENTREGADO;
        }
        String estado = estadoPedido != null ? estadoPedido : Constants.PEDIDO_PENDIENTE;
        String metodo = PedidoPagoManualService.normalizarMetodo(metodoPago);
        if (!PedidoPagoManualService.METODO_EFECTIVO.equals(metodo)) return Constants.PEDIDO_PENDIENTE;
        return estado;
    }

    /**
     * P7-02: la bodega debe ser del negocio; si la pedida no lo es o no viene, se usa la primera del negocio.
     * P-07: sin negocio (admin de plataforma) se usa la pedida o la primera bodega activa de la plataforma;
     * nunca una id fija.
     */
    Bodega resolverBodega(Long bodegaId, Long empresaId) {
        if (empresaId == null) {
            if (bodegaId != null) {
                return bodegaRepository.findById(bodegaId)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Bodega no encontrada"));
            }
            return bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(
                    Constants.EMPRESA_PLATAFORMA_ID, Constants.ESTADO_ACTIVO)
                .stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Elegí una bodega para el pedido."));
        }
        if (bodegaId != null) {
            Bodega b = bodegaRepository.findById(bodegaId).orElse(null);
            if (b != null && b.getEmpresa() != null && empresaId.equals(b.getEmpresa().getId())) return b;
        }
        return bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO)
            .stream().findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Tu negocio no tiene una bodega activa."));
    }
}
