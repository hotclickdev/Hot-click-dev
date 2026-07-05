package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/multipais")
public class MultipaisController {

    private static final Logger log = LoggerFactory.getLogger(MultipaisController.class);

    // Supported LATAM countries/currencies
    private static final List<Map<String, String>> PAISES = List.of(
        Map.of("codigo", "CR", "nombre", "Costa Rica",   "moneda", "CRC", "locale", "es-CR", "bandera", "🇨🇷"),
        Map.of("codigo", "MX", "nombre", "México",        "moneda", "MXN", "locale", "es-MX", "bandera", "🇲🇽"),
        Map.of("codigo", "CO", "nombre", "Colombia",      "moneda", "COP", "locale", "es-CO", "bandera", "🇨🇴"),
        Map.of("codigo", "PE", "nombre", "Perú",          "moneda", "PEN", "locale", "es-PE", "bandera", "🇵🇪"),
        Map.of("codigo", "GT", "nombre", "Guatemala",     "moneda", "GTQ", "locale", "es-GT", "bandera", "🇬🇹"),
        Map.of("codigo", "HN", "nombre", "Honduras",      "moneda", "HNL", "locale", "es-HN", "bandera", "🇭🇳"),
        Map.of("codigo", "US", "nombre", "Estados Unidos","moneda", "USD", "locale", "en-US", "bandera", "🇺🇸"),
        Map.of("codigo", "PA", "nombre", "Panamá",        "moneda", "USD", "locale", "es-PA", "bandera", "🇵🇦"),
        Map.of("codigo", "SV", "nombre", "El Salvador",   "moneda", "USD", "locale", "es-SV", "bandera", "🇸🇻"),
        Map.of("codigo", "NI", "nombre", "Nicaragua",     "moneda", "NIO", "locale", "es-NI", "bandera", "🇳🇮")
    );

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private JdbcTemplate      jdbc;

    /** Returns supported countries list. Public — used by registration and branding. */
    @GetMapping("/paises")
    public ResponseEntity<?> paises() {
        return ResponseEntity.ok(PAISES);
    }

    /** Returns exchange rates for display. */
    @GetMapping("/tasas")
    public ResponseEntity<?> tasas() {
        String sql = "SELECT moneda_desde, moneda_hacia, tasa, fecha_vigencia FROM hot_click_tasa_cambio_tb ORDER BY moneda_hacia";
        return ResponseEntity.ok(jdbc.queryForList(sql));
    }

    /** Gets current LATAM config for the empresa. */
    @GetMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getConfig() {
        Long empresaId = TenantContext.get();
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toConfigMap(empresa));
    }

    /** Updates LATAM config for the empresa. */
    @PutMapping("/config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateConfig(@RequestBody Map<String, Object> body) {
        Long empresaId = TenantContext.get();
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        if (empresa == null) return ResponseEntity.notFound().build();

        if (body.containsKey("paisOperacion"))     empresa.setPaisOperacion(str(body, "paisOperacion"));
        if (body.containsKey("monedaDefecto"))      empresa.setMonedaDefecto(str(body, "monedaDefecto"));
        if (body.containsKey("monedaFacturacion"))  empresa.setMonedaFacturacion(str(body, "monedaFacturacion"));
        if (body.containsKey("localeCodigo"))       empresa.setLocaleCodigo(str(body, "localeCodigo"));
        if (body.containsKey("taxRatePct")) {
            try { empresa.setTaxRatePct(new BigDecimal(body.get("taxRatePct").toString())); } catch (Exception e) { log.warn("taxRatePct parse error: {}", e.getMessage()); }
        }
        empresaRepository.save(empresa);
        return ResponseEntity.ok(toConfigMap(empresa));
    }

    private Map<String, Object> toConfigMap(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("paisOperacion",    e.getPaisOperacion());
        m.put("monedaDefecto",    e.getMonedaDefecto());
        m.put("monedaFacturacion", e.getMonedaFacturacion());
        m.put("localeCodigo",     e.getLocaleCodigo());
        m.put("taxRatePct",       e.getTaxRatePct());
        // Find matching country info
        PAISES.stream().filter(p -> e.getPaisOperacion() != null && e.getPaisOperacion().equals(p.get("codigo")))
            .findFirst().ifPresent(p -> {
                m.put("paisNombre",  p.get("nombre"));
                m.put("bandera",     p.get("bandera"));
            });
        return m;
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }
}
