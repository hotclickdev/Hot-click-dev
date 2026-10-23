package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.PosSinpeConfirmacion;
import com.hotclick.repository.PosSinpeConfirmacionRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lista de revisión de las confirmaciones manuales de SINPE hechas en caja (POS QR).
 * Solo ADMIN y EMPRENDEDOR (dueño del negocio), mismo patrón que pedido-manual: el permiso {@value #PERMISO}
 * se asigna a esos roles en V186, pero no abre la ruta a otros roles (cajero/vendedor → 403).
 * El negocio ve solo las suyas; pedir otra empresa ({@code empresaId}) → 403. ADMIN sin impersonar ve todas.
 */
@RestController
@RequestMapping(AdminPosSinpeController.RUTA)
public class AdminPosSinpeController {

    public static final String RUTA = "/api/admin/pos/sinpe-confirmaciones";
    public static final String PERMISO = "pos.sinpe.revisar";
    private static final int TAMANO_MAX = 100;

    @Autowired private PosSinpeConfirmacionRepository repo;
    @Autowired private CompanyScope companyScope;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> listar(@RequestParam(defaultValue = "0") int pagina,
                                              @RequestParam(defaultValue = "20") int tamano,
                                              @RequestParam(required = false) Long empresaId) {
        PageRequest pr = PageRequest.of(Math.max(0, pagina), Math.min(Math.max(1, tamano), TAMANO_MAX));
        Long scope = companyScope.requireEmpresaIdOrAdmin();
        if (empresaId != null) {
            // Aislamiento por empresa: solo la propia (ADMIN de plataforma sin impersonar puede elegir).
            companyScope.assertCanAccess(empresaId);
            scope = empresaId;
        }
        Page<PosSinpeConfirmacion> page = scope == null
            ? repo.findAllByOrderByFechaConfirmacionDesc(pr)
            : repo.findByEmpresaIdOrderByFechaConfirmacionDesc(scope, pr);
        return ResponseEntity.ok(ResponseDTO.success("Confirmaciones manuales de SINPE", java.util.Map.of(
            "items", page.getContent(), "total", page.getTotalElements(), "pagina", page.getNumber())));
    }
}
