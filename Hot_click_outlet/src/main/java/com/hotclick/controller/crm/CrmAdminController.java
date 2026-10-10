package com.hotclick.controller.crm;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.crm.CrmAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** CRM admin (fase 0–1). Solo ADMIN de plataforma; lectura paginada. */
@RestController
@RequestMapping("/api/admin/crm")
@PreAuthorize("hasRole('ADMIN')")
public class CrmAdminController {

    @Autowired private CrmAdminService crmAdminService;

    @GetMapping("/compras")
    public ResponseEntity<ResponseDTO> compras(@RequestParam(required = false) Long empresaId,
                                               @RequestParam(required = false) Long compradorId,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ResponseDTO.success("Compras",
            crmAdminService.compras(empresaId, compradorId, page, size)));
    }

    @GetMapping("/compradores/{id}")
    public ResponseEntity<ResponseDTO> comprador(@PathVariable Long id,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ResponseDTO.success("Comprador", crmAdminService.fichaComprador(id, page, size)));
    }

    @GetMapping("/negocios/{id}")
    public ResponseEntity<ResponseDTO> negocio(@PathVariable Long id,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ResponseDTO.success("Negocio", crmAdminService.fichaNegocio(id, page, size)));
    }
}
