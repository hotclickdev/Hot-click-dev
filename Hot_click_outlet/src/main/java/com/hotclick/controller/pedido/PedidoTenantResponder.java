package com.hotclick.controller.pedido;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Pedido;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.function.Function;

/**
 * Busca el pedido, exige tenant y mapea 403/400. Misma orden que PedidoController.
 */
@Component
public class PedidoTenantResponder {

    @Autowired private PedidoService pedidoService;
    @Autowired private CompanyScope companyScope;

    public ResponseEntity<ResponseDTO> conAcceso(Long id, String mensajeOk, Function<Pedido, Object> accion) {
        try {
            Pedido existente = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            return ResponseEntity.ok(ResponseDTO.success(mensajeOk, accion.apply(existente)));
        } catch (TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
