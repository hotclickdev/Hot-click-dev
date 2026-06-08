package com.hotclick.controller;

import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/asignar")
@PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE')")
public class AdminAsignarController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository     rolRepository;
    @Autowired private PedidoService     pedidoService;
    @Autowired private PasswordEncoder   passwordEncoder;
    @Autowired private CompanyScope      companyScope;
    @Autowired private EmpresaRepository empresaRepository;

    /** Busca clientes por nombre, correo o teléfono (mínimo 2 caracteres). */
    @GetMapping("/buscar-cliente")
    public ResponseDTO buscarCliente(@RequestParam String q) {
        if (q == null || q.trim().length() < 2) {
            return ResponseDTO.success("Resultados", List.of());
        }
        return ResponseDTO.success("Resultados", usuarioRepository.buscarClientes(q.trim()));
    }

    /**
     * Crea un cliente rápido con nombre + correo/teléfono.
     * Se genera contraseña aleatoria no usable; el usuario puede luego
     * vincular su cuenta vía Clerk (OAuth).
     */
    @PostMapping("/crear-cliente")
    public ResponseEntity<ResponseDTO> crearCliente(@RequestBody Map<String, String> body) {
        try {
            String nombre   = body.getOrDefault("nombre",   "").trim();
            String apellido = body.getOrDefault("apellido", "").trim();
            String correo   = body.getOrDefault("correo",   "").trim();
            String telefono = body.getOrDefault("telefono", "").trim();

            if (nombre.isBlank()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));
            }
            if (correo.isBlank() && telefono.isBlank()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Se requiere correo o teléfono"));
            }

            String correoFinal = correo.isBlank()
                ? "tel_" + telefono.replaceAll("[^0-9]", "") + "_" + UUID.randomUUID().toString().substring(0, 6) + "@hotclick.noemail"
                : correo;

            if (usuarioRepository.existsByCorreo(correoFinal)) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Ya existe un usuario con ese correo"));
            }

            String ident = telefono.isBlank()
                ? "HC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase()
                : telefono.substring(0, Math.min(telefono.length(), 20));

            if (usuarioRepository.existsByIdentificacion(ident)) {
                ident = "HC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
            }

            Usuario usuario = new Usuario();
            usuario.setNombre(nombre);
            usuario.setApellidoPaterno(apellido.isBlank() ? "." : apellido);
            usuario.setCorreo(correoFinal);
            usuario.setTelefono(telefono.isBlank() ? "0000" : telefono);
            usuario.setIdentificacion(ident);
            usuario.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            usuario.setFechaRegistro(LocalDateTime.now());
            usuario.setEstado(Constants.ESTADO_ACTIVO);
            usuario.setIntentosFallidos(0);

            Optional<Rol> rolOpt = rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL);
            rolOpt.ifPresent(rol -> usuario.getRoles().add(rol));

            Usuario saved = usuarioRepository.save(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Cliente creado", saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /**
     * Registra una compra externa en la cuenta del usuario.
     * Crea un pedido con origen=ASIGNACION_MANUAL y estado=ENTREGADO
     * para que aparezca en mis-pedidos, reseñas y garantías.
     */
    @PostMapping("/compra")
    public ResponseEntity<ResponseDTO> asignarCompra(@RequestBody Map<String, Object> body) {
        try {
            Long   usuarioId  = Long.parseLong(body.get("usuarioId").toString());
            String metodoPago = body.getOrDefault("metodoPago", "EXTERNO").toString();
            String notas      = body.getOrDefault("notas", "Compra registrada manualmente desde admin").toString();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsRaw = (List<Map<String, Object>>) body.get("items");

            if (itemsRaw == null || itemsRaw.isEmpty()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Debe agregar al menos un producto"));
            }

            ManualPedidoDTO dto = new ManualPedidoDTO();
            dto.setUsuarioId(usuarioId);
            dto.setBodegaId(1L);
            dto.setMetodoEnvio(Constants.ENVIO_RETIRO);
            dto.setMetodoPago(metodoPago);
            dto.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
            dto.setOrigen("ASIGNACION_MANUAL");
            dto.setNotas(notas);
            dto.setCostoEnvio(0);

            List<ManualPedidoDTO.ItemDTO> items = itemsRaw.stream().map(raw -> {
                ManualPedidoDTO.ItemDTO item = new ManualPedidoDTO.ItemDTO();
                item.setProductoId(Long.parseLong(raw.get("productoId").toString()));
                item.setCantidad(Integer.parseInt(raw.get("cantidad").toString()));
                item.setPrecioUnitario(Integer.parseInt(raw.get("precioUnitario").toString()));
                return item;
            }).toList();
            dto.setItems(items);

            com.hotclick.model.Empresa empresa = companyScope.getCurrentEmpresaId() != null
                ? empresaRepository.findById(companyScope.getCurrentEmpresaId()).orElse(null)
                : null;

            com.hotclick.model.Pedido pedido = pedidoService.crearPedidoManual(dto, empresa);
            return ResponseEntity.ok(ResponseDTO.success("Compra registrada correctamente", pedido));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
