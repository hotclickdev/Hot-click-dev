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

    /** Prefijo de identificación de las filas creadas por un checkout invitado (no son cuentas con acceso). */
    static final String PREFIJO_INVITADO = "GUEST-";

    /**
     * Comprador del checkout. Con sesión: su propia cuenta. Como invitado: una fila de invitado nueva o la
     * de una compra invitada anterior. Si el correo pertenece a una cuenta real, NUNCA se le adjunta la
     * compra: hay que iniciar sesión (decisión del dueño, oct-2026). El correo se compara sin distinguir mayúsculas.
     */
    public Usuario resolve(String emailEfectivo, String guestPhone, boolean autenticado) {
        if (!autenticado && emailEfectivo != null && usuarioRepository.existeCuentaRealConCorreo(emailEfectivo.trim())) {
            throw new com.hotclick.exception.CuentaExistenteException();
        }
        var existente = usuarioRepository.findByCorreo(emailEfectivo);
        if (existente.isPresent()) {
            Usuario u = existente.get();
            if (!autenticado && !esInvitado(u)) throw new com.hotclick.exception.CuentaExistenteException();
            return u;
        }
        return crearUsuarioInvitado(emailEfectivo, guestPhone);
    }

    static boolean esInvitado(Usuario u) {
        return u.getIdentificacion() != null && u.getIdentificacion().startsWith(PREFIJO_INVITADO);
    }

    private Usuario crearUsuarioInvitado(String correo, String telefono) {
        Usuario u = new Usuario();
        String uid = UUID.randomUUID().toString().replace("-", "");
        u.setIdentificacion(PREFIJO_INVITADO + uid.substring(0, 13));
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
