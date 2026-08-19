package com.hotclick.controller;

import com.hotclick.controller.pedido.PedidoAccessGuard;
import com.hotclick.controller.pedido.PedidoTenantResponder;
import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    @Autowired private PedidoService pedidoService;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private CompanyScope companyScope;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private InputSanitizer sanitizer;
    @Autowired private PedidoAccessGuard pedidoAccessGuard;
    @Autowired private PedidoTenantResponder pedidoTenantResponder;

    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<ResponseDTO> crearPedidoManual(@Valid @RequestBody ManualPedidoDTO dto) {
        try {
            Pedido nuevo = pedidoService.crearPedidoManual(dto, empresaDelScope());
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
            if (estado == null || estado.isBlank()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Estado requerido"));
            }
            String nota = sanitizer.cleanWithLimit(body.get("nota"), 500);
            return pedidoTenantResponder.conAcceso(id, "Estado actualizado",
                existente -> pedidoService.cambiarEstado(existente.getId(), estado, nota));
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
            if (guia == null || guia.isBlank()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Número de guía requerido"));
            }
            return pedidoTenantResponder.conAcceso(id, "Guía asignada y cliente notificado",
                existente -> pedidoService.asignarGuia(existente.getId(), guia));
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
            if (guia == null || guia.isBlank()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Número de guía requerido"));
            }
            Integer costoEnvio = body.get("costoEnvio") != null
                ? ((Number) body.get("costoEnvio")).intValue() : null;
            return pedidoTenantResponder.conAcceso(id, "Envío procesado y cliente notificado",
                existente -> pedidoService.procesarEnvio(existente.getId(), guia, costoEnvio));
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
            return ResponseEntity.ok(ResponseDTO.success("Pedidos", listarConDetalles()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/notificar")
    public ResponseEntity<ResponseDTO> notificarCliente(@PathVariable Long id) {
        return pedidoTenantResponder.conAcceso(id, "Email enviado al cliente", existente -> {
            notificacionEmailService.enviarSeguimientoEstadoSync(existente, null);
            return null;
        });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminarPedido(@PathVariable Long id) {
        return pedidoTenantResponder.conAcceso(id, "Pedido eliminado", existente -> {
            pedidoService.eliminarPedido(existente.getId());
            return null;
        });
    }

    private Empresa empresaDelScope() {
        Long eid = companyScope.getCurrentEmpresaIdOrOwn();
        return eid != null ? empresaRepository.findById(eid).orElse(null) : null;
    }

    private Object listarConDetalles() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        return empresaId != null
            ? pedidoService.listarTodosConDetallesByEmpresa(empresaId)
            : pedidoService.listarTodosConDetalles();
    }
}
