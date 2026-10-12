package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Preferencias de cobro del negocio (12-oct-2026): día de cobro de la mensualidad (28 o 13)
 * y frecuencia del pago de ventas con tarjeta (QUINCENAL o MENSUAL). Las ventas contra entrega
 * se liquidan aparte, al día siguiente, sin importar esta frecuencia.
 */
@RestController
@RequestMapping("/api/billing/preferencias")
@PreAuthorize("hasRole('EMPRENDEDOR')")
public class BillingPreferenciasController {

    static final Set<Integer> DIAS_COBRO = Set.of(13, 28);
    static final Set<String> FRECUENCIAS = Set.of("QUINCENAL", "MENSUAL");

    private final CompanyScope companyScope;
    private final EmpresaRepository empresaRepository;

    public BillingPreferenciasController(CompanyScope companyScope, EmpresaRepository empresaRepository) {
        this.companyScope = companyScope;
        this.empresaRepository = empresaRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ResponseDTO> ver() {
        return ResponseEntity.ok(ResponseDTO.success("Preferencias de cobro", mapa(empresaPropia())));
    }

    @PutMapping
    @Transactional
    public ResponseEntity<ResponseDTO> guardar(@RequestBody Map<String, Object> body) {
        Empresa e = empresaPropia();
        if (body.containsKey("diaCobro")) {
            Integer dia = body.get("diaCobro") instanceof Number n ? n.intValue() : null;
            if (dia == null || !DIAS_COBRO.contains(dia)) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("El día de cobro puede ser 28 o 13."));
            }
            e.setDiaCobro(dia);
        }
        if (body.containsKey("frecuenciaPayout")) {
            String f = body.get("frecuenciaPayout") instanceof String s ? s.trim().toUpperCase() : null;
            if (f == null || !FRECUENCIAS.contains(f)) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("La frecuencia de pago puede ser QUINCENAL o MENSUAL."));
            }
            e.setFrecuenciaPayout(f);
        }
        empresaRepository.save(e);
        return ResponseEntity.ok(ResponseDTO.success("Preferencias guardadas", mapa(e)));
    }

    private Empresa empresaPropia() {
        Long id = companyScope.requireEmpresaId();
        return empresaRepository.findById(id).orElseThrow(); // tenant-global-ok: id del scope, nunca del cliente
    }

    private static Map<String, Object> mapa(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("diaCobro", e.getDiaCobro());
        m.put("frecuenciaPayout", e.getFrecuenciaPayout());
        m.put("contraEntrega", "DIA_SIGUIENTE");
        return m;
    }
}
