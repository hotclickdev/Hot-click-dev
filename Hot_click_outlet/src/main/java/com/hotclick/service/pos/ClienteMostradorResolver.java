package com.hotclick.service.pos;

import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * ESC-2 / MAN-4: la venta POS sin cliente se asigna al «Cliente Mostrador» (id 999 sembrado por V25).
 * Si esa fila no existe (base sin la semilla o borrada), antes la venta fallaba con 500.
 * Ahora se busca por id, luego por su correo interno, y si no está se crea sin contraseña utilizable.
 */
@Component
public class ClienteMostradorResolver {

    static final String CORREO_MOSTRADOR = "mostrador@hotclick.internal";
    private static final Logger log = LoggerFactory.getLogger(ClienteMostradorResolver.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final org.springframework.transaction.support.TransactionTemplate nuevaTx;

    public ClienteMostradorResolver(UsuarioRepository usuarioRepository,
                                    org.springframework.transaction.PlatformTransactionManager txManager) {
        this.usuarioRepository = usuarioRepository;
        this.nuevaTx = new org.springframework.transaction.support.TransactionTemplate(txManager);
        this.nuevaTx.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public Usuario mostrador() {
        return buscar().orElseGet(this::crearIdempotente);
    }

    private java.util.Optional<Usuario> buscar() {
        return usuarioRepository.findById(Constants.ID_USUARIO_MOSTRADOR)
            .or(() -> usuarioRepository.findByCorreo(CORREO_MOSTRADOR));
    }

    /**
     * Idempotente: el correo es único. La creación va en su propia transacción (no ensucia la de la venta);
     * si otra caja la creó a la vez, el insert choca con la unicidad y se relee la fila existente.
     */
    private synchronized Usuario crearIdempotente() {
        java.util.Optional<Usuario> ya = buscar();
        if (ya.isPresent()) return ya.get();
        try {
            Long id = nuevaTx.execute(st -> crear().getId());
            return usuarioRepository.findById(id).orElseThrow();
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            log.info("[POS] Cliente Mostrador creado en paralelo; se reutiliza");
            return usuarioRepository.findByCorreo(CORREO_MOSTRADOR).orElseThrow(() -> e);
        }
    }

    private Usuario crear() {
        log.warn("[POS] Cliente Mostrador (id={}) no existe; se crea por correo interno", Constants.ID_USUARIO_MOSTRADOR);
        byte[] b = new byte[32];
        RANDOM.nextBytes(b);
        Usuario u = new Usuario();
        u.setIdentificacion("SISTEMA-POS-MOST");
        u.setNombre("Cliente");
        u.setApellidoPaterno("Mostrador");
        u.setCorreo(CORREO_MOSTRADOR);
        u.setTelefono("00000000");
        // No es un hash BCrypt válido: nadie puede iniciar sesión con esta cuenta.
        u.setContrasenaHash("!sin-login!" + HexFormat.of().formatHex(b));
        u.setEstado(Constants.ESTADO_ACTIVO);
        return usuarioRepository.saveAndFlush(u);
    }
}
