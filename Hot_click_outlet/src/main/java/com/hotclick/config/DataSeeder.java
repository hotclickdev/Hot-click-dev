package com.hotclick.config;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements ApplicationRunner {

    @Autowired private RolRepository rolRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRol(Constants.ROL_ADMIN_IT,      "Administrador del sistema",    100);
        seedRol(Constants.ROL_ADMIN_CLIENTE,  "Administrador de negocio",     50);
        seedRol(Constants.ROL_USUARIO_FINAL,  "Cliente final",                 1);
        seedAdminUser();
    }

    private void seedRol(String nombre, String descripcion, int nivel) {
        if (!rolRepository.existsByNombreRol(nombre)) {
            Rol rol = new Rol();
            rol.setNombreRol(nombre);
            rol.setDescripcion(descripcion);
            rol.setNivelAcceso(nivel);
            rol.setEstado(Constants.ESTADO_ACTIVO);
            rolRepository.save(rol);
        }
    }

    private void seedAdminUser() {
        String correo = "admin@hotclick.com";
        if (usuarioRepository.existsByCorreo(correo)) {
            // Asegurar que tenga rol ADMIN_IT
            Usuario admin = usuarioRepository.findByCorreo(correo).get();
            boolean tieneAdmin = admin.getRoles().stream()
                .anyMatch(r -> r.getNombreRol().equals(Constants.ROL_ADMIN_IT));
            if (!tieneAdmin) {
                rolRepository.findByNombreRol(Constants.ROL_ADMIN_IT)
                    .ifPresent(rol -> { admin.getRoles().add(rol); usuarioRepository.save(admin); });
            }
        } else {
            Usuario admin = new Usuario();
            admin.setIdentificacion("0000000001");
            admin.setNombre("Admin");
            admin.setApellidoPaterno("HotClick");
            admin.setCorreo(correo);
            admin.setTelefono("0000000000");
            admin.setContrasenaHash(passwordEncoder.encode("Admin1234!"));
            admin.setEstado(Constants.ESTADO_ACTIVO);
            admin.setIntentosFallidos(0);
            rolRepository.findByNombreRol(Constants.ROL_ADMIN_IT)
                .ifPresent(rol -> admin.getRoles().add(rol));
            usuarioRepository.save(admin);
        }
    }
}
