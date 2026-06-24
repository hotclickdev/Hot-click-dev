package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.StorefrontPedidoDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.SlugTenantInterceptor;
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.StockService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Catálogo público por slug: /api/tienda/{slug}/**
 *
 * El TenantContext ya está cargado por SlugTenantInterceptor antes de
 * que cualquier método de este controller se ejecute. No se requiere JWT.
 *
 * Aislamiento de datos:
 *   - Todos los queries filtrán por empresa.id = TenantContext.get()
 *   - Solo productos con visibleCatalogo=true y stockActual > 0 son expuestos
 *   - La bodega usada para descontar stock es empresa.bodegaVentaOnline
 *     (o la primera bodega activa de esa empresa si no está configurada)
 */
@RestController
@RequestMapping("/api/tienda/{slug}")
public class StorefrontController {

    private static final Logger log = LoggerFactory.getLogger(StorefrontController.class);
    private static final int MAX_PAGE_SIZE = 50;

    private final ProductoRepository  productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final MarcaRepository     marcaRepository;
    private final BodegaRepository    bodegaRepository;
    private final PedidoRepository    pedidoRepository;
    private final UsuarioRepository   usuarioRepository;
    private final RolRepository       rolRepository;
    private final StockService        stockService;
    private final PasswordEncoder     passwordEncoder;
    private final N8nWebhookService   n8nWebhookService;
    private final NotificacionEmailService notificacionEmailService;

    public StorefrontController(ProductoRepository productoRepository,
                                CategoriaRepository categoriaRepository,
                                MarcaRepository marcaRepository,
                                BodegaRepository bodegaRepository,
                                PedidoRepository pedidoRepository,
                                UsuarioRepository usuarioRepository,
                                RolRepository rolRepository,
                                StockService stockService,
                                PasswordEncoder passwordEncoder,
                                N8nWebhookService n8nWebhookService,
                                NotificacionEmailService notificacionEmailService) {
        this.productoRepository  = productoRepository;
        this.categoriaRepository = categoriaRepository;
        this.marcaRepository     = marcaRepository;
        this.bodegaRepository    = bodegaRepository;
        this.pedidoRepository    = pedidoRepository;
        this.usuarioRepository   = usuarioRepository;
        this.rolRepository       = rolRepository;
        this.stockService        = stockService;
        this.passwordEncoder     = passwordEncoder;
        this.n8nWebhookService   = n8nWebhookService;
        this.notificacionEmailService = notificacionEmailService;
    }

    // ── Info pública de la tienda ────────────────────────────────────────────

    /**
     * Retorna los metadatos públicos de la tienda: nombre, logo, colores, tagline.
     * El frontend usa esto para renderizar el branding del emprendedor.
     */
    @GetMapping
    public ResponseEntity<ResponseDTO> info(HttpServletRequest request) {
        Empresa empresa = empresa(request);
        Map<String, Object> data = Map.of(
            "slug",           empresa.getSlug(),
            "nombreComercial", orEmpty(empresa.getNombreComercial(), empresa.getNombreEmpresa()),
            "logoUrl",         orEmpty(empresa.getLogoUrl(), ""),
            "colorPrimario",   orEmpty(empresa.getColorPrimario(), "#E73B33"),
            "colorSecundario", orEmpty(empresa.getColorSecundario(), "#152B5E"),
            "colorAcento",     orEmpty(empresa.getColorAcento(), "#1747A8"),
            "tagline",         orEmpty(empresa.getTagline(), ""),
            "footerTexto",     orEmpty(empresa.getFooterTexto(), ""),
            "whatsapp",        orEmpty(empresa.getNumeroWhatsapp(), ""),
            "moneda",          orEmpty(empresa.getMonedaDefecto(), "CRC")
        );
        return ResponseEntity.ok(ResponseDTO.success("Tienda encontrada", data));
    }

    // ── Catálogo ─────────────────────────────────────────────────────────────

    @GetMapping("/productos")
    public ResponseEntity<ResponseDTO> productos(
            HttpServletRequest request,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String q,
            @RequestParam(required = false)    Long categoriaId) {

        Long empresaId = empresaId(request);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(size, MAX_PAGE_SIZE));

