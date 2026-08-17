package com.hotclick.service.payment;

import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class GuestUserResolver {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository     rolRepository;
    @Autowired private PasswordEncoder   passwordEncoder;

    public Usuario resolve(String emailEfectivo, String guestPhone) {
        return usuarioRepository.findByCorreo(emailEfectivo)
            .orElseGet(() -> crearUsuarioInvitado(emailEfectivo, guestPhone));
    }

    private Usuario crearUsuarioInvitado(String correo, String telefono) {
        Usuario u = new Usuario();
        String uid = UUID.randomUUID().toString().replace("-", "");
        u.setIdentificacion("GUEST-" + uid.substring(0, 13));
        u.setNombre("Invitado");
        u.setApellidoPaterno("Guest");
        u.setCorreo(correo);
        u.setTelefono(telefono != null && !telefono.isBlank()
            ? telefono.replaceAll("[^0-9]", "") : "00000000");
        u.setContrasenaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        u.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        u.setEstado(Constants.ESTADO_ACTIVO);
        rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL)
            .ifPresent(rol -> u.setRoles(List.of(rol)));
        return usuarioRepository.save(u);
    }
}
