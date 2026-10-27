package com.hotclick.controller.storefront;

import com.hotclick.service.telegram.TelegramTexto;
import com.hotclick.model.OrigenPedido;
import com.hotclick.dto.StorefrontPedidoDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.StockService;
import com.hotclick.service.payment.GuestUserResolver;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class StorefrontGuestOrderService {

    private static final Logger log = LoggerFactory.getLogger(StorefrontGuestOrderService.class);

    private final BodegaRepository bodegaRepository;
    private final PedidoRepository pedidoRepository;
    private final ProductoRepository productoRepository;
    private final GuestUserResolver guestUserResolver;
    private final StockService stockService;
    private final N8nWebhookService n8nWebhookService;
    private final NotificacionEmailService notificacionEmailService;

    public StorefrontGuestOrderService(BodegaRepository bodegaRepository,
                                       PedidoRepository pedidoRepository,
                                       ProductoRepository productoRepository,
                                       GuestUserResolver guestUserResolver,
                                       StockService stockService,
                                       N8nWebhookService n8nWebhookService,
                                       NotificacionEmailService notificacionEmailService) {
        this.bodegaRepository = bodegaRepository;
        this.pedidoRepository = pedidoRepository;
        this.productoRepository = productoRepository;
        this.guestUserResolver = guestUserResolver;
        this.stockService = stockService;
        this.n8nWebhookService = n8nWebhookService;
        this.notificacionEmailService = notificacionEmailService;
    }

    @org.springframework.transaction.annotation.Transactional
    public Pedido crearPedido(Empresa empresa, StorefrontPedidoDTO dto) {
        Bodega bodega = resolverBodega(empresa);
        if (bodega == null) {
            return null;
        }
        exigirEfectivoAceptado(dto.getMetodoPago(), bodega, dto.getMetodoEnvio(),
            contraEntregaPolitica == null || contraEntregaPolitica.habilitada());
        exigirRetiroDisponible(dto.getMetodoEnvio(),
            bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO));

        // M2b (#399): mismo resolvedor que el checkout y SINPE: correo exacto, normalizado o, si hay una cuenta antigua
        // guardada con mayúsculas («Juan@X.com»), esa cuenta; solo si no existe se crea el invitado (sin duplicados).
        Usuario usuario = guestUserResolver.resolve(dto.getCorreoCliente(), dto.getTelefonoCliente());

        Pedido pedido = construirPedido(empresa, dto, bodega, usuario);
        Pedido guardado = pedidoRepository.save(pedido);
        notificarPedidoNuevo(guardado);
        return guardado;
    }

    private Pedido construirPedido(Empresa empresa, StorefrontPedidoDTO dto, Bodega bodega, Usuario usuario) {
        int subtotal = 0;
        int costoTotal = 0;
        Pedido pedido = new Pedido();

        for (StorefrontPedidoDTO.ItemDTO item : dto.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(item.productoId())
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado: " + item.productoId()));

            if (!empresa.getId().equals(producto.getEmpresa().getId())) {
                throw new IllegalArgumentException("Producto no disponible en esta tienda");
            }
            validarComprable(producto);

            if (producto.esACotizar()) {
                throw new IllegalArgumentException("«" + producto.getNombreProducto() + "» es a cotizar: solicitá una cotización al vendedor");
            }

            String ref = "STOREFRONT-" + empresa.getSlug();
            stockService.reservar(producto, item.cantidad(), ref, dto.getCorreoCliente());

            PedidoItem pedidoItem = crearPedidoItem(producto, item.cantidad(), pedido);
            subtotal += pedidoItem.getSubtotalItem();
            costoTotal += producto.getPrecioCompra() != null ? producto.getPrecioCompra() * item.cantidad() : 0;
            pedido.getItems().add(pedidoItem);
        }

        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setEmpresa(empresa);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setMetodoPago(dto.getMetodoPago());
        pedido.setMetodoEnvio(dto.getMetodoEnvio());
        pedido.setSubtotal(subtotal);
        int costoEnvio = costoEnvioTienda(dto.getMetodoEnvio(), orderPricingService);
        pedido.setTotalPedido(subtotal + costoEnvio);
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal);
        pedido.setDescuentoTotal(0);
        pedido.setCostoEnvio(costoEnvio);
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedido.setOrigen(OrigenPedido.ONLINE.codigo());
        pedido.setClienteNombre(dto.getNombreCliente());
        pedido.setClienteTel(dto.getTelefonoCliente());
        pedido.setNotas(construirNotas(dto));
        pedido.setDireccionEntrega(dto.getDireccionEntrega()); // NP-18: el vendedor ve a dónde enviar
        return pedido;
    }

    /**
     * M-04 (re-QA área 3): mismo criterio que el checkout y el carrito: activo, visible, de un negocio
     * ACTIVO y público ({@code esPublicableEnMemoria}) y no vendido. Un producto borrado o inactivo ya no
     * se puede pedir como invitado aunque siga con visibleCatalogo=true.
     */
    static void validarComprable(Producto producto) {
        if (!com.hotclick.service.payment.StockReservationService.esPublicableEnMemoria(producto)
                || Boolean.TRUE.equals(producto.getVendido())) {
            throw new IllegalStateException("Producto no disponible: " + producto.getNombreProducto());
        }
    }

    static PedidoItem crearPedidoItem(Producto producto, int cantidad, Pedido pedido) {
        PedidoItem pedidoItem = new PedidoItem();
        int precioUnitario = com.hotclick.service.payment.OrderPricingService.precioEfectivo(producto);
        int costoUnitario = producto.getPrecioCompra() != null ? producto.getPrecioCompra() : 0;
        pedidoItem.setProducto(producto);
        pedidoItem.setCantidad(cantidad);
        pedidoItem.setPrecioUnitarioMomento(precioUnitario);
        pedidoItem.setCostoUnitarioMomento(costoUnitario);
        pedidoItem.setSubtotalItem(precioUnitario * cantidad);
        pedidoItem.setUtilidadItem((precioUnitario - costoUnitario) * cantidad);
        pedidoItem.setDescuentoAplicado(0);
        pedidoItem.setPedido(pedido);
        return pedidoItem;
    }

    private String construirNotas(StorefrontPedidoDTO dto) {
        if (dto.getDireccionEntrega() != null) {
            return (dto.getNotas() != null ? dto.getNotas() + " | " : "") +
                "Dirección: " + dto.getDireccionEntrega();
        }
        return dto.getNotas();
    }

    private void notificarPedidoNuevo(Pedido guardado) {
        try {
            n8nWebhookService.notificarPedidoNuevo(guardado);
        } catch (Exception ex) {
            // Sin getMessage(): el proveedor puede devolver el correo del cliente en el texto del error.
            log.warn("Webhook admin falló para pedido {}: {}", guardado.getNumeroPedido(), ex.getClass().getSimpleName(),
                TelegramTexto.paraLog(ex));
        }
        try {
            // Nace PENDIENTE y se paga al recibir: nunca el correo de pago confirmado («Total pagado»).
            notificacionEmailService.enviarPedidoRecibido(guardado);
        } catch (Exception ex) {
            log.warn("Email pedido recibido falló para pedido {}: {}", guardado.getNumeroPedido(), ex.getClass().getSimpleName(),
                TelegramTexto.paraLog(ex));
        }
    }

    /** Efectivo solo si la bodega que despacha lo acepta; la UI ya lo oculta, esto cierra la llamada directa. */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.service.envio.ContraEntregaPolitica contraEntregaPolitica;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.service.payment.OrderPricingService orderPricingService;

    /** (a) Envío a domicilio = Envío Normal de HotClick: el costo sale de la misma tabla del marketplace. */
    static int costoEnvioTienda(String metodoEnvio, com.hotclick.service.payment.OrderPricingService pricing) {
        if (pricing == null || !StorefrontPedidoDTO.ENVIO_DOMICILIO.equalsIgnoreCase(metodoEnvio)) return 0;
        return pricing.calcularCostoEnvio("ENVIO_NORMAL_GAM");
    }

    static void exigirEfectivoAceptado(String metodoPago, Bodega bodega) {
        exigirEfectivoAceptado(metodoPago, bodega, null, false);
    }

    static void exigirEfectivoAceptado(String metodoPago, Bodega bodega, String metodoEnvio, boolean contraEntregaNormal) {
        if (!"EFECTIVO".equalsIgnoreCase(metodoPago)) return;
        boolean acepta = bodega != null && Boolean.TRUE.equals(bodega.getAceptaEfectivo());
        if (!com.hotclick.service.envio.ContraEntregaPolitica.permiteEfectivo(acepta, metodoEnvio, contraEntregaNormal)) {
            throw new IllegalArgumentException("Este negocio no acepta efectivo. Pagá con SINPE / Tarjeta.");
        }
    }

    /** Retiro solo si alguna bodega activa de la tienda lo permite (misma regla que publica la info de la tienda). */
    static void exigirRetiroDisponible(String metodoEnvio, List<Bodega> bodegas) {
        if (!StorefrontPedidoDTO.ENVIO_RETIRO.equalsIgnoreCase(metodoEnvio)) return;
        boolean hay = bodegas != null && bodegas.stream().anyMatch(b -> Boolean.TRUE.equals(b.getPermiteRetiroCliente()));
        if (!hay) {
            throw new IllegalArgumentException("Este negocio no ofrece retiro en tienda.");
        }
    }

    private Bodega resolverBodega(Empresa empresa) {
        // La Empresa llega desacoplada (la carga el interceptor por slug): su bodega es un
        // proxy sin sesión. Se recarga dentro de la transacción para leer aceptaEfectivo (QA-114-1).
        if (empresa.getBodegaVentaOnline() != null) {
            Long id = empresa.getBodegaVentaOnline().getId();
            Bodega fresca = bodegaRepository.findById(id).orElse(null);
            if (fresca != null) return fresca;
        }
        List<Bodega> bodegas = bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO);
        return bodegas.isEmpty() ? null : bodegas.get(0);
    }
}
