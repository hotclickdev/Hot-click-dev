package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.ProductoService;
import com.hotclick.service.TenantService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ProductoBulkOperationsService {

    private final ProductoRepository productoRepository;
    private final ProductoService productoService;
    private final TenantService tenantService;
    private final EmpresaRepository empresaRepository;
    private final ProductoAccessGuard productoAccessGuard;

    public ProductoBulkOperationsService(ProductoRepository productoRepository,
                                         ProductoService productoService,
                                         TenantService tenantService,
                                         EmpresaRepository empresaRepository,
                                         ProductoAccessGuard productoAccessGuard) {
        this.productoRepository = productoRepository;
        this.productoService = productoService;
        this.tenantService = tenantService;
        this.empresaRepository = empresaRepository;
        this.productoAccessGuard = productoAccessGuard;
    }

    public int archivarSinStock() {
        Long empresaId = productoAccessGuard.getCurrentEmpresaId();
        List<Producto> sinStock = empresaId != null
            ? productoRepository.findActivosSinStockByEmpresaId(empresaId)
            : productoRepository.findActivosSinStock();
        sinStock.forEach(p -> p.setEstado(0));
        productoRepository.saveAll(sinStock);
        return sinStock.size();
    }

    public int ajustarPrecios(double porcentaje) {
        double multiplicador = 1.0 + porcentaje / 100.0;
        Long empresaId = productoAccessGuard.getCurrentEmpresaId();
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
        Long empresaId = productoAccessGuard.getCurrentEmpresaIdOrOwn();
        if (empresaId != null) {
            tenantService.verificarLimiteProductosBulk(empresaId, dtos.size());
        }
        Empresa empresa = empresaId != null ? empresaRepository.findById(empresaId).orElse(null) : null;
        int ok = 0;
        int errors = 0;
        StringBuilder errMsg = new StringBuilder();
        for (int i = 0; i < dtos.size(); i++) {
            try {
                productoService.crearProducto(dtos.get(i), adminCorreo, empresa);
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
