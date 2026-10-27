package com.hotclick.controller;

import com.hotclick.model.OrigenPedido;
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
/**
 * Asignar compras externas a clientes. Lo usa el vendedor (/admin/asignar-compra) para SUS clientes:
 * todo va acotado a su empresa (CompanyScope). Solo un ADMIN de plataforma sin impersonar busca global.
 * P9-01: antes devolvía la entidad Usuario de todos los compradores a cualquier EMPRENDEDOR.
 */
@PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
public class AdminAsignarController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository     rolRepository;
    @Autowired private PedidoService     pedidoService;
    @Autowired private PasswordEncoder   passwordEncoder;
    @Autowired private CompanyScope      companyScope;
    @Autowired private EmpresaRepository empresaRepository;

    static final int MIN_CARACTERES_Q = 3;
    static final int MAX_RESULTADOS = 20;

    /** Busca clientes de la empresa por nombre, correo o teléfono (mínimo 3 caracteres, máximo 20). */
    @GetMapping("/buscar-cliente")
    public ResponseEntity<ResponseDTO> buscarCliente(@RequestParam(required = false) String q) {
        Long empresaId = companyScope.requireEmpresaIdOrAdmin();
        if (q == null) { // sin el parámetro: error del cliente (400), no 500
            return ResponseEntity.badRequest().body(ResponseDTO.error("Falta el texto a buscar (q)."));
        }
        if (q.trim().length() < MIN_CARACTERES_Q) {
            return ResponseEntity.ok(ResponseDTO.success("Resultados", List.of()));
        }
        String texto = q.trim();
        org.springframework.data.domain.Pageable top = org.springframework.data.domain.PageRequest.of(0, MAX_RESULTADOS);
        List<Usuario> encontrados = empresaId == null // tenant-global-ok: requireEmpresaIdOrAdmin, null solo ADMIN
            ? usuarioRepository.buscarClientes(texto, top)
            : usuarioRepository.buscarClientesByEmpresa(texto, empresaId, top);
        return ResponseEntity.ok(ResponseDTO.success("Resultados",
            encontrados.stream().map(AdminAsignarController::resumen).toList()));
    }

    /** DTO mínimo: lo que muestra BuscarCliente.tsx. Nada de cédula, Clerk ID, notas ni crédito. */
    static Map<String, Object> resumen(Usuario u) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("nombre", u.getNombre());
        m.put("apellidoPaterno", u.getApellidoPaterno());
        m.put("correo", u.getCorreo());
        m.put("telefono", u.getTelefono());
        return m;
    }

    /**
     * Crea un cliente rápido con nombre + correo/teléfono.
     * Se genera contraseña aleatoria no usable; el usuario puede luego
     * vincular su cuenta vía Clerk (OAuth).
     */
    @PostMapping("/crear-cliente")
    public ResponseEntity<ResponseDTO> crearCliente(@RequestBody Map<String, String> body) {
        Long eid = companyScope.requireEmpresaIdOrAdmin();
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
                : com.hotclick.utils.CorreoNormalizer.normalizar(correo); // MED-5: igual que el registro y el login

            // P9-02: no se crea ni se reclama una cuenta existente; el vendedor usa la búsqueda de clientes.
            // Sin distinguir mayúsculas: cubre también las cuentas antiguas guardadas con mayúsculas.
            if (!usuarioRepository.findAllByCorreoIgnoreCase(correoFinal).isEmpty()) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(ResponseDTO.error(
                    "No se pudo crear el cliente con ese correo. Búscalo en tus clientes existentes."));
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
            usuario.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
            usuario.setEstado(Constants.ESTADO_ACTIVO);
            usuario.setIntentosFallidos(0);
            // P9-02: el vendedor no prueba que el correo sea del cliente; queda sin verificar
            // hasta que el dueño real del correo restablezca su contraseña.
            usuario.setCorreoVerificado(false);

            Optional<Rol> rolOpt = rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL);
            rolOpt.ifPresent(rol -> usuario.getRoles().add(rol));

            if (eid != null) {
                empresaRepository.findById(eid).ifPresent(usuario::setEmpresaRegistro);
            }
            Usuario saved = usuarioRepository.save(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Cliente creado", resumen(saved)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    /**
     * Registra una compra externa en la cuenta del usuario.
     * Crea un pedido con origen=MANUAL y estado=ENTREGADO
     * para que aparezca en mis-pedidos, reseñas y garantías.
     */
    @PostMapping("/compra")
    public ResponseEntity<ResponseDTO> asignarCompra(@RequestBody Map<String, Object> body) {
        Long eid = companyScope.requireEmpresaIdOrAdmin();
        Long usuarioIdBody;
        Long bodegaIdBody;
        try {
            usuarioIdBody = idOpcional(body.get("usuarioId"), "usuarioId");
            bodegaIdBody  = idOpcional(body.get("bodegaId"), "bodegaId");
        } catch (IllegalArgumentException e) {
            // Id mal formado = error del cliente (400), no 500.
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
        if (eid != null && (usuarioIdBody == null || !usuarioRepository.esClienteDeEmpresa(usuarioIdBody, eid))) {
            // P9-01: el vendedor solo asigna compras a clientes de su negocio
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                .body(ResponseDTO.error("El cliente no pertenece a tu negocio"));
        }
        try {
            Long   usuarioId  = usuarioIdBody;
            String metodoPago = body.getOrDefault("metodoPago", "EXTERNO").toString();
            String notas      = body.getOrDefault("notas", "Compra registrada manualmente desde admin").toString();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsRaw = (List<Map<String, Object>>) body.get("items");

            if (itemsRaw == null || itemsRaw.isEmpty()) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Debe agregar al menos un producto"));
            }

            ManualPedidoDTO dto = new ManualPedidoDTO();
            dto.setUsuarioId(usuarioId);
            // P-07: sin bodega fija; si no viene, PedidoManualFactory resuelve la del negocio.
            dto.setBodegaId(bodegaIdBody);
            dto.setMetodoEnvio(Constants.ENVIO_RETIRO);
            dto.setMetodoPago(metodoPago);
            dto.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
            dto.setOrigen(OrigenPedido.MANUAL.codigo());
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

            // tenant-global-ok: carga la empresa propia por id (o ninguna si es ADMIN), no lista nada
            com.hotclick.model.Empresa empresa = eid != null ? empresaRepository.findById(eid).orElse(null) : null;

            com.hotclick.model.Pedido pedido = pedidoService.crearPedidoManual(dto, empresa);
            return ResponseEntity.ok(ResponseDTO.success("Compra registrada correctamente", pedido));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    /** Id opcional del body: null si no viene o viene vacío; IllegalArgumentException (→ 400) si no es un entero positivo. */
    static Long idOpcional(Object raw, String campo) {
        if (raw == null || raw.toString().isBlank()) return null;
        try {
            long v = Long.parseLong(raw.toString().trim());
            if (v > 0) return v;
        } catch (NumberFormatException ignored) {
            // cae al mensaje de abajo
        }
        throw new IllegalArgumentException("El campo " + campo + " no es un id válido.");
    }
}
