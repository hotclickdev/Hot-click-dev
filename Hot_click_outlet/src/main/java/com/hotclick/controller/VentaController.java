package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
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


@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    @Autowired private VentaService ventaService;
    @Autowired private PedidoService pedidoService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CompanyScope companyScope;

    @GetMapping
    public ResponseEntity<ResponseDTO> listarVentas(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "300") int size) {
        try {
            return ResponseEntity.ok(ResponseDTO.success("Ventas", pedidoService.listarResumenPaginado(page, size)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

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
        Long empresaId = companyScope.getCurrentEmpresaId();
        List<Usuario> todos = usuarioRepository.findAll().stream()
            .filter(u -> empresaId == null || empresaId.equals(u.getEmpresaId()))
            .collect(Collectors.toList());
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
