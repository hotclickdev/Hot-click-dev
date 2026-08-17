package com.hotclick.controller;

import com.hotclick.controller.pedido.PedidoAccessGuard;
import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.dto.ResponseDTO;
import jakarta.validation.Valid;
import com.hotclick.model.Pedido;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.Map;


@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    @Autowired private PedidoService             pedidoService;
    @Autowired private NotificacionEmailService  notificacionEmailService;
    @Autowired private CompanyScope              companyScope;
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepository;
    @Autowired private InputSanitizer            sanitizer;
    @Autowired private PedidoAccessGuard         pedidoAccessGuard;

    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> crearPedidoManual(@Valid @RequestBody ManualPedidoDTO dto) {
        try {
            Long eid = companyScope.getCurrentEmpresaIdOrOwn();
            com.hotclick.model.Empresa empresa = eid != null ? empresaRepository.findById(eid).orElse(null) : null;
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

    // noRollbackFor: si el pedido no existe, buscarPorId lanza RecursoNoEncontradoException.
    // Sin esto, la excepción marca la transacción readOnly como rollback-only y, aunque el
    // catch devuelva 404, el commit falla con UnexpectedRollbackException → 500 en vez de 404.
    @Transactional(readOnly = true,
        noRollbackFor = com.hotclick.exception.RecursoNoEncontradoException.class)
    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerPedido(@PathVariable Long id, HttpServletRequest request) {
        try {
            Pedido pedido = pedidoService.buscarPorId(id);
            ResponseEntity<ResponseDTO> denied = pedidoAccessGuard.denyIfCannotView(pedido, request);
            if (denied != null) return denied;
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
        Long userId = pedidoAccessGuard.extractUserId(request);
        if (!pedidoAccessGuard.isAdmin() && !userId.equals(usuarioId)) {
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
            String nota = sanitizer.cleanWithLimit(body.get("nota"), 500);
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
            String guia = sanitizer.cleanWithLimit(body.get("numeroGuia"), 100);
            if (guia == null || guia.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Número de guía requerido"));
            Pedido existente = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            Pedido pedido = pedidoService.asignarGuia(id, guia);
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
            String guia = sanitizer.cleanWithLimit((String) body.get("guia"), 100);
            if (guia == null || guia.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("Número de guía requerido"));
            Integer costoEnvio = body.get("costoEnvio") != null
                ? ((Number) body.get("costoEnvio")).intValue() : null;
            Pedido existente = pedidoService.buscarPorId(id);
            companyScope.assertCanAccessNullable(existente.getEmpresaId());
            Pedido pedido = pedidoService.procesarEnvio(id, guia, costoEnvio);
            return ResponseEntity.ok(ResponseDTO.success("Envío procesado y cliente notificado", pedido));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/pendientes")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> listarPendientes() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        return ResponseEntity.ok(ResponseDTO.success("Pedidos pendientes",
            pedidoService.listarPendientes(empresaId)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
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
}
