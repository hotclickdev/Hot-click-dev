package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.VentaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    @Autowired private VentaService ventaService;
    @Autowired private UsuarioRepository usuarioRepository;

    @PostMapping
    public ResponseEntity<ResponseDTO> crearVenta(
            @RequestBody VentaRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            Pedido nuevo = ventaService.crearVenta(dto, userDetails.getUsername());
            return ResponseEntity.ok(ResponseDTO.success("Venta creada exitosamente", nuevo.getId()));
        } catch (StockInsuficienteException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/clientes")
    public ResponseEntity<ResponseDTO> buscarClientes(@RequestParam(required = false) String q) {
        List<Usuario> todos = usuarioRepository.findAll();
        if (q != null && !q.isBlank()) {
            String lower = q.toLowerCase();
            todos = todos.stream().filter(u ->
                (u.getNombre() != null && u.getNombre().toLowerCase().contains(lower)) ||
                (u.getCorreo() != null && u.getCorreo().toLowerCase().contains(lower))
            ).collect(Collectors.toList());
        }
        List<Map<String, Object>> resultado = todos.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",       u.getId());
            m.put("nombre",   u.getNombre()   != null ? u.getNombre()   : "");
            m.put("correo",   u.getCorreo()   != null ? u.getCorreo()   : "");
            m.put("telefono", u.getTelefono() != null ? u.getTelefono() : "");
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(ResponseDTO.success("Clientes", resultado));
    }
}
