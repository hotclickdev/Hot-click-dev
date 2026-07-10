package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.FinanzasReporteService;
import com.hotclick.service.TenantService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reporte de analítica financiera (IVA / contador) para emprendedores Pro+.
 * Combina ventas (POS feria + e-commerce, registradas como Pedido) con el
 * costo de mercadería vendida ya calculado por pedido (costo_total_productos),
 * y contrasta contra las compras a proveedor recibidas en el mismo período.
 */
@RestController
@RequestMapping("/api/admin/finanzas")
public class FinanzasReporteController {

    @Autowired private CompanyScope           companyScope;
    @Autowired private TenantService          tenantService;
    @Autowired private PedidoRepository       pedidoRepository;
    @Autowired private FinanzasReporteService finanzasReporteService;

    @GetMapping("/reporte-iva")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','CONTABILIDAD')")
    public ResponseEntity<?> reporteIva(
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(defaultValue = "false") boolean download,
            HttpServletResponse response) throws IOException {

        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            if (companyScope.isAdminIT()) {
                Map<String, Object> empty = new LinkedHashMap<>();
                empty.put("cantidadVentas", 0L); empty.put("ventasTotales", 0L);
                empty.put("subtotalProductos", 0L); empty.put("costoEnvio", 0L);
                empty.put("cmv", 0L); empty.put("utilidadBruta", 0L);
                empty.put("gananciaNeta", 0L); empty.put("margenPct", 0.0);
                empty.put("ivaRecaudado", 0L); empty.put("ivaEstimado", 0L);
                empty.put("comprasRecibidas", 0L);
                return ResponseEntity.ok(ResponseDTO.success("OK", empty));
            }
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida"));
        }

        if (!companyScope.isAdminIT() && !tenantService.tieneFeature("reportes"))
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "El reporte de analítica financiera requiere un plan Pro o superior. " +
                "Ve a Configuración → Suscripción para mejorar tu plan."));

        String desde = (fechaInicio != null && !fechaInicio.isBlank()) ? fechaInicio : null;
        String hasta = (fechaFin != null && !fechaFin.isBlank()) ? fechaFin : null;

        if (download) {
            exportarCsv(empresaId, desde, hasta, response);
            return null;
        }

        return ResponseEntity.ok(ResponseDTO.success("OK", finanzasReporteService.calcularKpis(empresaId, desde, hasta)));
    }

    // ── Export CSV (control contable) ───────────────────────────────────────

    private void exportarCsv(Long empresaId, String desde, String hasta,
                             HttpServletResponse response) throws IOException {

        String filename = "reporte_contador_" + (desde != null ? desde : "inicio") +
                          "_a_" + (hasta != null ? hasta : "hoy") + ".csv";

        response.setContentType("text/csv; charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        response.getOutputStream().write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF}); // BOM UTF-8 para Excel

        List<Object[]> rows = pedidoRepository.reporteIvaDetalle(empresaId, desde, hasta);

        try (PrintWriter pw = new PrintWriter(response.getOutputStream())) {
            pw.println("Fecha,Documento/Ticket,Cliente,Subtotal,IVA,Total,Metodo de Pago,Origen");
            for (Object[] r : rows) {
                pw.println(String.join(",",
                    csv(r[0]), csv(r[1]), csv(r[2]), csv(r[3]),
                    csv(r[4]), csv(r[5]), csv(r[6]), origenLabel(r[7])));
            }
            pw.flush();
        }
    }

    private String origenLabel(Object origen) {
        if (origen == null) return "Web";
        return switch (origen.toString()) {
            case "POS"    -> "POS Feria";
            case "MANUAL" -> "Manual";
            default       -> "Web";
        };
    }

    private String csv(Object v) {
        if (v == null) return "";
        String s = v.toString().replace("\"", "\"\"");
        return (s.contains(",") || s.contains("\"") || s.contains("\n")) ? "\"" + s + "\"" : s;
    }
}