        Page<Producto> resultado;
        if (categoriaId != null) {
            resultado = productoRepository.findCatalogoPublicoByEmpresaAndCategoria(empresaId, categoriaId, pageable);
        } else if (q != null && !q.isBlank()) {
            resultado = productoRepository.findCatalogoPublicoByEmpresaAndNombre(empresaId, q.trim(), pageable);
        } else {
            resultado = productoRepository.findCatalogoPublicoByEmpresa(empresaId, pageable);
        }

        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", resultado));
    }

    @GetMapping("/productos/{productoId}")
    public ResponseEntity<ResponseDTO> producto(
            HttpServletRequest request,
            @PathVariable Long productoId) {

        Long empresaId = empresaId(request);
        return productoRepository.findProductoPublicoByEmpresaAndId(empresaId, productoId)
            .map(p -> ResponseEntity.ok(ResponseDTO.success("Producto encontrado", p)))
            .orElseGet(() -> ResponseEntity.notFound().<ResponseDTO>build());
    }

    @GetMapping("/categorias")
    public ResponseEntity<ResponseDTO> categorias(HttpServletRequest request) {
        Long empresaId = empresaId(request);
        List<Categoria> cats = categoriaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Categorías obtenidas", cats));
    }

    @GetMapping("/marcas")
    public ResponseEntity<ResponseDTO> marcas(HttpServletRequest request) {
        Long empresaId = empresaId(request);
        List<Marca> marcas = marcaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Marcas obtenidas", marcas));
    }

    // ── Pedido de invitado ────────────────────────────────────────────────────

    /**
     * Crea un pedido desde la tienda pública sin autenticación.
     *
     * Flujo:
     *   1. Busca la bodega de venta online configurada (o la primera activa de la empresa).
     *   2. Busca o crea un usuario invitado con el correo proporcionado.
     *   3. Bloquea y reserva stock por cada ítem (SELECT FOR UPDATE).
     *   4. Crea el Pedido asociado a la empresa del slug.
     *   5. Notifica al dashboard del administrador vía webhook.
     *
     * El stock no se descuenta definitivamente hasta que el admin confirme pago
     * (el estado pasa a PAGADO y el flujo existente llama descontarPorVenta).
     */
    @PostMapping("/pedidos")
    @Transactional
    public ResponseEntity<ResponseDTO> crearPedido(
            HttpServletRequest request,
            @Valid @RequestBody StorefrontPedidoDTO dto) {

        Empresa empresa = empresa(request);

        // 1. Bodega de venta online
        Bodega bodega = resolverBodega(empresa);
        if (bodega == null) {
            return ResponseEntity.badRequest()
                .body(ResponseDTO.error("Esta tienda no tiene bodega configurada para ventas online"));
        }

        // 2. Usuario invitado o existente
        Usuario usuario = usuarioRepository.findByCorreo(dto.getCorreoCliente())
            .orElseGet(() -> crearInvitado(dto.getCorreoCliente(), dto.getTelefonoCliente()));

        // 3. Bloquear productos y reservar stock
        int subtotal   = 0;
        int costoTotal = 0;
        Pedido pedido  = new Pedido();

        for (StorefrontPedidoDTO.ItemDTO item : dto.getItems()) {
            Producto p = productoRepository.findByIdForUpdate(item.productoId())
                .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado: " + item.productoId()));

            // Verificar que el producto pertenece a esta empresa
            if (!empresa.getId().equals(p.getEmpresa().getId())) {
                throw new IllegalArgumentException("Producto no disponible en esta tienda");
            }
            if (!Boolean.TRUE.equals(p.getVisibleCatalogo()) || Boolean.TRUE.equals(p.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + p.getNombreProducto());
            }

            String ref = "STOREFRONT-" + empresa.getSlug();
            stockService.reservar(p, item.cantidad(), ref, dto.getCorreoCliente());

            subtotal   += p.getPrecioVenta()  * item.cantidad();
            costoTotal += p.getPrecioCompra() != null ? p.getPrecioCompra() * item.cantidad() : 0;

            PedidoItem pi = new PedidoItem();
            int precioU = p.getPrecioVenta();
            int costoU  = p.getPrecioCompra() != null ? p.getPrecioCompra() : 0;
            pi.setProducto(p);
            pi.setCantidad(item.cantidad());
            pi.setPrecioUnitarioMomento(precioU);
            pi.setCostoUnitarioMomento(costoU);
            pi.setSubtotalItem(precioU * item.cantidad());
            pi.setUtilidadItem((precioU - costoU) * item.cantidad());
            pi.setDescuentoAplicado(0);
            pi.setPedido(pedido);
            pedido.getItems().add(pi);
        }

        // 4. Construir pedido
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setEmpresa(empresa);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setMetodoPago(dto.getMetodoPago());
        pedido.setMetodoEnvio(dto.getMetodoEnvio());
        pedido.setSubtotal(subtotal);
        pedido.setTotalPedido(subtotal);          // sin envío por ahora; admin puede ajustar
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal);
        pedido.setDescuentoTotal(0);
        pedido.setCostoEnvio(0);
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedido.setOrigen("TIENDA_WEB");
        pedido.setClienteNombre(dto.getNombreCliente());
        pedido.setClienteTel(dto.getTelefonoCliente());
        if (dto.getDireccionEntrega() != null) {
            pedido.setNotas(
                (dto.getNotas() != null ? dto.getNotas() + " | " : "") +
                "Dirección: " + dto.getDireccionEntrega()
            );
        } else {
            pedido.setNotas(dto.getNotas());
        }

        Pedido guardado = pedidoRepository.save(pedido);

        // 5. Notificar admin en tiempo real
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

        Map<String, Object> resp = Map.of(
            "numeroPedido", guardado.getNumeroPedido(),
            "estadoPedido", guardado.getEstadoPedido(),
            "total",        guardado.getTotalPedido()
        );
        return ResponseEntity.ok(ResponseDTO.success("Pedido creado correctamente", resp));
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    private Empresa empresa(HttpServletRequest req) {
        return (Empresa) req.getAttribute(SlugTenantInterceptor.ATTR_EMPRESA);
    }

    private Long empresaId(HttpServletRequest req) {
        return empresa(req).getId();
    }

    private Bodega resolverBodega(Empresa empresa) {
        if (empresa.getBodegaVentaOnline() != null) return empresa.getBodegaVentaOnline();
        List<Bodega> bodegas = bodegaRepository.findByEmpresaIdAndEstado(empresa.getId(), Constants.ESTADO_ACTIVO);
        return bodegas.isEmpty() ? null : bodegas.get(0);
    }

    private Usuario crearInvitado(String correo, String telefono) {
        Usuario u = new Usuario();
        String uid = UUID.randomUUID().toString().replace("-", "");
        u.setIdentificacion("GUEST-" + uid.substring(0, 13));
        u.setNombre("Invitado");
        u.setApellidoPaterno("Guest");
        u.setCorreo(correo);
        u.setTelefono(telefono != null && !telefono.isBlank()
            ? telefono.replaceAll("[^0-9]", "") : "00000000");
        u.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        u.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        u.setEstado(Constants.ESTADO_ACTIVO);
        rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL)
            .ifPresent(rol -> u.setRoles(List.of(rol)));
        return usuarioRepository.save(u);
    }

    private static String orEmpty(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
