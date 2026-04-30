package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.service.PedidoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    @Autowired
    private PedidoService pedidoService;

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
            @RequestParam String estado) {
        try {
            Pedido pedido = pedidoService.cambiarEstado(id, estado);
            return ResponseEntity.ok(ResponseDTO.success("Estado actualizado", pedido));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/pendientes")
    public ResponseEntity<ResponseDTO> listarPendientes() {
        return ResponseEntity.ok(ResponseDTO.success("Pedidos pendientes", pedidoService.listarPendientes()));
    }
}
