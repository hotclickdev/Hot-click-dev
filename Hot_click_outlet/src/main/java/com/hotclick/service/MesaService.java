package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Mesa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MesaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class MesaService {

    private final MesaRepository mesaRepo;
    private final EmpresaRepository empresaRepo;

    public MesaService(MesaRepository mesaRepo, EmpresaRepository empresaRepo) {
        this.mesaRepo   = mesaRepo;
        this.empresaRepo = empresaRepo;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarPorEmpresa(Long empresaId) {
        return mesaRepo.findByEmpresaIdOrderByNombreAsc(empresaId)
            .stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> crear(Long empresaId, String nombre, String descripcion, String tipo) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada"));
        Mesa mesa = new Mesa();
        mesa.setEmpresa(empresa);
        mesa.setNombre(nombre);
        mesa.setDescripcion(descripcion);
        mesa.setTipo(tipo != null ? tipo : "MESA");
        return toMap(mesaRepo.save(mesa));
    }

    @Transactional
    public Map<String, Object> actualizar(Long mesaId, Long empresaId, String nombre, String descripcion, String tipo, Boolean activo) {
        Mesa mesa = mesaRepo.findById(mesaId)
            .orElseThrow(() -> new NoSuchElementException("Mesa no encontrada"));
        if (!mesa.getEmpresa().getId().equals(empresaId))
            throw new SecurityException("Acceso denegado");
        if (nombre != null) mesa.setNombre(nombre);
        if (descripcion != null) mesa.setDescripcion(descripcion);
        if (tipo != null) mesa.setTipo(tipo);
        if (activo != null) mesa.setActivo(activo);
        return toMap(mesaRepo.save(mesa));
    }

    @Transactional
    public Map<String, Object> regenerarToken(Long mesaId, Long empresaId) {
        Mesa mesa = mesaRepo.findById(mesaId)
            .orElseThrow(() -> new NoSuchElementException("Mesa no encontrada"));
        if (!mesa.getEmpresa().getId().equals(empresaId))
            throw new SecurityException("Acceso denegado");
        mesa.setQrToken(UUID.randomUUID().toString().replace("-", ""));
        return toMap(mesaRepo.save(mesa));
    }

    @Transactional
    public void eliminar(Long mesaId, Long empresaId) {
        Mesa mesa = mesaRepo.findById(mesaId)
            .orElseThrow(() -> new NoSuchElementException("Mesa no encontrada"));
        if (!mesa.getEmpresa().getId().equals(empresaId))
            throw new SecurityException("Acceso denegado");
        mesa.setActivo(false);
        mesaRepo.save(mesa);
    }

    private Map<String, Object> toMap(Mesa m) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("id", m.getId());
        r.put("nombre", m.getNombre());
        r.put("descripcion", m.getDescripcion());
        r.put("tipo", m.getTipo());
        r.put("qrToken", m.getQrToken());
        r.put("activo", m.getActivo());
        r.put("fechaCreacion", m.getFechaCreacion());
        return r;
    }
}
