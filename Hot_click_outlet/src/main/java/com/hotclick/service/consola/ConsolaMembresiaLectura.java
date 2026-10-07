package com.hotclick.service.consola;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.billing.AdminBillingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ConsolaMembresiaLectura {

    private static final Logger log = LoggerFactory.getLogger(ConsolaMembresiaLectura.class);

    private final AdminBillingService billingService;

    public ConsolaMembresiaLectura(AdminBillingService billingService) {
        this.billingService = billingService;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public Map<String, Object> leer(Long empresaId) {
        try {
            return copiaEmpresa(billingService.detalleEmpresa(empresaId).get("empresa"));
        } catch (RecursoNoEncontradoException ex) {
            return sinDato();
        } catch (RuntimeException ex) {
            log.warn("Membresía de empresa {} no disponible: {}", empresaId, ex.getMessage());
            return sinDato();
        }
    }

    private static Map<String, Object> copiaEmpresa(Object empresa) {
        if (!(empresa instanceof Map<?, ?> mapa)) return sinDato();
        Map<String, Object> copia = new LinkedHashMap<>();
        mapa.forEach((clave, valor) -> copia.put(String.valueOf(clave), valor));
        return copia;
    }

    private static Map<String, Object> sinDato() {
        return Map.of("estadoSuscripcion", "SIN_DATO");
    }
}
