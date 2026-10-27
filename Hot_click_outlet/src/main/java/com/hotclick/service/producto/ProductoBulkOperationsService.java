package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.TenantService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ProductoBulkOperationsService {

    private final ProductoRepository productoRepository;
    private final ProductoAltaService productoAltaService;
    private final AuditoriaAdminRegistroService auditoriaAdminRegistroService;
    private final TenantService tenantService;
    private final EmpresaRepository empresaRepository;
    private final ProductoAccessGuard productoAccessGuard;
    private final BodegaTenantGuard bodegaTenantGuard;

    public ProductoBulkOperationsService(ProductoRepository productoRepository,
                                         ProductoAltaService productoAltaService,
                                         AuditoriaAdminRegistroService auditoriaAdminRegistroService,
                                         TenantService tenantService,
                                         EmpresaRepository empresaRepository,
                                         ProductoAccessGuard productoAccessGuard,
                                         BodegaTenantGuard bodegaTenantGuard) {
        this.productoRepository = productoRepository;
        this.productoAltaService = productoAltaService;
        this.auditoriaAdminRegistroService = auditoriaAdminRegistroService;
        this.tenantService = tenantService;
        this.empresaRepository = empresaRepository;
        this.productoAccessGuard = productoAccessGuard;
        this.bodegaTenantGuard = bodegaTenantGuard;
    }

    public int archivarSinStock() {
        Long empresaId = productoAccessGuard.requireEmpresaIdOrAdmin();
        // tenant-global-ok: empresaId de requireEmpresaIdOrAdmin: null solo ADMIN
        List<Producto> sinStock = empresaId != null
            ? productoRepository.findActivosSinStockByEmpresaId(empresaId)
            : productoRepository.findActivosSinStock();
        sinStock.forEach(p -> p.setEstado(0));
        productoRepository.saveAll(sinStock);
        return sinStock.size();
    }

    public int ajustarPrecios(double porcentaje) {
        double multiplicador = 1.0 + porcentaje / 100.0;
        Long empresaId = productoAccessGuard.requireEmpresaIdOrAdmin();
        // tenant-global-ok: ajustar-precios es solo ADMIN y usa requireEmpresaIdOrAdmin
        List<Producto> productos = empresaId != null
            ? productoRepository.findActivosByEmpresaId(empresaId)
            : productoRepository.findAllActivos();
        int actualizados = 0;
        for (Producto producto : productos) {
            if (producto.getPrecioVenta() != null) {
                producto.setPrecioVenta((int) Math.round(producto.getPrecioVenta() * multiplicador));
                actualizados++;
            }
        }
        productoRepository.saveAll(productos);
        return actualizados;
    }

    public BulkImportResult importar(List<ProductoRequestDTO> dtos, String adminCorreo) {
        // IDOR-09: la empresa sale siempre de la sesión; sin empresa → 403 (nunca productos huérfanos)
        Long empresaId = productoAccessGuard.requireEmpresaId();
        tenantService.verificarLimiteProductosBulk(empresaId, dtos.size());
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new com.hotclick.exception.EmpresaRequeridaException());
        // Todo el lote se rechaza (sin crear nada) si alguna fila apunta a una bodega que no es del negocio.
        // Misma respuesta que una bodega inexistente: no revela si existe ni de quién es.
        dtos.stream().map(ProductoRequestDTO::getBodegaId).filter(java.util.Objects::nonNull).distinct()
            .forEach(id -> bodegaTenantGuard.exigirDeLaEmpresa(id, empresaId));
        int ok = 0;
        int errors = 0;
        int avisos = 0;
        StringBuilder errMsg = new StringBuilder();
        for (int i = 0; i < dtos.size(); i++) {
            try {
                // Mismo pipeline que el alta individual (A-1): campos solo-admin, moderación,
                // reglas de publicación del negocio y auditoría de admin.
                // Alta + reglas de publicación atómicas (una transacción): si fallan, no queda producto.
                Producto producto = productoAltaService.crearYPublicar(dtos.get(i), adminCorreo, empresa).producto();
                // El producto ya está confirmado: un fallo de auditoría no es un error de la fila (un reintento duplicaría).
                ok++;
                try {
                    auditoriaAdminRegistroService.registrarSiAdmin("PRODUCTO_CREADO", "PRODUCTO",
                        producto.getId(), empresa.getId(), "Producto creado: " + producto.getNombreProducto());
                } catch (Exception posterior) {
                    avisos++;
                }
            } catch (Exception e) {
                errors++;
                if (errors <= 5) {
                    errMsg.append("Fila ").append(i + 1).append(": ").append(e.getMessage()).append(". ");
                }
            }
        }
        String mensaje = "Importados: " + ok + " productos"
            + (errors > 0 ? ", errores: " + errors + ". " + errMsg : "")
            + (avisos > 0 ? " (" + avisos + " creados con la auditoría fallida: no los reimportes)" : "");
        return new BulkImportResult(mensaje, Map.of("ok", ok, "errors", errors));
    }

    public record BulkImportResult(String mensaje, Map<String, Object> data) {
    }
}
