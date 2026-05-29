package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.SolicitudGarantia;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudGarantiaRepository;
import com.hotclick.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/garantias/solicitudes")
public class SolicitudGarantiaController {

    @Autowired private SolicitudGarantiaRepository solicitudRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private PedidoRepository pedidoRepo;

    /** Cliente: crea una solicitud de garantía sobre un producto que compró */
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null)
            return ResponseEntity.status(401).body(ResponseDTO.error("No autenticado"));

        var usuarioOpt = usuarioRepo.findByCorreo(userDetails.getUsername());
        if (usuarioOpt.isEmpty())
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));

        String descripcion = (String) body.get("descripcion");
        if (descripcion == null || descripcion.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("La descripción es requerida"));

        Long productoId = body.get("productoId") != null
            ? ((Number) body.get("productoId")).longValue() : null;
        if (productoId == null)
            return ResponseEntity.badRequest().body(ResponseDTO.error("productoId requerido"));

        var productoOpt = productoRepo.findById(productoId);
        if (productoOpt.isEmpty())
            return ResponseEntity.badRequest().body(ResponseDTO.error("Producto no encontrado"));

        var solicitud = new SolicitudGarantia();
        solicitud.setUsuario(usuarioOpt.get());
        solicitud.setProducto(productoOpt.get());
        solicitud.setDescripcion(descripcion.trim());

        Object pedidoIdRaw = body.get("pedidoId");
        if (pedidoIdRaw instanceof Number num) {
            pedidoRepo.findById(num.longValue()).ifPresent(solicitud::setPedido);
        }

        solicitudRepo.save(solicitud);
        return ResponseEntity.ok(ResponseDTO.success("Solicitud de garantía enviada", null));
    }

    /** Cliente: lista sus propias solicitudes */
    @GetMapping("/mis-solicitudes")
    public ResponseEntity<ResponseDTO> misSolicitudes(
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null)
            return ResponseEntity.status(401).body(ResponseDTO.error("No autenticado"));

        var usuarioOpt = usuarioRepo.findByCorreo(userDetails.getUsername());
        if (usuarioOpt.isEmpty())
            return ResponseEntity.status(404).body(ResponseDTO.error("Usuario no encontrado"));

        var lista = solicitudRepo.findByUsuarioIdActivas(usuarioOpt.get().getId());
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes obtenidas", lista));
    }

    /** Admin: lista todas las solicitudes */
    @GetMapping
    public ResponseEntity<ResponseDTO> listarTodas() {
        var lista = solicitudRepo.findAllActivas();
        return ResponseEntity.ok(ResponseDTO.success("Solicitudes obtenidas", lista));
    }

    /** Admin: cambia estado y agrega nota */
    @PutMapping("/{id}/estado")
    public ResponseEntity<ResponseDTO> cambiarEstado(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        var opt = solicitudRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        SolicitudGarantia s = opt.get();
        String estado = body.get("estado");
        String notas  = body.get("notasAdmin");
        if (estado != null && !estado.isBlank()) s.setEstado(estado);
        if (notas  != null) s.setNotasAdmin(notas.isBlank() ? null : notas.trim());
        solicitudRepo.save(s);
        return ResponseEntity.ok(ResponseDTO.success("Solicitud actualizada", s));
    }
}
