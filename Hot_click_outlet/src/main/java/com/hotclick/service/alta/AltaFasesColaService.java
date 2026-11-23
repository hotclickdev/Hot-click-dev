package com.hotclick.service.alta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.ProductoRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Estado de varios negocios a la vez para la cola admin: 2 consultas en total, sin consultas por fila. */
@Service
public class AltaFasesColaService {

    private final EmpresaCuentaOnvoRepository cuentaRepository;
    private final ProductoRepository productoRepository;

    public AltaFasesColaService(EmpresaCuentaOnvoRepository cuentaRepository, ProductoRepository productoRepository) {
        this.cuentaRepository = cuentaRepository;
        this.productoRepository = productoRepository;
    }

    public Map<Long, Map<String, Object>> estadosEnLote(List<Empresa> empresas) {
        Map<Long, Map<String, Object>> out = new LinkedHashMap<>();
        if (empresas == null || empresas.isEmpty()) return out;
        List<Long> ids = empresas.stream().map(Empresa::getId).toList();
        Map<Long, EmpresaCuentaOnvo> cuentas = new HashMap<>();
        cuentaRepository.findByEmpresaIdIn(ids).forEach(c -> cuentas.put(c.getEmpresaId(), c));
        Map<Long, Long> productos = new HashMap<>();
        productoRepository.contarActivosPorEmpresa(ids).forEach(r -> productos.put((Long) r[0], (Long) r[1]));
        empresas.forEach(e -> out.put(e.getId(),
            AltaFasesService.armarEstado(e, cuentas.get(e.getId()), productos.getOrDefault(e.getId(), 0L))));
        return out;
    }
}
