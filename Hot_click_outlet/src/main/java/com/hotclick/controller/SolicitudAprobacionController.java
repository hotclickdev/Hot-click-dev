package com.hotclick.controller;

import com.hotclick.controller.aprobacion.SolicitudAprobacionMapper;
import com.hotclick.controller.aprobacion.SolicitudEmpresaHandler;
import com.hotclick.controller.aprobacion.SolicitudOfertaHandler;
import com.hotclick.controller.aprobacion.SolicitudProductoHandler;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/solicitudes-aprobacion")
public class SolicitudAprobacionController {

    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private SolicitudAprobacionMapper solicitudAprobacionMapper;
    @Autowired private SolicitudEmpresaHandler  solicitudEmpresaHandler;
    @Autowired private SolicitudProductoHandler solicitudProductoHandler;
    @Autowired private SolicitudOfertaHandler   solicitudOfertaHandler;

    // toMap() resuelve e.getPlan().getNombre() (relación LAZY); con open-in-view=false
    // hace falta una transacción activa para que el proxy se pueda inicializar.
    @Transactional(readOnly = true)
    @GetMapping
    public ResponseDTO listar() {
        List<Empresa> pendientes = empresaRepository
            .findByEstadoEmpresaOrderByFechaRegistroDesc("PENDIENTE_APROBACION");
        List<Map<String, Object>> result = pendientes.stream().map(solicitudAprobacionMapper::toMap).toList();
        return ResponseDTO.success("Solicitudes pendientes", result);
    }

    @GetMapping("/stats")
    public ResponseDTO stats() {
        Map<String, Object> data = new HashMap<>();
        data.put("pendientes", empresaRepository.countByEstadoEmpresa("PENDIENTE_APROBACION"));
        data.put("activas",    empresaRepository.countByEstadoEmpresa("ACTIVO"));
        data.put("suspendidas",empresaRepository.countByEstadoEmpresa("SUSPENDIDO"));
        return ResponseDTO.success("Stats aprobacion", data);
    }

    @PutMapping("/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobar(@PathVariable Long id) {
        return solicitudEmpresaHandler.aprobar(id);
    }

    @PutMapping("/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazar(@PathVariable Long id,
                                                 @RequestBody(required = false) Map<String, String> body) {
        return solicitudEmpresaHandler.rechazar(id, body);
    }

    // ── Productos ────────────────────────────────────────────────────────────

    @GetMapping("/productos")
    public ResponseEntity<ResponseDTO> listarProductos() {
        return solicitudProductoHandler.listarProductos();
    }

    @PutMapping("/productos/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobarProducto(@PathVariable Long id) {
        return solicitudProductoHandler.aprobarProducto(id);
    }

    @PutMapping("/productos/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazarProducto(@PathVariable Long id,
                                                         @RequestBody(required = false) Map<String, String> body) {
        return solicitudProductoHandler.rechazarProducto(id, body);
    }

    // ── Ofertas (Promociones) ───────────────────────────────────────────────────

    @GetMapping("/ofertas")
    public ResponseEntity<ResponseDTO> listarOfertas() {
        return solicitudOfertaHandler.listarOfertas();
    }

    @PutMapping("/ofertas/{id}/aprobar")
    public ResponseEntity<ResponseDTO> aprobarOferta(@PathVariable Long id) {
        return solicitudOfertaHandler.aprobarOferta(id);
    }

    @PutMapping("/ofertas/{id}/rechazar")
    public ResponseEntity<ResponseDTO> rechazarOferta(@PathVariable Long id,
                                                       @RequestBody(required = false) Map<String, String> body) {
        return solicitudOfertaHandler.rechazarOferta(id, body);
    }
}
