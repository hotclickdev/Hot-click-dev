package com.hotclick.service;

import com.hotclick.dto.ReporteProductoCreateRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.model.ReporteProducto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.ReporteProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ReporteProductoService {

    private static final Logger log = LoggerFactory.getLogger(ReporteProductoService.class);
    private static final int UMBRAL_AUTO_PAUSA = 3;

    private static final Set<String> MOTIVOS = Set.of(
        "CONTENIDO_INAPROPIADO",
        "PRODUCTO_FALSO",
        "PRECIO_ENGANOSO",
        "SPAM",
        "OTRO"
    );

    private final ReporteProductoRepository repo;
    private final ProductoRepository productoRepository;
    private final CompanyScope companyScope;
    private final InputSanitizer sanitizer;
    private final ModeracionAdminAvisoService moderacionAdminAvisoService;
    private final ModeracionAvisoService moderacionAvisoService;

    public ReporteProductoService(
            ReporteProductoRepository repo,
            ProductoRepository productoRepository,
            CompanyScope companyScope,
            InputSanitizer sanitizer,
            ModeracionAdminAvisoService moderacionAdminAvisoService,
            ModeracionAvisoService moderacionAvisoService) {
        this.repo = repo;
        this.productoRepository = productoRepository;
        this.companyScope = companyScope;
        this.sanitizer = sanitizer;
        this.moderacionAdminAvisoService = moderacionAdminAvisoService;
        this.moderacionAvisoService = moderacionAvisoService;
    }

    @Transactional
    public Map<String, Object> crear(ReporteProductoCreateRequest req) {
        if (!MOTIVOS.contains(req.getMotivo())) {
            throw new IllegalArgumentException("Motivo de reporte inválido");
        }
        Producto producto = productoRepository.findById(req.getProductoId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", req.getProductoId()));
        ReporteProducto r = new ReporteProducto();
        r.setProducto(producto);
        r.setUsuario(companyScope.getCurrentUser());
        r.setMotivo(req.getMotivo());
        if (req.getDetalle() != null && !req.getDetalle().isBlank()) {
            r.setDetalle(sanitizer.cleanWithLimit(req.getDetalle(), 2000));
        }
        ReporteProducto guardado = repo.save(r);
        moderacionAdminAvisoService.avisarReporteProducto(
            guardado.getId(), producto.getNombreProducto());
        autoPausarSiCorresponde(producto);
        return toMap(guardado);
    }

    private void autoPausarSiCorresponde(Producto producto) {
        long pendientes = repo.countByProducto_IdAndEstado(producto.getId(), ReporteProducto.PENDIENTE);
        boolean visible = !Boolean.FALSE.equals(producto.getVisibleCatalogo());
        if (pendientes < UMBRAL_AUTO_PAUSA || !visible) {
            return;
        }
        producto.setVisibleCatalogo(false);
        productoRepository.save(producto);
        log.info("[moderacion] Producto {} pausado automáticamente — {} reportes pendientes",
            producto.getId(), pendientes);
        moderacionAvisoService.avisarProductoModerado(
            producto.getEmpresaId(), producto.getNombreProducto(), true,
            "Pausado automáticamente: " + pendientes + " reportes pendientes");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarPendientes() {
        return repo.findByEstadoConProducto(ReporteProducto.PENDIENTE).stream()
            .map(this::toMap)
            .toList();
    }

    @Transactional
    public Map<String, Object> resolver(Long id, String estado, String notasAdmin, boolean pausarProducto) {
        if (!ReporteProducto.RESUELTO.equals(estado) && !ReporteProducto.DESCARTADO.equals(estado)) {
            throw new IllegalArgumentException("Estado inválido");
        }
        ReporteProducto r = repo.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Reporte", id));
        if (!ReporteProducto.PENDIENTE.equals(r.getEstado())) {
            throw new IllegalStateException("Este reporte ya fue resuelto");
        }
        r.setEstado(estado);
        r.setFechaResolucion(LocalDateTime.now(Constants.ZONA_CR));
        String notas = null;
        if (notasAdmin != null && !notasAdmin.isBlank()) {
            notas = sanitizer.cleanWithLimit(notasAdmin, 1000);
            r.setNotasAdmin(notas);
        }

        boolean pausado = false;
        Producto producto = r.getProducto();
        // null se trata como visible (default del modelo)
        boolean estabaVisible = producto != null && !Boolean.FALSE.equals(producto.getVisibleCatalogo());
        if (pausarProducto && estabaVisible) {
            producto.setVisibleCatalogo(false);
            productoRepository.save(producto);
            pausado = true;
        }

        Map<String, Object> out = toMap(repo.save(r));
        if (pausado || (notas != null && !notas.isBlank())) {
            Long empresaId = producto != null ? producto.getEmpresaId() : null;
            String nombre = producto != null ? producto.getNombreProducto() : "Producto";
            moderacionAvisoService.avisarProductoModerado(empresaId, nombre, pausado, notas);
        }
        return out;
    }

    private Map<String, Object> toMap(ReporteProducto r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("motivo", r.getMotivo());
        m.put("detalle", r.getDetalle());
        m.put("estado", r.getEstado());
        m.put("notasAdmin", r.getNotasAdmin());
        m.put("fechaCreacion", r.getFechaCreacion());
        m.put("fechaResolucion", r.getFechaResolucion());
        if (r.getProducto() != null) {
            m.put("productoId", r.getProducto().getId());
            m.put("productoNombre", r.getProducto().getNombreProducto());
            m.put("imagenUrl", r.getProducto().getImagenPrincipalUrl());
            m.put("visibleCatalogo", r.getProducto().getVisibleCatalogo());
            m.put("empresaId", r.getProducto().getEmpresaId());
        }
        Usuario u = r.getUsuario();
        if (u != null) {
            m.put("usuarioNombre", u.getNombre());
            m.put("usuarioCorreo", u.getCorreo());
        }
        return m;
    }
}
