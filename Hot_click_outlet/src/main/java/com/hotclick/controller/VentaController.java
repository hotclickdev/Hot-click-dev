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
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/ventas")
@org.springframework.security.access.prepost.PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
public class VentaController {

    @Autowired private VentaService ventaService;
    @Autowired private PedidoService pedidoService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CompanyScope companyScope;

    @GetMapping
    public ResponseEntity<ResponseDTO> listarVentas(
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "300") int size) {
        Long empresaId = companyScope.requireEmpresaIdOrAdmin(); // IDOR-02: sin empresa → 403
        try {
            return ResponseEntity.ok(ResponseDTO.success("Ventas",
                pedidoService.listarResumenPaginadoPorEmpresa(page, size, empresaId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crearVenta(
            @RequestBody VentaRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long empresaId = companyScope.requireEmpresaId(); // sin empresa → 403 (antes 400)
        try {
            Pedido nuevo = ventaService.crearVenta(dto, userDetails.getUsername(), empresaId);
            return ResponseEntity.ok(ResponseDTO.success("Venta creada exitosamente", nuevo.getId()));
        } catch (StockInsuficienteException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @GetMapping("/clientes")
    public ResponseEntity<ResponseDTO> buscarClientes(@RequestParam(required = false) String q) {
        Long empresaId = companyScope.requireEmpresaIdOrAdmin();
        // tenant-global-ok: empresaId de requireEmpresaIdOrAdmin: null solo ADMIN
        List<Usuario> todos = empresaId != null
            ? usuarioRepository.findTop500ByEmpresaIdOrderByIdDesc(empresaId)
            : usuarioRepository.findTop500ByOrderByIdDesc();
        if (q != null && !q.isBlank()) {
            String lower = q.toLowerCase(Locale.ROOT);
            todos = todos.stream().filter(u ->
                (u.getNombre() != null && u.getNombre().toLowerCase(Locale.ROOT).contains(lower)) ||
                (u.getCorreo() != null && u.getCorreo().toLowerCase(Locale.ROOT).contains(lower))
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
