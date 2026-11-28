package com.hotclick.service.fiscal;

import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Lista de inscripciones por verificar (solo ADMIN): primero las que Hacienda confirmó, luego las más antiguas. */
@Service
public class FiscalPendientesService {

    public static final int MAX_PENDIENTES = 200;

    private final EmpresaRepository empresaRepository;
    private final CompanyScope companyScope;

    public FiscalPendientesService(EmpresaRepository empresaRepository, CompanyScope companyScope) {
        this.empresaRepository = empresaRepository;
        this.companyScope = companyScope;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendientes() {
        if (!companyScope.isAdminIT() || companyScope.isImpersonating()) {
            throw new TenantAccessDeniedException("Solo un administrador de plataforma ve las verificaciones fiscales");
        }
        List<Empresa> pendientes = empresaRepository.findFiscalPendientes(PageRequest.of(0, MAX_PENDIENTES));
        List<String> cedulas = pendientes.stream().map(Empresa::getCedulaFiscal).toList();
        Set<String> repetidas = cedulas.isEmpty() ? Set.of() : new HashSet<>(empresaRepository.cedulasFiscalesRepetidas(cedulas));
        return pendientes.stream().map(e -> fila(e, repetidas.contains(e.getCedulaFiscal()))).toList();
    }

    private static Map<String, Object> fila(Empresa e, boolean cedulaDuplicada) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("empresaId", e.getId());
        m.put("nombre", e.getNombreComercial() != null && !e.getNombreComercial().isBlank()
            ? e.getNombreComercial() : e.getNombreEmpresa());
        m.put("situacionFiscal", e.getSituacionFiscal());
        m.put("fechaSituacionFiscal", e.getFechaSituacionFiscal());
        m.put("verifAuto", e.getFiscalVerifAuto());
        m.put("cedulaDuplicada", cedulaDuplicada);
        return m;
    }
}
