package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.StorefrontPedidoDTO;
import com.hotclick.controller.storefront.StorefrontGuestOrderService;
import com.hotclick.controller.storefront.StorefrontInfoMapper;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.SlugTenantInterceptor;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    private static final int MAX_PAGE_SIZE = 50;

    private final ProductoRepository  productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final MarcaRepository     marcaRepository;
    private final StorefrontInfoMapper storefrontInfoMapper;
    private final StorefrontGuestOrderService storefrontGuestOrderService;

    public StorefrontController(ProductoRepository productoRepository,
                                CategoriaRepository categoriaRepository,
                                MarcaRepository marcaRepository,
                                StorefrontInfoMapper storefrontInfoMapper,
                                StorefrontGuestOrderService storefrontGuestOrderService) {
        this.productoRepository  = productoRepository;
        this.categoriaRepository = categoriaRepository;
        this.marcaRepository     = marcaRepository;
        this.storefrontInfoMapper = storefrontInfoMapper;
        this.storefrontGuestOrderService = storefrontGuestOrderService;
    }

    // ── Info pública de la tienda ────────────────────────────────────────────

    /**
     * Retorna los metadatos públicos de la tienda: nombre, logo, colores, tagline.
     * El frontend usa esto para renderizar el branding del emprendedor.
     */
    @GetMapping
    public ResponseEntity<ResponseDTO> info(HttpServletRequest request) {
        Empresa empresa = empresa(request);
        Map<String, Object> data = storefrontInfoMapper.info(empresa);
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
        Pedido guardado = storefrontGuestOrderService.crearPedido(empresa, dto);
        if (guardado == null) {
            return ResponseEntity.badRequest()
                .body(ResponseDTO.error("Esta tienda no tiene bodega configurada para ventas online"));
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
}
