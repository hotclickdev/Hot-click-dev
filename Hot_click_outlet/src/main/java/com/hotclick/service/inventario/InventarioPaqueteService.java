package com.hotclick.service.inventario;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.inventario.InventarioLookupDTO;
import com.hotclick.dto.inventario.ImportarLineasResultado;
import com.hotclick.dto.inventario.PaqueteInventarioCreateRequest;
import com.hotclick.dto.inventario.PaqueteInventarioDTO;
import com.hotclick.dto.inventario.PaqueteLineaDTO;
import com.hotclick.dto.inventario.PaqueteLineaRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.CatalogoMaestro;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.PaqueteInventario;
import com.hotclick.model.PaqueteLinea;
import com.hotclick.model.Producto;
import com.hotclick.repository.CatalogoMaestroRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PaqueteInventarioRepository;
import com.hotclick.repository.PaqueteLineaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.ProductoService;
import com.hotclick.service.StockService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.utils.BarcodeNormalizer;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class InventarioPaqueteService {

    private static final int MAX_IMPORT_LINEAS = 500;

    private final PaqueteInventarioRepository paqueteRepo;
    private final PaqueteLineaRepository lineaRepo;
    private final EmpresaRepository empresaRepo;
    private final UsuarioRepository usuarioRepo;
    private final ProductoRepository productoRepo;
    private final CatalogoMaestroRepository catalogoRepo;
    private final CategoriaRepository categoriaRepo;
    private final ProductoService productoService;
    private final StockService stockService;
    private final SupabaseStorageService storageService;
    private final InputSanitizer sanitizer;

    public InventarioPaqueteService(
            PaqueteInventarioRepository paqueteRepo,
            PaqueteLineaRepository lineaRepo,
            EmpresaRepository empresaRepo,
            UsuarioRepository usuarioRepo,
            ProductoRepository productoRepo,
            CatalogoMaestroRepository catalogoRepo,
            CategoriaRepository categoriaRepo,
            ProductoService productoService,
            StockService stockService,
            SupabaseStorageService storageService,
            InputSanitizer sanitizer) {
        this.paqueteRepo = paqueteRepo;
        this.lineaRepo = lineaRepo;
        this.empresaRepo = empresaRepo;
        this.usuarioRepo = usuarioRepo;
        this.productoRepo = productoRepo;
        this.catalogoRepo = catalogoRepo;
        this.categoriaRepo = categoriaRepo;
        this.productoService = productoService;
        this.stockService = stockService;
        this.storageService = storageService;
        this.sanitizer = sanitizer;
    }

    @Transactional
    public PaqueteInventarioDTO crearPaquete(PaqueteInventarioCreateRequest req, String correoAdmin) {
        validarDestino(req.getEmpresaId(), req.getNombreNegocioTemporal());
        PaqueteInventario p = new PaqueteInventario();
        p.setCodigo(nuevoCodigo());
        p.setEstado(PaqueteInventario.ESTADO_ABIERTO);
        if (req.getEmpresaId() != null) {
            p.setEmpresa(empresaRepo.findById(req.getEmpresaId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", req.getEmpresaId())));
        }
        if (StringUtils.hasText(req.getNombreNegocioTemporal())) {
            p.setNombreNegocioTemporal(sanitizer.cleanWithLimit(req.getNombreNegocioTemporal(), 200));
        }
        if (req.getNotas() != null) {
            p.setNotas(sanitizer.cleanWithLimit(req.getNotas(), 2000));
        }
        usuarioRepo.findByCorreo(correoAdmin).ifPresent(p::setCreadoPor);
        return InventarioPaqueteMapper.toSummary(paqueteRepo.save(p), 0);
    }

    @Transactional(readOnly = true)
    public List<PaqueteInventarioDTO> listar() {
        return paqueteRepo.findAllByOrderByFechaCreacionDesc().stream()
                .map(p -> InventarioPaqueteMapper.toSummary(p, (int) lineaRepo.countByPaqueteId(p.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public PaqueteInventarioDTO obtener(Long id) {
        return InventarioPaqueteMapper.toDetail(cargarConLineas(id));
    }

    @Transactional
    public PaqueteLineaDTO agregarLinea(Long paqueteId, PaqueteLineaRequest request) {
        PaqueteInventario paquete = cargar(paqueteId);
        exigirEstado(paquete, PaqueteInventario.ESTADO_ABIERTO);
        String barcode = normalizeBarcode(request.getBarcode());
        if (barcode != null) {
            Optional<PaqueteLinea> existente = lineaRepo.findByPaqueteIdAndBarcode(paqueteId, barcode);
            if (existente.isPresent()) {
                return sumarStockExistente(existente.get(), request.getStock());
            }
        }
        PaqueteLinea linea = new PaqueteLinea();
        linea.setPaquete(paquete);
        InventarioPaqueteMapper.aplicarRequest(linea, request, sanitizer);
        if (linea.getEstado() == null) {
            linea.setEstado(PaqueteLinea.ESTADO_LISTO);
        }
        try {
            return PaqueteLineaDTO.from(lineaRepo.save(linea));
        } catch (DataIntegrityViolationException e) {
            return recuperarDuplicadoBarcode(paqueteId, barcode, request.getStock(), e);
        }
    }

    @Transactional
    public PaqueteLineaDTO actualizarLinea(Long paqueteId, Long lineaId, PaqueteLineaRequest request) {
        PaqueteInventario paquete = cargar(paqueteId);
        exigirEstado(paquete, PaqueteInventario.ESTADO_ABIERTO);
        PaqueteLinea linea = lineaRepo.findByIdAndPaqueteId(lineaId, paqueteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Línea", lineaId));
        String barcode = normalizeBarcode(request.getBarcode());
        if (barcode != null) {
            lineaRepo.findByPaqueteIdAndBarcode(paqueteId, barcode)
                    .filter(existente -> !existente.getId().equals(lineaId))
                    .ifPresent(existente -> {
                        throw new IllegalArgumentException(
                                "Ya existe otra línea con barcode " + barcode + " en este paquete");
                    });
        }
        InventarioPaqueteMapper.aplicarRequest(linea, request, sanitizer);
        try {
            return PaqueteLineaDTO.from(lineaRepo.save(linea));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Ya existe otra línea con ese barcode");
        }
    }

    @Transactional
    public void eliminarLinea(Long paqueteId, Long lineaId) {
        PaqueteInventario paquete = cargar(paqueteId);
        exigirEstado(paquete, PaqueteInventario.ESTADO_ABIERTO);
        PaqueteLinea linea = lineaRepo.findByIdAndPaqueteId(lineaId, paqueteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Línea", lineaId));
        lineaRepo.delete(linea);
    }

    @Transactional
    public PaqueteInventarioDTO cerrar(Long paqueteId) {
        PaqueteInventario paquete = cargar(paqueteId);
        exigirEstado(paquete, PaqueteInventario.ESTADO_ABIERTO);
        paquete.setEstado(PaqueteInventario.ESTADO_CERRADO);
        paquete.setFechaCierre(LocalDateTime.now(Constants.ZONA_CR));
        return InventarioPaqueteMapper.toSummary(paqueteRepo.save(paquete),
                (int) lineaRepo.countByPaqueteId(paqueteId));
    }

    @Transactional
    public PaqueteInventarioDTO reabrir(Long paqueteId) {
        PaqueteInventario paquete = cargar(paqueteId);
        exigirEstado(paquete, PaqueteInventario.ESTADO_CERRADO);
        paquete.setEstado(PaqueteInventario.ESTADO_ABIERTO);
        paquete.setFechaCierre(null);
        return InventarioPaqueteMapper.toSummary(paqueteRepo.save(paquete),
                (int) lineaRepo.countByPaqueteId(paqueteId));
    }

    @Transactional(readOnly = true)
    public InventarioLookupDTO lookup(String barcode, Long paqueteId) {
        String codigo = normalizeBarcode(barcode);
        if (codigo == null) {
            throw new IllegalArgumentException("barcode inválido");
        }
        Optional<PaqueteLinea> enPaquete = lineaRepo.findByPaqueteIdAndBarcode(paqueteId, codigo);
        if (enPaquete.isPresent()) {
            return fromLinea(enPaquete.get());
        }
        PaqueteInventario paquete = cargar(paqueteId);
        if (paquete.getEmpresaId() != null) {
            Optional<Producto> enEmpresa = productoRepo.findByEmpresaIdAndBarcode(paquete.getEmpresaId(), codigo);
            if (enEmpresa.isPresent()) {
                return fromProductoEmpresa(enEmpresa.get());
            }
        }
        return catalogoRepo.findByCodigoBarras(codigo)
                .map(this::fromMaestro)
                .orElseGet(() -> InventarioLookupDTO.of(InventarioLookupDTO.NUEVO));
    }

    public String subirImagen(MultipartFile file) throws IOException {
        return storageService.subirImagen(file, "inventario/paquetes");
    }

    @Transactional
    public PaqueteInventarioDTO asignar(Long paqueteId, Long empresaId, String correoAdmin) {
        PaqueteInventario paquete = paqueteRepo.findByIdWithLineasForUpdate(paqueteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Paquete", paqueteId));
        exigirEstado(paquete, PaqueteInventario.ESTADO_CERRADO);
        if (paquete.getEmpresaId() != null && !paquete.getEmpresaId().equals(empresaId)) {
            throw new IllegalArgumentException(
                    "El paquete está vinculado a otra empresa (id=" + paquete.getEmpresaId() + ")");
        }
        long conflictos = paquete.getLineas().stream()
                .filter(l -> PaqueteLinea.ESTADO_CONFLICTO.equals(l.getEstado()))
                .count();
        if (conflictos > 0) {
            throw new IllegalStateException(
                    "Hay " + conflictos + " línea(s) en CONFLICTO; resolvé antes de asignar");
        }
        long listos = paquete.getLineas().stream()
                .filter(l -> PaqueteLinea.ESTADO_LISTO.equals(l.getEstado()))
                .count();
        if (listos == 0) {
            throw new IllegalStateException("El paquete no tiene líneas LISTO para asignar");
        }
        Empresa empresa = empresaRepo.findById(empresaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        for (PaqueteLinea linea : paquete.getLineas()) {
            if (PaqueteLinea.ESTADO_LISTO.equals(linea.getEstado())) {
                materializarLinea(linea, empresa, correoAdmin, paquete.getCodigo());
            }
        }
        paquete.setEmpresa(empresa);
        paquete.setEstado(PaqueteInventario.ESTADO_ASIGNADO);
        paquete.setFechaAsignacion(LocalDateTime.now(Constants.ZONA_CR));
        return InventarioPaqueteMapper.toDetail(paqueteRepo.save(paquete));
    }

    @Transactional(readOnly = true)
    public ImportarLineasResultado previewImportar(Long paqueteId, List<PaqueteLineaRequest> lineas) {
        PaqueteInventario paquete = cargar(paqueteId);
        exigirEstado(paquete, PaqueteInventario.ESTADO_ABIERTO);
        return validarImportacion(lineas);
    }

    @Transactional
    public ImportarLineasResultado confirmarImportar(Long paqueteId, List<PaqueteLineaRequest> lineas) {
        PaqueteInventario paquete = cargar(paqueteId);
        exigirEstado(paquete, PaqueteInventario.ESTADO_ABIERTO);
        ImportarLineasResultado preview = validarImportacion(lineas);
        if (!preview.getErrores().isEmpty()) {
            return preview;
        }
        ImportarLineasResultado result = new ImportarLineasResultado();
        for (PaqueteLineaRequest req : preview.getPreview()) {
            aplicarImportLinea(paqueteId, req, result);
        }
        result.setValidas(preview.getValidas());
        return result;
    }

    private void aplicarImportLinea(Long paqueteId, PaqueteLineaRequest req, ImportarLineasResultado result) {
        String barcode = normalizeBarcode(req.getBarcode());
        if (barcode != null) {
            Optional<PaqueteLinea> existente = lineaRepo.findByPaqueteIdAndBarcode(paqueteId, barcode);
            if (existente.isPresent()) {
                sumarStockExistente(existente.get(), req.getStock());
                result.setActualizadas(result.getActualizadas() + 1);
                return;
            }
        }
        agregarLinea(paqueteId, req);
        result.setCreadas(result.getCreadas() + 1);
    }

    private ImportarLineasResultado validarImportacion(List<PaqueteLineaRequest> lineas) {
        ImportarLineasResultado result = new ImportarLineasResultado();
        if (lineas == null || lineas.isEmpty()) {
            result.getErrores().add("La lista de líneas está vacía");
            return result;
        }
        if (lineas.size() > MAX_IMPORT_LINEAS) {
            result.getErrores().add("Máximo " + MAX_IMPORT_LINEAS + " líneas por importación");
            return result;
        }
        for (int i = 0; i < lineas.size(); i++) {
            validarLineaImport(lineas.get(i), i, result);
        }
        return result;
    }

    private void validarLineaImport(PaqueteLineaRequest req, int index, ImportarLineasResultado result) {
        if (req == null || !StringUtils.hasText(req.getNombre())) {
            result.getErrores().add("Fila " + (index + 1) + ": nombre obligatorio");
            return;
        }
        if (req.getPrecioVenta() != null && req.getPrecioVenta() < 1) {
            result.getErrores().add("Fila " + (index + 1) + ": precioVenta debe ser >= 1");
            return;
        }
        if (req.getStock() != null && req.getStock() < 0) {
            result.getErrores().add("Fila " + (index + 1) + ": stock no puede ser negativo");
            return;
        }
        result.getPreview().add(req);
        result.setValidas(result.getValidas() + 1);
    }

    private void materializarLinea(PaqueteLinea linea, Empresa empresa, String correoAdmin, String codigoPkg) {
        if (StringUtils.hasText(linea.getBarcode())) {
            Optional<Producto> activo = productoRepo.findByEmpresaIdAndBarcode(
                    empresa.getId(), linea.getBarcode());
            if (activo.isPresent()) {
                reusarProducto(linea, activo.get(), correoAdmin, codigoPkg);
                return;
            }
            Optional<Producto> inactivo = productoRepo.findAnyByEmpresaIdAndBarcode(
                    empresa.getId(), linea.getBarcode());
            if (inactivo.isPresent()) {
                Producto producto = inactivo.get();
                producto.setEstado(Constants.ESTADO_ACTIVO);
                productoRepo.save(producto);
                reusarProducto(linea, producto, correoAdmin, codigoPkg);
                return;
            }
        }
        Producto creado = crearProductoDesdeLinea(linea, empresa, correoAdmin, codigoPkg);
        CatalogoMaestro maestro = resolverMaestroSoloBarcode(creado);
        if (maestro != null) {
            creado.setCatalogoMaestro(maestro);
            productoRepo.save(creado);
        }
        linea.setProducto(creado);
        lineaRepo.save(linea);
    }

    private void reusarProducto(PaqueteLinea linea, Producto producto, String correoAdmin, String codigoPkg) {
        int qty = linea.getStock() != null ? linea.getStock() : 0;
        if (qty > 0) {
            stockService.ajustarEntrada(producto.getId(), qty,
                    "Entrada paquete inventario " + codigoPkg, correoAdmin);
        }
        linea.setProducto(producto);
        lineaRepo.save(linea);
    }

    private Producto crearProductoDesdeLinea(
            PaqueteLinea linea, Empresa empresa, String correoAdmin, String codigoPkg) {
        int qty = linea.getStock() != null ? linea.getStock() : 0;
        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setNombreProducto(linea.getNombre());
        dto.setPrecioCompra(linea.getPrecioCompra() != null ? linea.getPrecioCompra() : 0);
        dto.setPrecioVenta(linea.getPrecioVenta() != null ? linea.getPrecioVenta() : 1);
        dto.setStockActual(0);
        dto.setBarcode(linea.getBarcode());
        dto.setSku(linea.getSku());
        dto.setMarcaTexto(linea.getMarcaTexto());
        dto.setImagenPrincipalUrl(linea.getImagenUrl());
        dto.setVisibleCatalogo(false);
        dto.setCategoriaId(resolverCategoriaId(linea.getCategoriaTexto(), empresa.getId()));
        Producto creado = productoService.crearProducto(dto, correoAdmin, empresa);
        if (qty > 0) {
            stockService.ajustarEntrada(creado.getId(), qty,
                    "Entrada paquete inventario " + codigoPkg, correoAdmin);
        }
        return creado;
    }

    /**
     * Solo por barcode. No usa SKU/marca (evita colisiones con MarketplaceService).
     * sku_fabricante queda null al crear maestro nuevo.
     */
    CatalogoMaestro resolverMaestroSoloBarcode(Producto producto) {
        if (!StringUtils.hasText(producto.getBarcode())) {
            return null;
        }
        Optional<CatalogoMaestro> found = catalogoRepo.findByCodigoBarras(producto.getBarcode());
        if (found.isPresent()) {
            return found.get();
        }
        CatalogoMaestro cm = new CatalogoMaestro();
        cm.setNombre(producto.getNombreProducto());
        cm.setImagenPrincipalUrl(producto.getImagenPrincipalUrl());
        cm.setCodigoBarras(producto.getBarcode());
        cm.setCategoria(producto.getCategoria());
        cm.setMarca(producto.getMarca());
        return catalogoRepo.save(cm);
    }

    private Long resolverCategoriaId(String categoriaTexto, Long empresaId) {
        if (StringUtils.hasText(categoriaTexto)) {
            Optional<Categoria> porNombre = categoriaRepo
                    .findByNombreCategoriaContainingIgnoreCaseAndEstado(categoriaTexto.trim(), Constants.ESTADO_ACTIVO)
                    .stream()
                    .filter(c -> categoriaTexto.trim().equalsIgnoreCase(c.getNombreCategoria()))
                    .findFirst();
            if (porNombre.isPresent()) {
                return porNombre.get().getId();
            }
        }
        return categoriaRepo.findByEmpresaIdOrNoEmpresaAndEstado(empresaId, Constants.ESTADO_ACTIVO).stream()
                .findFirst()
                .or(() -> categoriaRepo.findByEstado(Constants.ESTADO_ACTIVO).stream().findFirst())
                .map(Categoria::getId)
                .orElseThrow(() -> new IllegalStateException("No hay categorías activas para asignar productos"));
    }

    private PaqueteLineaDTO sumarStockExistente(PaqueteLinea linea, Integer stockExtra) {
        int extra = stockExtra != null ? stockExtra : 0;
        int actual = linea.getStock() != null ? linea.getStock() : 0;
        linea.setStock(actual + extra);
        return PaqueteLineaDTO.from(lineaRepo.save(linea));
    }

    private InventarioLookupDTO fromLinea(PaqueteLinea l) {
        InventarioLookupDTO dto = InventarioLookupDTO.of(InventarioLookupDTO.EN_PAQUETE);
        dto.setLineaId(l.getId());
        dto.setNombre(l.getNombre());
        dto.setImagenUrl(l.getImagenUrl());
        dto.setMarcaTexto(l.getMarcaTexto());
        dto.setBarcode(l.getBarcode());
        dto.setStockActual(l.getStock());
        dto.setPrecioVenta(l.getPrecioVenta());
        dto.setProductoId(l.getProductoId());
        return dto;
    }

    private InventarioLookupDTO fromProductoEmpresa(Producto p) {
        InventarioLookupDTO dto = InventarioLookupDTO.of(InventarioLookupDTO.EN_EMPRESA);
        dto.setProductoId(p.getId());
        dto.setNombre(p.getNombreProducto());
        dto.setImagenUrl(p.getImagenPrincipalUrl());
        dto.setMarcaTexto(p.getMarcaTexto());
        dto.setBarcode(p.getBarcode());
        dto.setStockActual(p.getStockActual());
        dto.setPrecioVenta(p.getPrecioVenta());
        return dto;
    }

    private InventarioLookupDTO fromMaestro(CatalogoMaestro cm) {
        InventarioLookupDTO dto = InventarioLookupDTO.of(InventarioLookupDTO.EN_MAESTRO);
        dto.setNombre(cm.getNombre());
        dto.setImagenUrl(cm.getImagenPrincipalUrl());
        dto.setBarcode(cm.getCodigoBarras());
        if (cm.getMarca() != null) {
            dto.setMarcaTexto(cm.getMarca().getNombreMarca());
        }
        return dto;
    }

    private void validarDestino(Long empresaId, String nombreTemporal) {
        if (empresaId == null && !StringUtils.hasText(nombreTemporal)) {
            throw new IllegalArgumentException("Indicá empresaId o nombreNegocioTemporal");
        }
    }

    private String nuevoCodigo() {
        return "PKG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private PaqueteInventario cargar(Long id) {
        return paqueteRepo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Paquete", id));
    }

    private PaqueteInventario cargarConLineas(Long id) {
        return paqueteRepo.findByIdWithLineas(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Paquete", id));
    }

    private void exigirEstado(PaqueteInventario p, String esperado) {
        if (!esperado.equals(p.getEstado())) {
            throw new IllegalStateException("El paquete debe estar " + esperado + " (actual: " + p.getEstado() + ")");
        }
    }

    private String normalizeBarcode(String raw) {
        if (raw == null) {
            return null;
        }
        return BarcodeNormalizer.normalize(sanitizer.cleanWithLimit(raw, 50));
    }

    private PaqueteLineaDTO recuperarDuplicadoBarcode(
            Long paqueteId, String barcode, Integer stockExtra, DataIntegrityViolationException original) {
        if (barcode == null) {
            throw original;
        }
        return lineaRepo.findByPaqueteIdAndBarcode(paqueteId, barcode)
                .map(existente -> sumarStockExistente(existente, stockExtra))
                .orElseThrow(() -> original);
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
