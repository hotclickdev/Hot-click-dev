package com.hotclick.service.wallet;

import com.hotclick.model.MetodoCobro;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.service.consola.QuincenaCalculo;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

/**
 * seg-altos-2 (d): cuenta apta para recibir pagos del negocio: SINPE o IBAN, activa, aprobada por ADMIN
 * (sin alta ni cambio en revisión) y registrada antes de la quincena en curso.
 */
@Component
public class CuentaCobroVerificada {

    public static final String MENSAJE =
        "Registra tu cuenta SINPE Móvil o IBAN y espera su verificación para recibir pagos.";

    private final MetodoCobroRepository metodoRepo;

    public CuentaCobroVerificada(MetodoCobroRepository metodoRepo) {
        this.metodoRepo = metodoRepo;
    }

    public Optional<MetodoCobro> buscar(Long empresaId) {
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        return metodoRepo.findActivosByEmpresaId(empresaId).stream()
            .filter(m -> !m.isEnRevision())
            .filter(m -> MetodoCobro.TIPO_SINPE.equals(m.getTipo()) || MetodoCobro.TIPO_IBAN.equals(m.getTipo()))
            .filter(m -> !QuincenaCalculo.registradaEnQuincena(m.getFechaCreacion(), hoy))
            .findFirst();
    }

    public MetodoCobro exigir(Long empresaId) {
        return buscar(empresaId).orElseThrow(() -> new IllegalStateException(MENSAJE));
    }
}
