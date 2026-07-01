package com.hotclick.controller;

import com.hotclick.dto.ProductoExtraidoDto;
import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.CatalogoImportService;
import com.hotclick.service.ProductoService;
import com.hotclick.service.TenantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/importar")
public class ImportController {

    private static final Logger log = LoggerFactory.getLogger(ImportController.class);

    @Autowired private CatalogoImportService importService;
    @Autowired private ProductoService       productoService;
    @Autowired private CompanyScope          companyScope;
    @Autowired private EmpresaRepository     empresaRepository;
    @Autowired private TenantService         tenantService;

    // ── Paso 1: Extraer productos ─────────────────────────────────────────────

    @PostMapping("/url")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> extraerDeUrl(@RequestBody Map<String, String> body) {
        try {
            String url = body.getOrDefault("url", "").trim();
            List<ProductoExtraidoDto> productos = importService.extraerDeUrl(url);
            return ResponseEntity.ok(ResponseDTO.success("Extraídos " + productos.size() + " productos", productos));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[import-url] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("No se pudo acceder a la URL. Verificá que sea pública y accesible."));
        }
    }

    @PostMapping("/pdf")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> extraerDePdf(@RequestParam("archivo") MultipartFile archivo) {
        try {
            List<ProductoExtraidoDto> productos = importService.extraerDePdf(archivo);
            return ResponseEntity.ok(ResponseDTO.success("Extraídos " + productos.size() + " productos", productos));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[import-pdf] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("No se pudo procesar el PDF. Asegurate de que no esté protegido con contraseña."));
        }
    }

    @PostMapping("/csv")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> extraerDeCsv(@RequestParam("archivo") MultipartFile archivo) {
        try {
            List<ProductoExtraidoDto> productos = importService.extraerDeCsv(archivo);
            return ResponseEntity.ok(ResponseDTO.success("Extraídos " + productos.size() + " productos", productos));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[import-csv] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("No se pudo procesar el CSV."));
        }
    }

    // ── Paso 2: Confirmar importación ─────────────────────────────────────────

    @PostMapping("/confirmar")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> confirmarImportacion(
            @RequestBody List<ProductoExtraidoDto> productos) {
        try {
            if (productos == null || productos.isEmpty()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("No hay productos para importar."));
            }
            if (productos.size() > 100) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Máximo 100 productos por importación."));
            }

            Long empresaId = companyScope.getCurrentEmpresaId();
            Empresa empresa = empresaId != null
                ? empresaRepository.findById(empresaId).orElse(null)
                : null;

            tenantService.verificarLimiteProductosBulk(empresaId, productos.size());

            String adminCorreo = currentUserName();
            int ok = 0;
            List<String> errores = new ArrayList<>();

            for (ProductoExtraidoDto ext : productos) {
                try {
                    if (ext.getNombreProducto() == null || ext.getNombreProducto().isBlank()) continue;
                    if (ext.getCategoriaId() == null) {
                        errores.add(ext.getNombreProducto() + ": falta categoría");
                        continue;
                    }

                    ProductoRequestDTO dto = new ProductoRequestDTO();
                    dto.setNombreProducto(ext.getNombreProducto());
                    dto.setDescripcionCorta(ext.getDescripcionCorta());
                    dto.setPrecioVenta(ext.getPrecioVenta() != null && ext.getPrecioVenta() > 0 ? ext.getPrecioVenta() : 1);
                    dto.setPrecioCompra(ext.getPrecioCompra() != null ? ext.getPrecioCompra() : 0);
                    dto.setStockActual(ext.getStockActual() != null ? ext.getStockActual() : 0);
                    dto.setStockMinimo(0);
                    dto.setCategoriaId(ext.getCategoriaId());
                    dto.setBodegaId(ext.getBodegaId());
                    dto.setMarcaId(ext.getMarcaId());
                    dto.setMarcaTexto(ext.getMarcaTexto());
                    dto.setImagenPrincipalUrl(ext.getImagenPrincipalUrl());
                    dto.setVisibleCatalogo(true);
                    dto.setCondicion("NUEVO");

                    productoService.crearProducto(dto, adminCorreo, empresa);
                    ok++;
                } catch (Exception e) {
                    log.warn("[import-confirmar] producto '{}' falló: {}", ext.getNombreProducto(), e.getMessage());
                    errores.add(ext.getNombreProducto() + ": " + e.getMessage());
                }
            }

            String mensaje = ok + " producto(s) importado(s) correctamente.";
            if (!errores.isEmpty()) mensaje += " " + errores.size() + " con errores.";

            return ResponseEntity.ok(ResponseDTO.success(mensaje, Map.of("ok", ok, "errores", errores)));

        } catch (com.hotclick.exception.PlanLimitException e) {
            return ResponseEntity.status(402).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[import-confirmar] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al importar: " + e.getMessage()));
        }
    }

    private static String currentUserName() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "sistema";
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) return ud.getUsername();
        return principal != null ? principal.toString() : "sistema";
    }
}
