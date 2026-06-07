package com.hotclick.service;

import com.hotclick.model.Cupon;
import com.hotclick.repository.CuponRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class CuponService {

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RNG = new SecureRandom();

    @Autowired private CuponRepository cuponRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;

    @Transactional
    public Cupon solicitarCupon(String email) {
        String emailLower = email.trim().toLowerCase();

        if (cuponRepository.existsByEmail(emailLower)) {
            throw new IllegalStateException("Ya existe un cupón para este correo");
        }

        String codigo = generarCodigo();
        Cupon cupon = new Cupon();
        cupon.setCodigo(codigo);
        cupon.setEmail(emailLower);
        cupon.setDescuentoPorcentaje(13);
        cupon.setUsado(false);
        cupon.setFechaCreacion(LocalDateTime.now());
        cuponRepository.save(cupon);

        notificacionEmailService.enviarCuponBienvenida(emailLower, codigo);

        return cupon;
    }

    public Optional<Cupon> validarCodigo(String codigo) {
        return cuponRepository.findByCodigo(codigo.trim().toUpperCase())
                .filter(c -> !Boolean.TRUE.equals(c.getUsado())
                          && c.getUsosActuales() < c.getMaxUsos());
    }

    /**
     * Registra un uso del cupón de forma atómica.
     * Retorna false si el cupón ya alcanzó su límite (bloqueado).
     * El UPDATE en BD previene que dos requests simultáneos pasen el límite.
     */
    @Transactional
    public boolean marcarUsado(String codigo) {
        String codigoUpper = codigo.trim().toUpperCase();
        int actualizados = cuponRepository.incrementarUsoSiDisponible(codigoUpper, LocalDateTime.now());
        if (actualizados == 0) {
            return false; // Ya estaba en el límite
        }
        // Si después del incremento alcanzó el tope, marcar como bloqueado
        cuponRepository.bloquearSiAlcanzaLimite(codigoUpper);
        return true;
    }

    private String generarCodigo() {
        String codigo;
        int intentos = 0;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 10; i++) {
                sb.append(CHARS.charAt(RNG.nextInt(CHARS.length())));
            }
            codigo = sb.toString();
            intentos++;
            if (intentos > 20) throw new RuntimeException("No se pudo generar código único");
        } while (cuponRepository.findByCodigo(codigo).isPresent());
        return codigo;
    }
}
