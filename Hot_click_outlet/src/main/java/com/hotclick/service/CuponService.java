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

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
        cupon.setDescuentoPorcentaje(17);
        cupon.setUsado(false);
        cupon.setFechaCreacion(LocalDateTime.now());
        cuponRepository.save(cupon);

        notificacionEmailService.enviarCuponBienvenida(emailLower, codigo);

        return cupon;
    }

    public Optional<Cupon> validarCodigo(String codigo) {
        return cuponRepository.findByCodigo(codigo.trim().toUpperCase())
                .filter(c -> !Boolean.TRUE.equals(c.getUsado()));
    }

    @Transactional
    public void marcarUsado(String codigo) {
        cuponRepository.findByCodigo(codigo.trim().toUpperCase()).ifPresent(c -> {
            c.setUsado(true);
            c.setFechaUso(LocalDateTime.now());
            cuponRepository.save(c);
        });
    }

    private String generarCodigo() {
        String codigo;
        int intentos = 0;
        do {
            StringBuilder sb = new StringBuilder("HOT17-");
            for (int i = 0; i < 6; i++) {
                sb.append(CHARS.charAt(RNG.nextInt(CHARS.length())));
            }
            codigo = sb.toString();
            intentos++;
            if (intentos > 20) throw new RuntimeException("No se pudo generar código único");
        } while (cuponRepository.findByCodigo(codigo).isPresent());
        return codigo;
    }
}
