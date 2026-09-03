package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Sucursal;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SucursalRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SucursalService {

    static final int MAX_NOMBRE = 120;
    static final int MAX_UBICACION = 255;

    private final SucursalRepository sucursalRepository;
    private final EmpresaRepository empresaRepository;
    private final CompanyScope companyScope;
    private final InputSanitizer sanitizer;

    public SucursalService(
            SucursalRepository sucursalRepository,
            EmpresaRepository empresaRepository,
            CompanyScope companyScope,
            InputSanitizer sanitizer) {
        this.sucursalRepository = sucursalRepository;
        this.empresaRepository = empresaRepository;
        this.companyScope = companyScope;
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
    public Map<String, Object> crear(String nombreRaw, String ubicacionRaw, Long empresaId) {
        if (empresaId == null) {
            throw new IllegalArgumentException("Se requiere una empresa para crear la sucursal");
        }
        String nombre = limpiarObligatorio(nombreRaw, MAX_NOMBRE, "El nombre es obligatorio");
        String ubicacion = limpiarObligatorio(ubicacionRaw, MAX_UBICACION, "La ubicación es obligatoria");
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        Sucursal s = new Sucursal();
        s.setNombre(nombre);
        s.setUbicacion(ubicacion);
        s.setEmpresa(empresa);
        s.setEstado(Constants.ESTADO_ACTIVO);
        return aDto(sucursalRepository.save(s));
    }

    @Transactional
    public Map<String, Object> renombrar(Long id, String nombreRaw) {
        Sucursal s = cargarActivaDeMiEmpresa(id);
        s.setNombre(limpiarObligatorio(nombreRaw, MAX_NOMBRE, "El nombre es obligatorio"));
        return aDto(sucursalRepository.save(s));
    }

    @Transactional
    public Map<String, Object> desactivar(Long id) {
        Sucursal s = cargarActivaDeMiEmpresa(id);
        s.setEstado(Constants.ESTADO_INACTIVO);
        return aDto(sucursalRepository.save(s));
    }

    private Sucursal cargarActivaDeMiEmpresa(Long id) {
        Sucursal s = sucursalRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal no encontrada"));
        companyScope.assertCanAccess(s.getEmpresaId());
        if (!Integer.valueOf(Constants.ESTADO_ACTIVO).equals(s.getEstado())) {
            throw new RecursoNoEncontradoException("Sucursal no encontrada");
        }
        return s;
    }

    private String limpiarObligatorio(String raw, int max, String mensajeVacio) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException(mensajeVacio);
        }
        String limpio = sanitizer.cleanWithLimit(raw.trim(), max);
        if (limpio == null || limpio.isBlank()) {
            throw new IllegalArgumentException(mensajeVacio);
        }
        return limpio;
    }

    private Map<String, Object> aDto(Sucursal s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("nombre", s.getNombre());
        m.put("ubicacion", s.getUbicacion());
        m.put("empresaId", s.getEmpresaId());
        m.put("activo", Integer.valueOf(Constants.ESTADO_ACTIVO).equals(s.getEstado()));
        m.put("ventasMes", 0);
        m.put("fechaCreacion", s.getFechaCreacion());
        return m;
    }
}
