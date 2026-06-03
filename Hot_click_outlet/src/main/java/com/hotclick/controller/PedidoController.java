package com.hotclick.controller;

import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.dto.ResponseDTO;
import jakarta.validation.Valid;
import com.hotclick.model.Pedido;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;


@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    @Autowired private PedidoService             pedidoService;
    @Autowired private NotificacionEmailService  notificacionEmailService;
    @Autowired private JwtUtil                   jwtUtil;
    @Autowired private CompanyScope              companyScope;
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepository;

    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE') or hasAuthority('SCOPE_write:pedidos')")
    public ResponseEntity<ResponseDTO> crearPedidoManual(@Valid @RequestBody ManualPedidoDTO dto) {
        try {
            com.hotclick.model.Empresa empresa = companyScope.getCurrentEmpresaId() != null
                ? empresaRepository.findById(companyScope.getCurrentEmpresaId()).orElse(null) : null;
            Pedido nuevo = pedidoService.crearPedidoManual(dto, empresa);
            return ResponseEntity.ok(ResponseDTO.success("Pedido creado", nuevo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crearPedido(@RequestBody Pedido pedido) {
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        try {
            Pedido nuevo = pedidoService.crearPedido(pedido);
            return ResponseEntity.ok(ResponseDTO.success("Pedido creado", nuevo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerPedido(@PathVariable Long id, HttpServletRequest request) {
        try {
            Pedido pedido = pedidoService.buscarPorId(id);
            if (!isAdmin()) {
                Long empresaId = companyScope.getCurrentEmpresaId();
                if (empresaId != null) {
                    // EMPRENDEDOR / ADMIN_CLIENTE — debe ser dueño del pedido
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
            }
            return ResponseEntity.ok(ResponseDTO.success("Pedido encontrado", pedido));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<ResponseDTO> pedidosPorUsuario(
            @PathVariable Long usuarioId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest request) {
        Long userId = extractUserId(request);
        if (!isAdmin() && !userId.equals(usuarioId)) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        }
        var pedidos = pedidoService.listarPorUsuario(usuarioId, PageRequest.of(page, size));
        return ResponseEntity.ok(ResponseDTO.success("Pedidos obtenidos", pedidos));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String estado = body.get("estado");
            if (estado == null || estado.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Estado requerido"));
            String nota = body.get("nota");
            Pedido existente = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            Pedido pedido = pedidoService.cambiarEstado(id, estado, nota);
            return ResponseEntity.ok(ResponseDTO.success("Estado actualizado", pedido));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/guia")
    public ResponseEntity<ResponseDTO> asignarGuia(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String guia = body.get("numeroGuia");
            if (guia == null || guia.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Número de guía requerido"));
            Pedido existente = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            Pedido pedido = pedidoService.asignarGuia(id, guia.trim());
            return ResponseEntity.ok(ResponseDTO.success("Guía asignada y cliente notificado", pedido));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}/envio")
    public ResponseEntity<ResponseDTO> procesarEnvio(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            String guia = (String) body.get("guia");
            if (guia == null || guia.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Número de guía requerido"));
            Integer costoEnvio = body.get("costoEnvio") != null
                ? ((Number) body.get("costoEnvio")).intValue() : null;
            Pedido existente = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            Pedido pedido = pedidoService.procesarEnvio(id, guia.trim(), costoEnvio);
            return ResponseEntity.ok(ResponseDTO.success("Envío procesado y cliente notificado", pedido));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/pendientes")
    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE') or hasAuthority('SCOPE_read:pedidos')")
    public ResponseEntity<ResponseDTO> listarPendientes() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        return ResponseEntity.ok(ResponseDTO.success("Pedidos pendientes",
            pedidoService.listarPendientes(empresaId)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE') or hasAuthority('SCOPE_read:pedidos')")
    public ResponseEntity<ResponseDTO> listarTodos() {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            var resultado = empresaId != null
                ? pedidoService.listarTodosConDetallesByEmpresa(empresaId)
                : pedidoService.listarTodosConDetalles();
            return ResponseEntity.ok(ResponseDTO.success("Pedidos", resultado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/notificar")
    public ResponseEntity<ResponseDTO> notificarCliente(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(pedido.getEmpresaId());
            notificacionEmailService.enviarSeguimientoEstadoSync(pedido, null);
            return ResponseEntity.ok(ResponseDTO.success("Email enviado al cliente", null));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminarPedido(@PathVariable Long id) {
        try {
            Pedido existente = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            pedidoService.eliminarPedido(id);
            return ResponseEntity.ok(ResponseDTO.success("Pedido eliminado", null));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    private Long extractUserId(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new SecurityException("Token de autenticación requerido");
        }
        return jwtUtil.extractUserId(auth.substring(7));
    }

    private boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_" + Constants.ROL_ADMIN_IT) ||
                           a.getAuthority().equals("ROLE_" + Constants.ROL_ADMIN_CLIENTE) ||
                           a.getAuthority().equals("ROLE_" + Constants.ROL_EMPRENDEDOR));
    }
}
