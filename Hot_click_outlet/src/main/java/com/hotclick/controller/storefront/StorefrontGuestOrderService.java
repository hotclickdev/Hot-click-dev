package com.hotclick.controller.storefront;

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
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.StockService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class StorefrontGuestOrderService {

    private static final Logger log = LoggerFactory.getLogger(StorefrontGuestOrderService.class);

    private final BodegaRepository bodegaRepository;
    private final PedidoRepository pedidoRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final StockService stockService;
    private final PasswordEncoder passwordEncoder;
    private final N8nWebhookService n8nWebhookService;
    private final NotificacionEmailService notificacionEmailService;

    public StorefrontGuestOrderService(BodegaRepository bodegaRepository,
                                       PedidoRepository pedidoRepository,
                                       ProductoRepository productoRepository,
                                       UsuarioRepository usuarioRepository,
                                       RolRepository rolRepository,
                                       StockService stockService,
                                       PasswordEncoder passwordEncoder,
                                       N8nWebhookService n8nWebhookService,
                                       NotificacionEmailService notificacionEmailService) {
        this.bodegaRepository = bodegaRepository;
        this.pedidoRepository = pedidoRepository;
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.stockService = stockService;
        this.passwordEncoder = passwordEncoder;
        this.n8nWebhookService = n8nWebhookService;
        this.notificacionEmailService = notificacionEmailService;
    }

    public Pedido crearPedido(Empresa empresa, StorefrontPedidoDTO dto) {
        Bodega bodega = resolverBodega(empresa);
        if (bodega == null) {
            return null;
        }

        Usuario usuario = usuarioRepository.findByCorreo(dto.getCorreoCliente())
            .orElseGet(() -> crearInvitado(dto.getCorreoCliente(), dto.getTelefonoCliente()));

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
            if (!Boolean.TRUE.equals(producto.getVisibleCatalogo()) || Boolean.TRUE.equals(producto.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + producto.getNombreProducto());
            }

            String ref = "STOREFRONT-" + empresa.getSlug();
            stockService.reservar(producto, item.cantidad(), ref, dto.getCorreoCliente());

            subtotal += producto.getPrecioVenta() * item.cantidad();
            costoTotal += producto.getPrecioCompra() != null ? producto.getPrecioCompra() * item.cantidad() : 0;

            PedidoItem pedidoItem = crearPedidoItem(producto, item.cantidad(), pedido);
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
        pedido.setTotalPedido(subtotal);
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal);
        pedido.setDescuentoTotal(0);
        pedido.setCostoEnvio(0);
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedido.setOrigen("TIENDA_WEB");
        pedido.setClienteNombre(dto.getNombreCliente());
        pedido.setClienteTel(dto.getTelefonoCliente());
        pedido.setNotas(construirNotas(dto));
        return pedido;
    }

    private PedidoItem crearPedidoItem(Producto producto, int cantidad, Pedido pedido) {
        PedidoItem pedidoItem = new PedidoItem();
        int precioUnitario = producto.getPrecioVenta();
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
            log.warn("Webhook admin falló para pedido {}: {}", guardado.getNumeroPedido(), ex.getMessage());
        }
        try {
            notificacionEmailService.enviarConfirmacionPedido(guardado);
        } catch (Exception ex) {
            log.warn("Email confirmación falló para pedido {}: {}", guardado.getNumeroPedido(), ex.getMessage());
        }
    }

    private Bodega resolverBodega(Empresa empresa) {
        if (empresa.getBodegaVentaOnline() != null) {
            return empresa.getBodegaVentaOnline();
        }
        List<Bodega> bodegas = bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO);
        return bodegas.isEmpty() ? null : bodegas.get(0);
    }

    private static String digitosTelefono(String telefono) {
        return telefono == null ? "" : telefono.replaceAll("[^0-9]", "");
    }

    private Usuario crearInvitado(String correo, String telefono) {
        Usuario usuario = new Usuario();
        String uid = UUID.randomUUID().toString().replace("-", "");
        usuario.setIdentificacion("GUEST-" + uid.substring(0, 13));
        usuario.setNombre("Invitado");
        usuario.setApellidoPaterno("Guest");
        usuario.setCorreo(correo);
        usuario.setTelefono(digitosTelefono(telefono));
        usuario.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        usuario.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL)
            .ifPresent(rol -> usuario.setRoles(List.of(rol)));
        return usuarioRepository.save(usuario);
    }
}
