package com.hotclick.controller.pedido;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.JwtUtil;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Guards de acceso para PedidoController.
 * Extraído bit-idéntico de PedidoController — no cambia comportamiento.
 */
@Component
public class PedidoAccessGuard {

    @Autowired private JwtUtil jwtUtil;
    @Autowired private CompanyScope companyScope;

    public Long extractUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new SecurityException("Token de autenticación requerido");
        }
        return jwtUtil.extractUserId(auth.substring(7));
    }

    /**
     * Solo ADMIN (staff de la plataforma) se salta el chequeo de companyScope.
     * EMPRENDEDOR es rol por-tenant — deben pasar por la
     * validación de empresaId más abajo, o un tenant podría leer pedidos de otro.
     */
    public boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_" + Constants.ROL_ADMIN));
    }

    public ResponseEntity<ResponseDTO> denyIfCannotView(Pedido pedido, HttpServletRequest request) {
        if (isAdmin()) return null;
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId != null) {
            // EMPRENDEDOR — debe ser dueño del pedido
            Long pedidoEmpresaId = pedido.getEmpresa() != null ? pedido.getEmpresa().getId() : null;
            if (!empresaId.equals(pedidoEmpresaId)) {
                return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
            }
        } else {
            // USUARIO_FINAL — debe ser el cliente del pedido
            Long userId = extractUserId(request);
            if (pedido.getUsuarioFinal() == null || !userId.equals(pedido.getUsuarioFinal().getId())) {
                return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
            }
        }
        return null;
    }
}
