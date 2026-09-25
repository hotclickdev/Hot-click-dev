package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.wallet.ComisionPrecioMath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/configuracion/comision")
public class AdminComisionController {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private CompanyScope companyScope;

    @GetMapping
    public ResponseEntity<ResponseDTO> obtener() {
        Empresa empresa = cargarEmpresa();
        return ResponseEntity.ok(ResponseDTO.success("Comisión", toMap(empresa)));
    }

    @PutMapping
    public ResponseEntity<ResponseDTO> actualizar(@RequestBody Map<String, Object> body) {
        Empresa empresa = cargarEmpresa();
        if (body.get("pctComisionTarjeta") != null) {
            empresa.setPctComisionTarjeta(new BigDecimal(body.get("pctComisionTarjeta").toString()));
        }
        if (body.get("montoFijoComisionCrc") != null) {
            empresa.setMontoFijoComisionCrc(Integer.valueOf(body.get("montoFijoComisionCrc").toString()));
        }
        if (body.get("pctDescuentoSinpe") != null) {
            empresa.setPctDescuentoSinpe(new BigDecimal(body.get("pctDescuentoSinpe").toString()));
        }
        empresaRepository.save(empresa);
        return ResponseEntity.ok(ResponseDTO.success("Comisión actualizada", toMap(empresa)));
    }

    /** Calculadora de precio sugerido (gross-up). */
    @GetMapping("/sugerido")
    public ResponseEntity<ResponseDTO> precioSugerido(@RequestParam long neto) {
        Empresa empresa = cargarEmpresa();
        long sugerido = ComisionPrecioMath.precioSugerido(
            neto, empresa.getPctComisionTarjeta(), empresa.getMontoFijoComisionCrc());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("neto", neto);
        data.put("sugerido", sugerido);
        data.put("pct", empresa.getPctComisionTarjeta());
        data.put("fijo", empresa.getMontoFijoComisionCrc());
        return ResponseEntity.ok(ResponseDTO.success("Precio sugerido", data));
    }

    private Empresa cargarEmpresa() {
        Long id = companyScope.getCurrentEmpresaIdOrOwn();
        if (id == null) {
            throw new IllegalStateException("No hay empresa en contexto");
        }
        return empresaRepository.findById(id)
            .orElseThrow(() -> new IllegalStateException("Empresa no encontrada: " + id));
    }

    private static Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("pctComisionTarjeta", e.getPctComisionTarjeta());
        m.put("montoFijoComisionCrc", e.getMontoFijoComisionCrc());
        m.put("pctDescuentoSinpe", e.getPctDescuentoSinpe());
        return m;
    }
}
