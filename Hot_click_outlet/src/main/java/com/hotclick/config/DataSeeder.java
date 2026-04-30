package com.hotclick.config;

import com.hotclick.model.*;
import com.hotclick.repository.*;
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
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRol(Constants.ROL_ADMIN_IT,      "Administrador del sistema", 100);
        seedRol(Constants.ROL_ADMIN_CLIENTE,  "Administrador de negocio",  50);
        seedRol(Constants.ROL_USUARIO_FINAL,  "Cliente final",              1);
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
        String defaultPassword = "Admin1234!";
        if (usuarioRepository.existsByCorreo(correo)) {
            Usuario admin = usuarioRepository.findByCorreo(correo).get();
            // Siempre garantizar contraseña correcta, campos obligatorios y rol
            admin.setContrasenaHash(passwordEncoder.encode(defaultPassword));
            if (admin.getIdentificacion() == null) admin.setIdentificacion("0000000001");
            if (admin.getTelefono() == null)       admin.setTelefono("0000000000");
            admin.setEstado(Constants.ESTADO_ACTIVO);
            admin.setIntentosFallidos(0);
            admin.setBloqueadoHasta(null);
            boolean tieneAdmin = admin.getRoles().stream()
                .anyMatch(r -> r.getNombreRol().equals(Constants.ROL_ADMIN_IT));
            if (!tieneAdmin) {
                rolRepository.findByNombreRol(Constants.ROL_ADMIN_IT)
                    .ifPresent(rol -> admin.getRoles().add(rol));
            }
            usuarioRepository.save(admin);
        } else {
            Usuario admin = new Usuario();
            admin.setIdentificacion("0000000001");
            admin.setNombre("Admin");
            admin.setApellidoPaterno("HotClick");
            admin.setCorreo(correo);
            admin.setTelefono("0000000000");
            admin.setContrasenaHash(passwordEncoder.encode(defaultPassword));
            admin.setEstado(Constants.ESTADO_ACTIVO);
            admin.setIntentosFallidos(0);
            rolRepository.findByNombreRol(Constants.ROL_ADMIN_IT)
                .ifPresent(rol -> admin.getRoles().add(rol));
            usuarioRepository.save(admin);
        }
    }

    private void seedBodegaDefault() {
        if (bodegaRepository.count() == 0) {
            Usuario admin = usuarioRepository.findByCorreo("admin@hotclick.com").orElse(null);
            if (admin == null) return;
            Bodega bodega = new Bodega();
            bodega.setNombreBodega("Bodega Principal");
            bodega.setDireccionExacta("San José, Costa Rica");
            bodega.setTelefono("00000000");
            bodega.setEstado(Constants.ESTADO_ACTIVO);
            bodega.setAdminCliente(admin);
            bodegaRepository.save(bodega);
        }
    }

    private void seedCategoriasDefault() {
        if (categoriaRepository.count() == 0) {
            Usuario admin = usuarioRepository.findByCorreo("admin@hotclick.com").orElse(null);
            if (admin == null) return;
            String[] nombres = { "Electrónica", "Computación", "Hogar", "Accesorios", "Gaming", "Oficina" };
            for (String nombre : nombres) {
                Categoria cat = new Categoria();
                cat.setNombreCategoria(nombre);
                cat.setEstado(Constants.ESTADO_ACTIVO);
                cat.setAdminCliente(admin);
                categoriaRepository.save(cat);
            }
        }
    }
}
