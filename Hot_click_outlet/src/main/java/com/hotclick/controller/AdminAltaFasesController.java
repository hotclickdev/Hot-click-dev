package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.service.alta.AltaFasesColaService;
import com.hotclick.service.alta.AltaFasesService;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cola «Revisión HotClick»: negocios por fases con cuenta ONVO ACTIVA que esperan aprobación. Solo ADMIN de plataforma.
 * Aprobar/rechazar usa el flujo existente ({@code /api/admin/solicitudes-aprobacion/{id}/aprobar|rechazar}); aprobar
 * sin cuenta ACTIVA responde 409 {@code ALTA_CUENTA_ONVO_NO_ACTIVA}. Sin datos personales en la lista.
 */
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/admin/alta-fases")
public class AdminAltaFasesController {

    static final int MAX_COLA = 200;

    private final EmpresaCuentaOnvoRepository cuentaRepository;
    private final AltaFasesService altaFases;
    private final AltaFasesColaService colaService;

    public AdminAltaFasesController(EmpresaCuentaOnvoRepository cuentaRepository, AltaFasesService altaFases,
                                    AltaFasesColaService colaService) {
        this.colaService = colaService;
        this.cuentaRepository = cuentaRepository;
        this.altaFases = altaFases;
    }

    @GetMapping("/revision")
    public ResponseDTO revision() {
        // Una consulta para la cola (tope MAX_COLA) y lecturas en lote para cuentas y productos: sin consultas por fila.
        List<Empresa> cola = cuentaRepository.negociosEnRevision(PageRequest.of(0, MAX_COLA));
        Map<Long, Map<String, Object>> estados = colaService.estadosEnLote(cola);
        List<Map<String, Object>> filas = new java.util.ArrayList<>(cola.size());
        for (Empresa e : cola) filas.add(fila(e, estados.get(e.getId())));
        return ResponseDTO.success("Negocios en revisión HotClick", filas);
    }

    @GetMapping("/{empresaId}/estado")
    public ResponseDTO estado(@PathVariable Long empresaId) {
        return ResponseDTO.success("Estado del alta", altaFases.estadoDe(empresaId));
    }

    private Map<String, Object> fila(Empresa e, Map<String, Object> estado) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("nombre", e.getNombreComercial() != null && !e.getNombreComercial().isBlank() ? e.getNombreComercial() : e.getNombreEmpresa());
        m.put("slug", e.getSlug());
        m.put("fase", estado.get("fase"));
        m.put("cuentaOnvo", estado.get("cuentaOnvo"));
        m.put("productosActivos", estado.get("productosActivos"));
        m.put("fechaRegistro", e.getFechaRegistro());
        return m;
    }
}
