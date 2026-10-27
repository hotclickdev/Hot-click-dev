package com.hotclick.service.payment;

import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.CorreoNormalizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GuestUserResolver {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository     rolRepository;
    @Autowired private PasswordEncoder   passwordEncoder;

    public Usuario resolve(String emailEfectivo, String guestPhone) {
        // MED-5: el invitado nuevo se crea con el mismo criterio que el registro y el login (trim + minúsculas).
        final String correo = CorreoNormalizer.normalizar(emailEfectivo);
        // Pero una cuenta antigua puede estar guardada con mayúsculas y el usuario autenticado llega con ese correo
        // exacto: nunca se crea un invitado si ya existe la cuenta (el pedido quedaría en otra cuenta).
        // Criterio, en orden: 1) correo exacto tal como llegó; 2) correo normalizado; 3) entre las variantes que
        // solo difieren en mayúsculas, la cuenta más antigua (menor id), de forma determinista.
        return usuarioRepository.findByCorreo(emailEfectivo)
            .or(() -> usuarioRepository.findByCorreo(correo))
            .or(() -> masAntiguaIgnorandoMayusculas(correo))
            .orElseGet(() -> crearUsuarioInvitado(correo, guestPhone));
    }

    private Optional<Usuario> masAntiguaIgnorandoMayusculas(String correo) {
        List<Usuario> variantes = usuarioRepository.findAllByCorreoIgnoreCase(correo);
        if (variantes == null) return Optional.empty();
        return variantes.stream()
            .filter(u -> u.getId() != null)
            .min(Comparator.comparing(Usuario::getId));
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
