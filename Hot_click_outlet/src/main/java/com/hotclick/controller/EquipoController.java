package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.TenantService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empresa/equipo")
public class EquipoController {

    @Autowired private UsuarioRepository        usuarioRepository;
    @Autowired private RolRepository            rolRepository;
    @Autowired private PasswordEncoder          passwordEncoder;
    @Autowired private CompanyScope             companyScope;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private TenantService            tenantService;

    private static final int MAX_EMPRESAS_POR_USUARIO = 20;
    private static final java.util.Set<String> ROLES_PERMITIDOS = java.util.Set.of("EDITOR", "LECTOR", "ADMIN");

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null)
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo disponible para empresas"));

        // Listar por junction table para incluir miembros invitados de otras empresas
        List<MiembroEmpresa> membresías = miembroEmpresaRepository.findByEmpresaIdAndEstado(empresaId, 1);
        List<Map<String, Object>> result = membresías.stream().map(m -> {
            Usuario u = m.getUsuario();
            Map<String, Object> r = new java.util.HashMap<>();
            r.put("id",            u.getId());
            r.put("nombre",        u.getNombre());
            r.put("apellidoPaterno", u.getApellidoPaterno());
            r.put("correo",        u.getCorreo());
            r.put("telefono",      u.getTelefono());
            r.put("fotoPerfilUrl", u.getFotoPerfilUrl());
            r.put("estado",        u.getEstado());
            r.put("rolEnEmpresa",  m.getRolEnEmpresa());
            r.put("fechaIngreso",  m.getFechaIngreso());
            return r;
        }).toList();
        return ResponseEntity.ok(ResponseDTO.success("Equipo", result));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> invitar(@RequestBody Map<String, String> body) {
        if (!companyScope.isEmprendedor())
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el emprendedor puede agregar miembros"));

        Usuario currentUser = companyScope.getCurrentUser();
        if (currentUser == null || currentUser.getEmpresa() == null)
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));

        String nombre       = body.get("nombre");
        String correo       = body.get("correo");
        String password     = body.get("password");
        String telefono     = body.getOrDefault("telefono", "00000000");
        String rolEnEmpresa = body.getOrDefault("rolEnEmpresa", "EDITOR");

        if (nombre == null || nombre.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));
        if (correo == null || correo.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        if (password == null || password.length() < 6)
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 6 caracteres"));
        if (!ROLES_PERMITIDOS.contains(rolEnEmpresa))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Rol inválido. Valores aceptados: EDITOR, LECTOR"));

        Empresa empresa    = currentUser.getEmpresa();
        String correoNorm  = correo.trim().toLowerCase();

        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId != null) {
            tenantService.verificarLimiteUsuariosEquipo(empresaId);
        }

        var rolAdminCliente = rolRepository.findByNombreRol(Constants.ROL_ADMIN_CLIENTE)
            .orElseThrow(() -> new RecursoNoEncontradoException("Rol ADMIN_CLIENTE no configurado"));

        Optional<Usuario> existenteOpt = usuarioRepository.findByCorreo(correoNorm);
        if (existenteOpt.isPresent()) {
            Usuario u = existenteOpt.get();

            if (miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), empresa.getId(), 1))
                return ResponseEntity.badRequest().body(ResponseDTO.error("Este usuario ya es miembro activo de tu equipo"));

            if (miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId()) >= MAX_EMPRESAS_POR_USUARIO)
                return ResponseEntity.badRequest().body(ResponseDTO.error("El usuario ya pertenece al máximo de " + MAX_EMPRESAS_POR_USUARIO + " negocios permitidos"));

            boolean tieneRol = u.getRoles().stream().anyMatch(r -> Constants.ROL_ADMIN_CLIENTE.equals(r.getNombreRol()));
            if (!tieneRol) { u.getRoles().add(rolAdminCliente); usuarioRepository.save(u); }

            // Reactivar membresía eliminada si existe, o crear nueva
            Optional<MiembroEmpresa> previo = miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), empresa.getId());
            if (previo.isPresent()) {
                MiembroEmpresa m = previo.get();
                m.setEstado(1);
                m.setRolEnEmpresa(rolEnEmpresa);
                m.setFechaIngreso(LocalDateTime.now(Constants.ZONA_CR));
                miembroEmpresaRepository.save(m);
            } else {
                miembroEmpresaRepository.save(new MiembroEmpresa(u, empresa, rolEnEmpresa));
            }
            notificacionEmailService.enviarInvitacionMiembro(
                correoNorm, u.getNombre(), rolEnEmpresa,
                empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa(),
                null);
            return ResponseEntity.ok(ResponseDTO.success("Miembro agregado al equipo como " + rolEnEmpresa, null));
        }

        // Usuario nuevo — crear y asociar a esta empresa
        String[] partes = nombre.trim().split("\\s+", 2);
        Usuario nuevo = new Usuario();
        nuevo.setNombre(partes[0]);
        nuevo.setApellidoPaterno(partes.length > 1 ? partes[1] : "Miembro");
        nuevo.setIdentificacion("ADM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        nuevo.setCorreo(correoNorm);
        nuevo.setContrasenaHash(passwordEncoder.encode(password));
        nuevo.setTelefono(telefono);
        nuevo.setEstado(Constants.ESTADO_ACTIVO);
        nuevo.setIntentosFallidos(0);
        nuevo.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        nuevo.setEmpresa(empresa);
        nuevo.getRoles().add(rolAdminCliente);
        Usuario saved = usuarioRepository.save(nuevo);

        miembroEmpresaRepository.save(new MiembroEmpresa(saved, empresa, rolEnEmpresa));
        notificacionEmailService.enviarInvitacionMiembro(
            correoNorm, saved.getNombre(), rolEnEmpresa,
            empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa(),
            password);
        return ResponseEntity.ok(ResponseDTO.success("Miembro agregado al equipo como " + rolEnEmpresa, null));
    }

    @PutMapping("/{id}/rol")
    public ResponseEntity<ResponseDTO> cambiarRol(@PathVariable Long id,
                                                  @RequestBody Map<String, String> body) {
        if (!companyScope.isEmprendedor())
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el emprendedor puede cambiar roles"));

        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null)
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));

        if (id.equals(companyScope.getCurrentUserId()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("No puedes cambiar tu propio rol"));

        String nuevoRol = body.get("rolEnEmpresa");
        if (nuevoRol == null || !ROLES_PERMITIDOS.contains(nuevoRol))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Rol inválido. Valores aceptados: EDITOR, LECTOR"));

        Optional<MiembroEmpresa> mOpt = miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(id, empresaId, 1);
        if (mOpt.isEmpty())
            return ResponseEntity.status(404).body(ResponseDTO.error("Miembro no encontrado en tu equipo"));

        MiembroEmpresa m = mOpt.get();
        if ("PROPIETARIO".equals(m.getRolEnEmpresa()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("No puedes cambiar el rol del propietario"));

        m.setRolEnEmpresa(nuevoRol);
        miembroEmpresaRepository.save(m);
        return ResponseEntity.ok(ResponseDTO.success("Rol actualizado a " + nuevoRol, Map.of("rolEnEmpresa", nuevoRol)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        if (!companyScope.isEmprendedor())
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el emprendedor puede eliminar miembros"));

        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null)
            return ResponseEntity.status(403).body(ResponseDTO.error("Sin empresa asociada"));

        if (id.equals(companyScope.getCurrentUserId()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("No puedes eliminarte a ti mismo"));

        // Desactivar membresía en junction table
        Optional<MiembroEmpresa> mOpt = miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(id, empresaId, 1);
        if (mOpt.isEmpty())
            return ResponseEntity.status(403).body(ResponseDTO.error("El usuario no pertenece a tu equipo"));

        MiembroEmpresa m = mOpt.get();
        if ("PROPIETARIO".equals(m.getRolEnEmpresa()))
            return ResponseEntity.badRequest().body(ResponseDTO.error("No puedes eliminar al propietario del negocio"));

        m.setEstado(0);
        miembroEmpresaRepository.save(m);

        // Si solo pertenecía a esta empresa, también marcar usuario como eliminado
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(id) == 0) {
            usuarioRepository.findById(id).ifPresent(u -> {
                u.setEstado(Constants.ESTADO_ELIMINADO);
                usuarioRepository.save(u);
            });
        }
        return ResponseEntity.ok(ResponseDTO.success("Miembro eliminado del equipo", null));
    }
}
