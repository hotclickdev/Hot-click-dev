package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Porcentaje de descuento SINPE/efectivo de cada negocio, para que el checkout muestre
 * el mismo total que cobra {@link OrderPricingService}.
 */
@Service
public class DescuentoSinpePublicoService {

    /** Un carrito con más negocios que esto no es realista; acota la consulta pública. */
    static final int MAX_EMPRESAS_POR_CONSULTA = 20;
    private static final String ESTADO_ACTIVO = "ACTIVO";

    private final EmpresaRepository empresaRepository;

    public DescuentoSinpePublicoService(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    /** Solo devuelve negocios activos con descuento mayor a cero; el resto se asume 0. */
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> porEmpresa(Collection<Long> empresaIds) {
        var ids = empresaIds.stream()
            .filter(Objects::nonNull)
            .distinct()
            .limit(MAX_EMPRESAS_POR_CONSULTA)
            .toList();
        Map<Long, BigDecimal> resultado = new LinkedHashMap<>();
        if (ids.isEmpty()) return resultado;
        for (Empresa empresa : empresaRepository.findAllById(ids)) {
            if (!ESTADO_ACTIVO.equals(empresa.getEstadoEmpresa())) continue;
            BigDecimal pct = empresa.getPctDescuentoSinpe();
            if (pct.compareTo(BigDecimal.ZERO) > 0) resultado.put(empresa.getId(), pct);
        }
        return resultado;
    }
}
