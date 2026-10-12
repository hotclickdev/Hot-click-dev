package com.hotclick.service;

import com.hotclick.model.MetodoCobro;
import com.hotclick.repository.MetodoCobroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * seg-altos-2 (d): guarda un método de cobro nuevo; SINPE/IBAN quedan en revisión porque los pagos
 * solo salen a cuentas aprobadas por ADMIN.
 */
@Service
public class MetodoCobroAltaService {

    private final MetodoCobroRepository repo;
    private final MetodoCobroCambioService cambioService;

    public MetodoCobroAltaService(MetodoCobroRepository repo, MetodoCobroCambioService cambioService) {
        this.repo = repo;
        this.cambioService = cambioService;
    }

    @Transactional
    public MetodoCobro guardar(MetodoCobro m) {
        MetodoCobro guardado = repo.save(m);
        if (MetodoCobro.TIPO_SINPE.equals(m.getTipo()) || MetodoCobro.TIPO_IBAN.equals(m.getTipo())) {
            cambioService.solicitarAlta(guardado);
        }
        return guardado;
    }
}
