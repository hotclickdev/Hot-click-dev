package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.NotificacionEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/solicitudes-aprobacion")
public class SolicitudAprobacionController {

    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private UsuarioRepository        usuarioRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private CompanyScope             companyScope;

    @GetMapping
    public ResponseDTO listar() {
        List<Empresa> pendientes = empresaRepository
            .findByEstadoEmpresaOrderByFechaRegistroDesc("PENDIENTE_APROBACION");
        List<Map<String, Object>> result = pendientes.stream().map(this::toMap).toList();
        return ResponseDTO.success("Solicitudes pendientes", result);
    }

    @GetMapping("/stats")
    public ResponseDTO stats() {
        Map<String, Object> data = new HashMap<>();
        data.put("pendientes", empresaRepository.countByEstadoEmpresa("PENDIENTE_APROBACION"));
        data.put("activas",    empresaRepository.countByEstadoEmpresa("ACTIVO"));
        data.put("suspendidas",empresaRepository.countByEstadoEmpresa("SUSPENDIDO"));
        return ResponseDTO.success("Stats aprobacion", data);
    }

    @PutMapping("/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaAprobacion(LocalDateTime.now());
        empresaRepository.save(e);
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarAprobacionNegocio(
                u.getCorreo(), u.getNombre(),
                e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa()
            ));
        return ResponseEntity.ok(ResponseDTO.success("Empresa aprobada", null));
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(@PathVariable Long id) {
        if (!companyScope.isAdminIT()) return ResponseEntity.status(403).body(ResponseDTO.error("Acceso denegado"));
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        e.setEstadoEmpresa("RECHAZADO");
        empresaRepository.save(e);
        usuarioRepository.findByEmpresaIdConRoles(e.getId()).stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> notificacionEmailService.enviarRechazoNegocio(
                u.getCorreo(), u.getNombre(),
                e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa()
            ));
        return ResponseEntity.ok(ResponseDTO.success("Solicitud rechazada", null));
    }

    private Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",              e.getId());
        m.put("nombreEmpresa",   e.getNombreEmpresa());
        m.put("nombreComercial", e.getNombreComercial());
        m.put("slug",            e.getSlug());
        m.put("correoEmpresa",   e.getCorreoEmpresa());
        m.put("telefonoEmpresa", e.getTelefonoEmpresa());
        m.put("planSaas",        e.getPlanSaas());
        m.put("estadoEmpresa",   e.getEstadoEmpresa());
        m.put("fechaRegistro",   e.getFechaRegistro());

        // Obtener el emprendedor admin de esta empresa
        List<Usuario> miembros = usuarioRepository.findByEmpresaIdConRoles(e.getId());
        miembros.stream()
            .filter(u -> u.getRoles().stream().anyMatch(r -> "EMPRENDEDOR".equals(r.getNombreRol())))
            .findFirst()
            .ifPresent(u -> {
                m.put("adminNombre", u.getNombre() + " " + u.getApellidoPaterno());
                m.put("adminCorreo", u.getCorreo());
            });
        return m;
    }
}
