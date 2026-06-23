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
import com.hotclick.utils.InputSanitizer;
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
    @Autowired private InputSanitizer           sanitizer;

    @Transactional
    public Usuario registrar(RegistroEmpresaDTO dto) {
        // Sanitizar entradas con jsoup para prevenir XSS
        if (dto.getNombreEmpresa()   != null) dto.setNombreEmpresa(sanitizer.cleanWithLimit(dto.getNombreEmpresa(), 150));
        if (dto.getNombreComercial() != null) dto.setNombreComercial(sanitizer.cleanWithLimit(dto.getNombreComercial(), 150));
        if (dto.getNombreAdmin()     != null) dto.setNombreAdmin(sanitizer.cleanWithLimit(dto.getNombreAdmin(), 100));

        // Validaciones básicas
        if (!Boolean.TRUE.equals(dto.getInscritoTributacion()))
            throw new IllegalArgumentException("Debés estar inscrito en Tributación Directa (ATV) para vender en HotClick");
        if (dto.getNombreEmpresa() == null || dto.getNombreEmpresa().isBlank())
            throw new IllegalArgumentException("El nombre de la empresa es requerido");
        if (dto.getCorreoAdmin() == null || dto.getCorreoAdmin().isBlank())
            throw new IllegalArgumentException("El correo del administrador es requerido");
        if (dto.getPasswordAdmin() == null || dto.getPasswordAdmin().length() < 8)
            throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres");

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

    /**
     * Upgrades an existing USUARIO_FINAL to EMPRENDEDOR by creating their empresa.
     * Used when a user authenticated via social login (Clerk) wants to register a business.
     */
    @Transactional
    public Usuario upgradeExistingUser(Usuario usuario, String nombreEmpresa,
                                        String nombreComercial, String telefonoEmpresa,
                                        String correoEmpresa,
                                        String cedulaJuridica, Boolean inscritoHacienda,
                                        String regimenTributario, String nombreHacienda) {
        if (usuario.getEmpresa() != null) {
            throw new IllegalArgumentException("Este usuario ya tiene un negocio registrado");
        }

        String nombre = sanitizer.cleanWithLimit(nombreEmpresa, 150);
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre del negocio es requerido");
        }

        String slug     = uniqueSlug(slugify(nombre));
        String correoEmp = (correoEmpresa != null && !correoEmpresa.isBlank())
            ? correoEmpresa.trim().toLowerCase()
            : usuario.getCorreo();

        // 1. Crear empresa
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa(nombre);
        empresa.setNombreComercial(
            (nombreComercial != null && !nombreComercial.isBlank())
                ? sanitizer.cleanWithLimit(nombreComercial.trim(), 150) : nombre);
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(correoEmp);
        empresa.setTelefonoEmpresa(telefonoEmpresa);
        empresa.setPlanSaas("GRATUITO");
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        empresa.setVisibilidadPublica(false);
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa.setEstado(Constants.ESTADO_ACTIVO);
        if (cedulaJuridica != null && !cedulaJuridica.isBlank()) {
            empresa.setCedulaJuridica(cedulaJuridica.trim());
            empresa.setInscritoHacienda(Boolean.TRUE.equals(inscritoHacienda));
            empresa.setRegimenTributario(regimenTributario);
            empresa.setNombreHacienda(nombreHacienda);
            if (Boolean.TRUE.equals(inscritoHacienda)) {
                empresa.setFechaVerificacionHacienda(LocalDateTime.now());
            }
        }
        empresa = empresaRepository.save(empresa);

        // 2. Cambiar rol a EMPRENDEDOR
        var rolEmprendedor = rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
            .orElseThrow(() -> new RuntimeException("Rol EMPRENDEDOR no configurado"));
        usuario.getRoles().removeIf(r -> "USUARIO_FINAL".equals(r.getNombreRol()));
        if (usuario.getRoles().stream().noneMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()))) {
            usuario.getRoles().add(rolEmprendedor);
        }
        usuario.setEmpresa(empresa);
        Usuario saved = usuarioRepository.save(usuario);

        // 3. Registrar membresía
        MiembroEmpresa miembro = new MiembroEmpresa(saved, empresa, "PROPIETARIO");
        miembroEmpresaRepository.save(miembro);

        // Recargar para evitar LazyInitializationException
        saved = usuarioRepository.findById(saved.getId()).orElse(saved);
        if (saved.getEmpresa() != null) {
            saved.getEmpresa().getId();
            saved.getEmpresa().getSlug();
            saved.getEmpresa().getNombreEmpresa();
        }

        notificacionEmailService.enviarBienvenidaEmprendedor(
            saved.getCorreo(), saved.getNombre(),
            empresa.getNombreComercial());

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
