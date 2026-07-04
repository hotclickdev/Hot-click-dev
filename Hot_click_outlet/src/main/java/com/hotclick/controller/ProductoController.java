package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.ProductoService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.concurrent.TimeUnit;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private static final Logger log = LoggerFactory.getLogger(ProductoController.class);

    @Autowired private ProductoService    productoService;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CompanyScope       companyScope;
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepository;
    @Autowired private com.hotclick.service.StockService stockService;
    @Autowired private com.hotclick.service.ImageModerationService imageModerationService;
    @Autowired private com.hotclick.service.TextModerationService  textModerationService;
    @Autowired private com.hotclick.service.TenantService          tenantService;
    @Autowired private org.springframework.cache.CacheManager      cacheManager;
    @Autowired private com.hotclick.repository.SolicitudAprobacionRepository solicitudAprobacionRepository;

    private static final int MAX_PAGE_SIZE        = 100;
    private static final int MAX_PAGE_SIZE_PUBLIC =  50;

    @GetMapping
    public ResponseEntity<ResponseDTO> listarProductos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        var pageable  = PageRequest.of(Math.max(0, page), Math.min(size, MAX_PAGE_SIZE_PUBLIC));
        // Si hay empresaId en el JWT (contexto admin de ese negocio) → mostrar sus propios productos
        // Si es público (sin empresa, incluye ADMIN sin empresa) → catálogo filtrado (negocios aprobados y visibles)
        var productos = empresaId != null
            ? productoRepository.findByEmpresaIdAndEstado(empresaId, com.hotclick.utils.Constants.ESTADO_ACTIVO, pageable)
            : productoService.listarTodosActivos(pageable);
        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", productos));
    }

    @GetMapping("/admin/todos")
    public ResponseEntity<ResponseDTO> listarTodosAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        var pageable = PageRequest.of(Math.max(0, page), Math.min(size, MAX_PAGE_SIZE));
        var productos = empresaId != null
            ? productoRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO, pageable)
            : productoService.listarTodosActivos(pageable);
        return ResponseEntity.ok(ResponseDTO.success("Productos obtenidos", productos));
    }

    /** POS: productos por categoría dentro de la empresa. */
    @GetMapping("/pos/categoria/{catId}")
    public ResponseEntity<ResponseDTO> porCategoriaPOS(@PathVariable Long catId) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida en el contexto"));
        }
        var productos = productoRepository.findByCategoriaIdAndEmpresaId(catId, empresaId);
        return ResponseEntity.ok(ResponseDTO.success("OK", productos));
    }

    /** Búsqueda POS: por nombre, SKU o barcode dentro de la empresa. */
    @GetMapping("/buscar")
    public ResponseEntity<ResponseDTO> buscar(@RequestParam String q) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida en el contexto"));
        }
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(ResponseDTO.success("OK", List.of()));
        }
        var pageable = PageRequest.of(0, 30);
        var resultados = productoRepository.buscarPorTextoOCodigoEnEmpresa(q.trim(), empresaId, pageable);
        return ResponseEntity.ok(ResponseDTO.success("OK", resultados));
    }

    /** Kardex: historial de movimientos de stock de un producto. */
    @GetMapping("/{id}/kardex")
    public ResponseEntity<ResponseDTO> kardex(@PathVariable Long id) {
        try {
            var producto = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(producto.getEmpresaId());
            var movimientos = stockService.historialPorProducto(id);
            return ResponseEntity.ok(ResponseDTO.success("OK", movimientos));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/destacados")
    public ResponseEntity<ResponseDTO> listarDestacados() {
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic());
        return ResponseEntity.ok().headers(headers)
                .body(ResponseDTO.success("Destacados obtenidos", productoService.listarDestacados()));
    }

    @GetMapping("/carrusel")
    public ResponseEntity<ResponseDTO> listarCarrusel() {
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic());
        return ResponseEntity.ok().headers(headers)
                .body(ResponseDTO.success("Carrusel obtenido", productoService.listarCarrusel()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/carrusel")
    public ResponseEntity<ResponseDTO> toggleCarrusel(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            Boolean valor = (Boolean) body.get("enCarrusel");
            Object ordenObj = body.get("orden");
            Integer orden = (ordenObj instanceof Number n) ? n.intValue() : null;
            if (valor == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo enCarrusel requerido"));
            var existente = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            var producto = productoService.toggleCarrusel(id, valor, orden);
            return ResponseEntity.ok(ResponseDTO.success("Carrusel actualizado", producto));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PatchMapping("/{id}/destacado")
    public ResponseEntity<ResponseDTO> toggleDestacado(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        try {
            Boolean valor = body.get("destacado");
            if (valor == null) return ResponseEntity.badRequest().body(ResponseDTO.error("Campo destacado requerido"));
            var existente = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            var producto = productoService.toggleDestacado(id, valor);
            return ResponseEntity.ok(ResponseDTO.success("Destacado actualizado", producto));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}/recomendaciones")
    public ResponseEntity<ResponseDTO> recomendaciones(
            @PathVariable Long id,
            @RequestParam(defaultValue = "6") int limit) {
        return ResponseEntity.ok(ResponseDTO.success("Recomendaciones obtenidas",
                productoService.getRecomendaciones(id, limit)));
    }

    @GetMapping("/marca/{marcaId}")
    public ResponseEntity<ResponseDTO> listarPorMarca(
            @PathVariable Long marcaId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        var productos = productoService.listarPorMarca(marcaId, PageRequest.of(Math.max(0, page), Math.min(size, MAX_PAGE_SIZE_PUBLIC)));
        return ResponseEntity.ok(ResponseDTO.success("Productos por marca", productos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerProducto(@PathVariable Long id) {
        try {
            Producto producto = productoService.buscarPorId(id);
            // Tenant check: EMPRENDEDOR solo ve sus propios productos en el panel admin.
            // Acceso público (cliente final, anónimo) pasa sin restricción.
            Long empresaId = companyScope.getCurrentEmpresaId();
            if (empresaId != null) {
                companyScope.assertCanAccessNullable(
                    producto.getEmpresa() != null ? producto.getEmpresa().getId() : null);
            }
            return ResponseEntity.ok(ResponseDTO.success("Producto encontrado", producto));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Otros colores/variantes de la misma pieza — para el selector de swatches en el detalle. */
    @GetMapping("/{id}/variantes")
    public ResponseEntity<ResponseDTO> obtenerVariantes(@PathVariable Long id) {
        Producto base = productoService.buscarPorId(id);
        if (base.getGrupoVarianteId() == null) {
            return ResponseEntity.ok(ResponseDTO.success("Sin variantes", java.util.List.of()));
        }
        var hermanos = productoRepository.findByGrupoVarianteIdAndEstadoAndVisibleCatalogo(
                base.getGrupoVarianteId(), Constants.ESTADO_ACTIVO, true)
            .stream()
            .map(p -> java.util.Map.of(
                "id", p.getId(),
                "nombreProducto", p.getNombreProducto(),
                "colorVariante", p.getColorVariante() != null ? p.getColorVariante() : "",
                "talla", p.getTalla() != null ? p.getTalla() : "",
                "imagenPrincipalUrl", p.getImagenPrincipalUrl() != null ? p.getImagenPrincipalUrl() : "",
                "precioVenta", p.getPrecioVenta(),
                "stock", p.getStock()
            ))
            .toList();
        return ResponseEntity.ok(ResponseDTO.success("Variantes", hermanos));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> crearProducto(
            @RequestBody @Valid ProductoRequestDTO dto,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey) {
        // Idempotencia: misma clave = mismo tab o doble-clic → 409 en vez de duplicar (#17)
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var idempCache = cacheManager.getCache("idempotency-keys");
            if (idempCache != null && idempCache.get(idempotencyKey) != null) {
                return ResponseEntity.status(409)
                    .body(ResponseDTO.error("Este producto ya fue publicado. Actualizá la página."));
            }
        }
        // Verificación de límite de plan — propaga PlanLimitException → GlobalExceptionHandler (HTTP 403)
        Long eid = companyScope.getCurrentEmpresaIdOrOwn();
        if (eid != null) tenantService.verificarLimiteProductos(eid);

        try {
            var textMod = textModerationService.moderar(
                dto.getNombreProducto(), dto.getDescripcionCorta(),
                dto.getTituloProducto(), dto.getDescripcionLarga(),
                dto.getEspecificaciones(), dto.getComoUsar(), dto.getTags());
            if (!textMod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El contenido del producto no está permitido en la plataforma"));
            Empresa empresa = eid != null ? empresaRepository.findById(eid).orElse(null) : null;
            var producto = productoService.crearProducto(dto, currentUserName(), empresa);
            // Registrar la clave para futuras solicitudes duplicadas
            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                var idempCache = cacheManager.getCache("idempotency-keys");
                if (idempCache != null) idempCache.put(idempotencyKey, Boolean.TRUE);
            }
            String mensaje = "Producto creado";
            if (empresa != null && !companyScope.isAdminIT()) {
                producto.setVisibleCatalogo(false);
                producto = productoRepository.save(producto);

                var solicitud = new com.hotclick.model.SolicitudAprobacion();
                solicitud.setTipoEntidad("PRODUCTO");
                solicitud.setAccionSolicitada("PUBLISH");
                solicitud.setIdEntidad(producto.getId());
                solicitud.setEmpresa(empresa);
                solicitud.setUsuarioPide(companyScope.getCurrentUser());
                solicitudAprobacionRepository.save(solicitud);
                mensaje = "Producto creado — pendiente de aprobación del admin para publicarse en el catálogo";
            }
            return ResponseEntity.ok(ResponseDTO.success(mensaje, producto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(mensajeAmigable(e)));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> actualizarProducto(
            @PathVariable Long id,
            @RequestBody ProductoRequestDTO dto) {
        try {
            var existente = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            var textMod = textModerationService.moderar(
                dto.getNombreProducto(), dto.getDescripcionCorta(),
                dto.getTituloProducto(), dto.getDescripcionLarga(),
                dto.getEspecificaciones(), dto.getComoUsar(), dto.getTags());
            if (!textMod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El contenido del producto no está permitido en la plataforma"));
            var producto = productoService.actualizarProducto(id, dto, currentUserName());
            return ResponseEntity.ok(ResponseDTO.success("Producto actualizado", producto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(mensajeAmigable(e)));
        }
    }

    /** Extrae el nombre del principal autenticado. Funciona con JWT (UserDetails) y API key (String). */
    private static String currentUserName() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "sistema";
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) return ud.getUsername();
        return principal != null ? principal.toString() : "sistema";
    }

    private static String mensajeAmigable(Exception e) {
        String msg = e.getMessage();
        if (msg != null && msg.contains("value too long for type character varying")) {
            return "Uno de los campos de texto supera el límite permitido. " +
                   "Revisá descripción, especificaciones o cómo usar y reducí el texto.";
        }
        return msg != null ? msg : "Error al procesar el producto";
    }

    @PostMapping("/archivar-sin-stock")
    @Transactional
    public ResponseEntity<ResponseDTO> archivarSinStock() {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            List<Producto> sinStock = empresaId != null
                ? productoRepository.findActivosSinStockByEmpresaId(empresaId)
                : productoRepository.findActivosSinStock();
            sinStock.forEach(p -> p.setEstado(0));
            productoRepository.saveAll(sinStock);
            return ResponseEntity.ok(ResponseDTO.success(sinStock.size() + " productos desactivados", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    @PostMapping("/ajustar-precios")
    @Transactional
    public ResponseEntity<ResponseDTO> ajustarPrecios(@RequestBody Map<String, Double> body) {
        try {
            double pct = body.getOrDefault("porcentaje", 0.0);
            if (pct == 0) return ResponseEntity.badRequest().body(ResponseDTO.error("Porcentaje requerido"));
            double mult = 1.0 + pct / 100.0;
            Long empresaId = companyScope.getCurrentEmpresaId();
            List<Producto> todos = empresaId != null
                ? productoRepository.findActivosByEmpresaId(empresaId)
                : productoRepository.findAllActivos();
            int actualizados = 0;
            for (Producto p : todos) {
                if (p.getPrecioVenta() != null) {
                    p.setPrecioVenta((int) Math.round(p.getPrecioVenta() * mult));
                    actualizados++;
                }
            }
            productoRepository.saveAll(todos);
            return ResponseEntity.ok(ResponseDTO.success(actualizados + " productos actualizados", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Error: " + e.getMessage()));
        }
    }

    @PostMapping("/bulk")
    public ResponseEntity<ResponseDTO> importarBulk(@RequestBody List<ProductoRequestDTO> dtos) {
        if (dtos == null || dtos.size() > 200)
            return ResponseEntity.badRequest().body(ResponseDTO.error("El bulk acepta entre 1 y 200 productos por lote"));
        // Verificación de límite antes de procesar el lote completo — propaga PlanLimitException (HTTP 403)
        Long eid2 = companyScope.getCurrentEmpresaIdOrOwn();
        if (eid2 != null) tenantService.verificarLimiteProductosBulk(eid2, dtos.size());
        Empresa empresa = eid2 != null ? empresaRepository.findById(eid2).orElse(null) : null;
        String adminCorreo = currentUserName();
        int ok = 0; int errors = 0;
        StringBuilder errMsg = new StringBuilder();
        for (int i = 0; i < dtos.size(); i++) {
            try {
                productoService.crearProducto(dtos.get(i), adminCorreo, empresa);
                ok++;
            } catch (Exception e) {
                errors++;
                if (errors <= 5) errMsg.append("Fila ").append(i + 1).append(": ").append(e.getMessage()).append(". ");
            }
        }
        String msg = "Importados: " + ok + " productos" + (errors > 0 ? ", errores: " + errors + ". " + errMsg : "");
        return ResponseEntity.ok(ResponseDTO.success(msg, Map.of("ok", ok, "errors", errors)));
    }

    @PostMapping("/imagen")
    public ResponseEntity<ResponseDTO> subirImagen(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty())
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        try {
            var mod = imageModerationService.moderar(file);
            if (!mod.safe())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Imagen rechazada: " + mod.reason()));
            String url = supabaseStorageService.subirImagen(file);
            return ResponseEntity.ok(ResponseDTO.success("Imagen subida", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[productos/imagen] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al subir imagen: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> eliminarProducto(@PathVariable Long id) {
        try {
            var existente = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            productoService.eliminarProducto(id);
            return ResponseEntity.ok(ResponseDTO.success("Producto eliminado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Aplicar/quitar oferta a un producto individual */
    @PatchMapping("/{id}/oferta")
    public ResponseEntity<ResponseDTO> aplicarOferta(@PathVariable Long id,
                                                      @RequestBody Map<String, Object> body) {
        try {
            Producto p = productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado"));
            companyScope.assertCanAccessNullable(p.getEmpresaId());
            boolean enOferta = Boolean.TRUE.equals(body.get("enOferta"));
            p.setEnOferta(enOferta);
            if (enOferta) {
                Integer pct = body.get("porcentajeDescuento") != null
                    ? ((Number) body.get("porcentajeDescuento")).intValue() : null;
                Integer precio = body.get("precioOferta") != null
                    ? ((Number) body.get("precioOferta")).intValue() : null;
                if (pct != null && pct > 0) {
                    p.setPorcentajeDescuento(pct);
                    p.setPrecioOferta((int) Math.round(p.getPrecioVenta() * (1 - pct / 100.0)));
                } else if (precio != null) {
                    p.setPrecioOferta(precio);
                    int diff = p.getPrecioVenta() - precio;
                    p.setPorcentajeDescuento(diff > 0 ? (int) Math.round(diff * 100.0 / p.getPrecioVenta()) : 0);
                }
            } else {
                p.setPrecioOferta(null);
                p.setPorcentajeDescuento(null);
            }
            return ResponseEntity.ok(ResponseDTO.success("Oferta actualizada", productoRepository.save(p)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Aplicar oferta a todos los productos de una categoría */
    @PostMapping("/oferta/categoria/{categoriaId}")
    @Transactional
    public ResponseEntity<ResponseDTO> aplicarOfertaCategoria(@PathVariable Long categoriaId,
                                                               @RequestBody Map<String, Object> body) {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            boolean enOferta = Boolean.TRUE.equals(body.get("enOferta"));
            Integer pct = body.get("porcentajeDescuento") != null
                ? ((Number) body.get("porcentajeDescuento")).intValue() : null;
            List<Producto> productos = empresaId != null
                ? productoRepository.findByCategoriaIdAndEmpresaId(categoriaId, empresaId)
                : productoRepository.findByCategoriaId(categoriaId);
            for (Producto p : productos) {
                p.setEnOferta(enOferta);
                if (enOferta && pct != null && pct > 0) {
                    p.setPorcentajeDescuento(pct);
                    p.setPrecioOferta((int) Math.round(p.getPrecioVenta() * (1 - pct / 100.0)));
                } else if (!enOferta) {
                    p.setPrecioOferta(null);
                    p.setPorcentajeDescuento(null);
                }
            }
            productoRepository.saveAll(productos);
            return ResponseEntity.ok(ResponseDTO.success("Oferta aplicada a " + productos.size() + " productos", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /** Productos en oferta — público */
    @GetMapping("/en-oferta")
    public ResponseEntity<ResponseDTO> enOferta() {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            List<Producto> lista = empresaId != null
                ? productoRepository.findByEnOfertaTrueAndEmpresaIdAndVisibleCatalogoTrue(empresaId)
                : productoRepository.findByEnOfertaTrueAndVisibleCatalogoTrue();
            return ResponseEntity.ok(ResponseDTO.success("Ofertas", lista));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
