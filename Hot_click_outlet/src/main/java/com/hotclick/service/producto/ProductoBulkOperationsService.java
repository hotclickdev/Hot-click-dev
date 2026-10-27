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
    private final ProductoApprovalService productoApprovalService;
    private final AuditoriaAdminRegistroService auditoriaAdminRegistroService;
    private final TenantService tenantService;
    private final EmpresaRepository empresaRepository;
    private final ProductoAccessGuard productoAccessGuard;

    public ProductoBulkOperationsService(ProductoRepository productoRepository,
                                         ProductoAltaService productoAltaService,
                                         ProductoApprovalService productoApprovalService,
                                         AuditoriaAdminRegistroService auditoriaAdminRegistroService,
                                         TenantService tenantService,
                                         EmpresaRepository empresaRepository,
                                         ProductoAccessGuard productoAccessGuard) {
        this.productoRepository = productoRepository;
        this.productoAltaService = productoAltaService;
        this.productoApprovalService = productoApprovalService;
        this.auditoriaAdminRegistroService = auditoriaAdminRegistroService;
        this.tenantService = tenantService;
        this.empresaRepository = empresaRepository;
        this.productoAccessGuard = productoAccessGuard;
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
        int ok = 0;
        int errors = 0;
        StringBuilder errMsg = new StringBuilder();
        for (int i = 0; i < dtos.size(); i++) {
            try {
                // Mismo pipeline que el alta individual (A-1): campos solo-admin, moderación,
                // reglas de publicación del negocio y auditoría de admin.
                Producto producto = productoAltaService.crearSaneado(dtos.get(i), adminCorreo, empresa);
                productoApprovalService.aplicarReglasPublicacion(producto, empresa);
                auditoriaAdminRegistroService.registrarSiAdmin("PRODUCTO_CREADO", "PRODUCTO",
                    producto.getId(), empresa.getId(), "Producto creado: " + producto.getNombreProducto());
                ok++;
            } catch (Exception e) {
                errors++;
                if (errors <= 5) {
                    errMsg.append("Fila ").append(i + 1).append(": ").append(e.getMessage()).append(". ");
                }
            }
        }
        String mensaje = "Importados: " + ok + " productos"
            + (errors > 0 ? ", errores: " + errors + ". " + errMsg : "");
        return new BulkImportResult(mensaje, Map.of("ok", ok, "errors", errors));
    }

    public record BulkImportResult(String mensaje, Map<String, Object> data) {
    }
}
