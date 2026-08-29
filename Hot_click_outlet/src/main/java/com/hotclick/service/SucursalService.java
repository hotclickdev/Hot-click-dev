package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Sucursal;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SucursalRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SucursalService {

    private final SucursalRepository sucursalRepository;
    private final EmpresaRepository empresaRepository;
    private final InputSanitizer sanitizer;

    public SucursalService(
            SucursalRepository sucursalRepository,
            EmpresaRepository empresaRepository,
            InputSanitizer sanitizer) {
        this.sucursalRepository = sucursalRepository;
        this.empresaRepository = empresaRepository;
        this.sanitizer = sanitizer;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(Long empresaId) {
        List<Sucursal> lista = empresaId != null
            ? sucursalRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO)
            : sucursalRepository.findByEstado(Constants.ESTADO_ACTIVO);
        return lista.stream().map(this::aDto).toList();
    }

    @Transactional
    public Map<String, Object> crear(String nombreRaw, Long empresaId) {
        if (empresaId == null) {
            throw new IllegalArgumentException("Se requiere una empresa para crear la sucursal");
        }
        if (nombreRaw == null || nombreRaw.isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }
        String nombre = sanitizer.cleanWithLimit(nombreRaw.trim(), 120);
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        Sucursal s = new Sucursal();
        s.setNombre(nombre);
        s.setEmpresa(empresa);
        s.setEstado(Constants.ESTADO_ACTIVO);
        return aDto(sucursalRepository.save(s));
    }

    private Map<String, Object> aDto(Sucursal s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("nombre", s.getNombre());
        m.put("empresaId", s.getEmpresaId());
        m.put("activo", Integer.valueOf(Constants.ESTADO_ACTIVO).equals(s.getEstado()));
        m.put("ventasMes", 0);
        m.put("fechaCreacion", s.getFechaCreacion());
        return m;
    }
}
