package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/empresas")
public class EmpresaController {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private UsuarioRepository  usuarioRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository   pedidoRepository;

    @GetMapping
    public ResponseDTO listar() {
        List<Empresa> empresas = empresaRepository.findAll();
        List<Map<String, Object>> result = empresas.stream().map(this::toMap).toList();
        return ResponseDTO.success("Empresas", result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDTO> detalle(@PathVariable Long id) {
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        Empresa e = opt.get();
        Map<String, Object> data = toMap(e);
        data.put("totalUsuarios",  usuarioRepository.countActivosByEmpresaId(id));
        data.put("totalProductos", productoRepository.countProductosActivosByEmpresaId(id));
        data.put("totalPedidos",   pedidoRepository.countTotalPedidosByEmpresaId(id));
        data.put("totalVentas",    pedidoRepository.sumTotalVentasByEmpresaId(id));
        return ResponseEntity.ok(ResponseDTO.success("Empresa", data));
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body) {
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        String nuevoEstado = body.get("estadoEmpresa");
        if (nuevoEstado == null || !List.of("ACTIVO", "SUSPENDIDO", "INACTIVO").contains(nuevoEstado))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Estado inválido"));
        Empresa empresa = opt.get();
        empresa.setEstadoEmpresa(nuevoEstado);
        empresaRepository.save(empresa);
        return ResponseEntity.ok(ResponseDTO.success("Estado actualizado", null));
    }

    @PutMapping("/{id}/plan")
    public ResponseEntity<ResponseDTO> cambiarPlan(@PathVariable Long id,
                                                   @RequestBody Map<String, String> body) {
        Optional<Empresa> opt = empresaRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(ResponseDTO.error("Empresa no encontrada"));
        String plan = body.get("planSaas");
        if (plan == null || !List.of("GRATUITO", "BASICO", "PRO", "ENTERPRISE").contains(plan))
            return ResponseEntity.badRequest().body(ResponseDTO.error("Plan inválido"));
        Empresa empresa = opt.get();
        empresa.setPlanSaas(plan);
        empresaRepository.save(empresa);
        return ResponseEntity.ok(ResponseDTO.success("Plan actualizado a " + plan, null));
    }

    private Map<String, Object> toMap(Empresa e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",              e.getId());
        m.put("nombreEmpresa",   e.getNombreEmpresa());
        m.put("nombreComercial", e.getNombreComercial());
        m.put("slug",            e.getSlug());
        m.put("correoEmpresa",   e.getCorreoEmpresa());
        m.put("telefonoEmpresa", e.getTelefonoEmpresa());
        m.put("planSaas",        e.getPlanSaas());
        m.put("estadoEmpresa",   e.getEstadoEmpresa());
        m.put("fechaRegistro",   e.getFechaRegistro());
        m.put("fechaAprobacion", e.getFechaAprobacion());
        m.put("logoUrl",         e.getLogoUrl());
        return m;
    }
}
