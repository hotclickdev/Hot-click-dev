package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.PedidoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    @Autowired private PedidoService pedidoService;
    @Autowired private NotificacionEmailService notificacionEmailService;

    @PostMapping
    public ResponseEntity<ResponseDTO> crearPedido(@RequestBody Pedido pedido) {
        try {
            Pedido nuevo = pedidoService.crearPedido(pedido);
            return ResponseEntity.ok(ResponseDTO.success("Pedido creado", nuevo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> obtenerPedido(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoService.buscarPorId(id);
            return ResponseEntity.ok(ResponseDTO.success("Pedido encontrado", pedido));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<ResponseDTO> pedidosPorUsuario(
            @PathVariable Long usuarioId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
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
            Pedido pedido = pedidoService.cambiarEstado(id, estado);
            return ResponseEntity.ok(ResponseDTO.success("Estado actualizado", pedido));
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
            Pedido pedido = pedidoService.asignarGuia(id, guia.trim());
            return ResponseEntity.ok(ResponseDTO.success("Guía asignada y cliente notificado", pedido));
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
            Pedido pedido = pedidoService.procesarEnvio(id, guia.trim(), costoEnvio);
            return ResponseEntity.ok(ResponseDTO.success("Envío procesado y cliente notificado", pedido));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/pendientes")
    public ResponseEntity<ResponseDTO> listarPendientes() {
        return ResponseEntity.ok(ResponseDTO.success("Pedidos pendientes", pedidoService.listarPendientes()));
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listarTodos() {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Pedidos", pedidoService.listarTodosConDetalles()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PostMapping("/{id}/notificar")
    public ResponseEntity<ResponseDTO> notificarCliente(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoService.buscarPorId(id);
            notificacionEmailService.enviarSeguimientoEstado(pedido);
            return ResponseEntity.ok(ResponseDTO.success("Notificación enviada al cliente", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminarPedido(@PathVariable Long id) {
        try {
            pedidoService.eliminarPedido(id);
            return ResponseEntity.ok(ResponseDTO.success("Pedido eliminado", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
