package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.Cupon;
import com.hotclick.model.Empresa;
import com.hotclick.repository.CuponRepository;
import com.hotclick.repository.EmpresaRepository;
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
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;

    /** @deprecated cupón global sin empresa — usar {@link #solicitarCupon(String, Long)} en flujos multi-tenant. */
    @Deprecated
    @Transactional
    public Cupon solicitarCupon(String email) {
        return solicitarCupon(email, null);
    }

    @Transactional
    public Cupon solicitarCupon(String email, Long empresaId) {
        String emailLower = email.trim().toLowerCase();

        if (cuponRepository.existsByEmail(emailLower)) {
            throw new IllegalStateException("Ya existe un cupón para este correo");
        }

        Empresa empresa = null;
        if (empresaId != null) {
            empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada: " + empresaId));
        }

        String codigo = generarCodigo(empresaId);
        Cupon cupon = new Cupon();
        cupon.setCodigo(codigo);
        cupon.setEmail(emailLower);
        cupon.setEmpresa(empresa);
        cupon.setDescuentoPorcentaje(13);
        cupon.setUsado(false);
        cupon.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        cuponRepository.save(cupon);

        notificacionEmailService.enviarCuponBienvenida(emailLower, codigo);

        return cupon;
    }

    /** @deprecated no filtra por empresa — el mismo código ahora puede existir en distintos tenants. */
    @Deprecated
    public Optional<Cupon> validarCodigo(String codigo) {
        return cuponRepository.findByCodigo(codigo.trim().toUpperCase())
                .filter(c -> !Boolean.TRUE.equals(c.getUsado())
                          && c.getUsosActuales() < c.getMaxUsos());
    }

    public Optional<Cupon> validarCodigo(String codigo, Long empresaId) {
        return cuponRepository.findByCodigoAndEmpresaId(codigo.trim().toUpperCase(), empresaId)
                .filter(c -> !Boolean.TRUE.equals(c.getUsado())
                          && c.getUsosActuales() < c.getMaxUsos());
    }

    /**
     * Registra un uso del cupón de forma atómica.
     * Retorna false si el cupón ya alcanzó su límite (bloqueado).
     * El UPDATE en BD previene que dos requests simultáneos pasen el límite.
     *
     * @deprecated no filtra por empresa — usar {@link #marcarUsado(String, Long)}.
     */
    @Deprecated
    @Transactional
    public boolean marcarUsado(String codigo) {
        String codigoUpper = codigo.trim().toUpperCase();
        int actualizados = cuponRepository.incrementarUsoSiDisponible(codigoUpper, LocalDateTime.now(Constants.ZONA_CR));
        if (actualizados == 0) {
            return false; // Ya estaba en el límite
        }
        // Si después del incremento alcanzó el tope, marcar como bloqueado
        cuponRepository.bloquearSiAlcanzaLimite(codigoUpper);
        return true;
    }

    @Transactional
    public boolean marcarUsado(String codigo, Long empresaId) {
        String codigoUpper = codigo.trim().toUpperCase();
        int actualizados = cuponRepository.incrementarUsoSiDisponiblePorEmpresa(codigoUpper, empresaId, LocalDateTime.now(Constants.ZONA_CR));
        if (actualizados == 0) {
            return false;
        }
        cuponRepository.bloquearSiAlcanzaLimitePorEmpresa(codigoUpper, empresaId);
        return true;
    }

    private String generarCodigo(Long empresaId) {
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
            boolean existe = empresaId != null
                ? cuponRepository.findByCodigoAndEmpresaId(codigo, empresaId).isPresent()
                : cuponRepository.findByCodigo(codigo).isPresent();
            if (!existe) break;
        } while (true);
        return codigo;
    }
}
