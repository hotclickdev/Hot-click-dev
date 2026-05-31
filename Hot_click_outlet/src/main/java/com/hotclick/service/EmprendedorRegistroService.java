package com.hotclick.service;

import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class EmprendedorRegistroService {

    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private UsuarioRepository        usuarioRepository;
    @Autowired private RolRepository            rolRepository;
    @Autowired private PasswordEncoder          passwordEncoder;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    /** Elimina tags HTML, scripts y caracteres peligrosos de un string */
    private static String sanitizar(String s) {
        if (s == null) return null;
        return s.trim()
                .replaceAll("<[^>]*>", "")           // elimina tags HTML/script
                .replaceAll("[;\\-\\-]", "")          // elimina ; y -- (SQL injection)
                .replaceAll("['\"]", "")              // elimina comillas
                .replaceAll("(?i)(select|insert|update|delete|drop|create|alter|exec|union|script)", "")
                .trim();
    }

    @Transactional
    public Usuario registrar(RegistroEmpresaDTO dto) {
        // Sanitizar entradas para prevenir XSS y SQL injection
        if (dto.getNombreEmpresa() != null) dto.setNombreEmpresa(sanitizar(dto.getNombreEmpresa()));
        if (dto.getNombreComercial() != null) dto.setNombreComercial(sanitizar(dto.getNombreComercial()));
        if (dto.getNombreAdmin() != null) dto.setNombreAdmin(sanitizar(dto.getNombreAdmin()));

        // Validaciones básicas
        if (dto.getNombreEmpresa() == null || dto.getNombreEmpresa().isBlank())
            throw new IllegalArgumentException("El nombre de la empresa es requerido");
        if (dto.getCorreoAdmin() == null || dto.getCorreoAdmin().isBlank())
            throw new IllegalArgumentException("El correo del administrador es requerido");
        if (dto.getPasswordAdmin() == null || dto.getPasswordAdmin().length() < 6)
            throw new IllegalArgumentException("La contraseña debe tener al menos 6 caracteres");

        // Correo del admin ya registrado
        if (usuarioRepository.existsByCorreo(dto.getCorreoAdmin().trim().toLowerCase()))
            throw new IllegalArgumentException("El correo ya está registrado");

        // Generar slug si no viene
        String slug = dto.getSlug() != null && !dto.getSlug().isBlank()
            ? slugify(dto.getSlug())
            : slugify(dto.getNombreEmpresa());
        slug = uniqueSlug(slug);

        // Correo empresa (puede ser igual al admin si no se especifica)
        String correoEmpresa = dto.getCorreoEmpresa() != null && !dto.getCorreoEmpresa().isBlank()
            ? dto.getCorreoEmpresa().trim().toLowerCase()
            : dto.getCorreoAdmin().trim().toLowerCase();
        if (empresaRepository.existsByCorreoEmpresa(correoEmpresa))
            throw new IllegalArgumentException("Ya existe una empresa registrada con ese correo");

        // 1. Crear empresa
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa(dto.getNombreEmpresa().trim());
        empresa.setNombreComercial(
            dto.getNombreComercial() != null && !dto.getNombreComercial().isBlank()
                ? dto.getNombreComercial().trim()
                : dto.getNombreEmpresa().trim()
        );
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(correoEmpresa);
        empresa.setTelefonoEmpresa(dto.getTelefonoEmpresa());
        empresa.setPlanSaas("GRATUITO");
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        empresa.setVisibilidadPublica(false);
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa.setEstado(Constants.ESTADO_ACTIVO);
        empresa = empresaRepository.save(empresa);

        // 2. Crear usuario EMPRENDEDOR
        Usuario usuario = new Usuario();
        String nombreCompleto = dto.getNombreAdmin() != null && !dto.getNombreAdmin().isBlank()
            ? dto.getNombreAdmin().trim()
            : dto.getCorreoAdmin().split("@")[0];
        String[] partes = nombreCompleto.split("\\s+", 2);
        usuario.setNombre(partes[0]);
        usuario.setApellidoPaterno(partes.length > 1 ? partes[1] : "Emprendedor");
        usuario.setIdentificacion("EMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        usuario.setCorreo(dto.getCorreoAdmin().trim().toLowerCase());
        usuario.setContrasenaHash(passwordEncoder.encode(dto.getPasswordAdmin()));
        usuario.setTelefono(dto.getTelefonoAdmin() != null ? dto.getTelefonoAdmin() : "00000000");
        usuario.setFechaRegistro(LocalDateTime.now());
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setIntentosFallidos(0);
        usuario.setEmpresa(empresa);

        var rolEmprendedor = rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
            .orElseThrow(() -> new RuntimeException("Rol EMPRENDEDOR no configurado en la base de datos"));
        usuario.getRoles().add(rolEmprendedor);

        Usuario saved = usuarioRepository.save(usuario);

        // Recargar con empresa inicializada para evitar LazyInitializationException
        // cuando buildAuthResponse accede a empresa.getSlug() fuera de la transacción
        saved = usuarioRepository.findById(saved.getId()).orElse(saved);
        if (saved.getEmpresa() != null) {
            saved.getEmpresa().getId();
            saved.getEmpresa().getSlug();
            saved.getEmpresa().getNombreEmpresa();
        }

        // Registrar membresía en junction table (PROPIETARIO del negocio)
        MiembroEmpresa miembro = new MiembroEmpresa(saved, saved.getEmpresa(), "PROPIETARIO");
        miembroEmpresaRepository.save(miembro);

        notificacionEmailService.enviarBienvenidaEmprendedor(
            saved.getCorreo(),
            saved.getNombre(),
            empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa()
        );

        return saved;
    }

    private String slugify(String text) {
        String normalized = Normalizer.normalize(text.toLowerCase().trim(), Normalizer.Form.NFD);
        return normalized.replaceAll("[^\\p{ASCII}]", "")
                         .replaceAll("[^a-z0-9\\s-]", "")
                         .replaceAll("\\s+", "-")
                         .replaceAll("-{2,}", "-")
                         .replaceAll("^-|-$", "");
    }

    private String uniqueSlug(String base) {
        if (!empresaRepository.existsBySlug(base)) return base;
        int i = 2;
        while (empresaRepository.existsBySlug(base + "-" + i)) i++;
        return base + "-" + i;
    }
}
