package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Gasto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.GastoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/gastos")
public class GastoController {

    @Autowired private GastoRepository   gastoRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CompanyScope      companyScope;
    @Autowired private JwtUtil           jwtUtil;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE','GERENTE','CONTABILIDAD')")
    public ResponseEntity<?> listar(@RequestParam(required = false) String desde,
                                    @RequestParam(required = false) String hasta) {
        Long empresaId = companyScope.getCurrentEmpresaId();
        if (empresaId == null)
            return ResponseEntity.badRequest().body(ResponseDTO.error("Empresa requerida"));
        LocalDate d = desde != null && !desde.isBlank() ? LocalDate.parse(desde) : null;
        LocalDate h = hasta != null && !hasta.isBlank() ? LocalDate.parse(hasta) : null;
        return ResponseEntity.ok(ResponseDTO.success("OK",
            gastoRepository.findByEmpresaIdAndPeriodo(empresaId, d, h)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE','GERENTE','CONTABILIDAD')")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Long empresaId = companyScope.getCurrentEmpresaId();
            String concepto = (String) body.get("concepto");
            if (concepto == null || concepto.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El concepto es requerido"));

            Gasto g = new Gasto();
            g.setConcepto(concepto.trim());
            g.setMonto(Integer.parseInt(body.getOrDefault("monto", "0").toString()));
            g.setCategoria((String) body.get("categoria"));
            g.setNotas((String) body.get("notas"));
            g.setComprobanteUrl((String) body.get("comprobanteUrl"));
            if (body.containsKey("fecha") && body.get("fecha") != null)
                g.setFecha(LocalDate.parse(body.get("fecha").toString()));

            if (empresaId != null) empresaRepository.findById(empresaId).ifPresent(g::setEmpresa);
            String correo = jwtUtil.extractUsername(request.getHeader("Authorization").substring(7));
            usuarioRepository.findByCorreo(correo).ifPresent(g::setUsuario);

            return ResponseEntity.ok(ResponseDTO.success("Gasto registrado", gastoRepository.save(g)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al registrar gasto"));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE','GERENTE','CONTABILIDAD')")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Gasto g = gastoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Gasto no encontrado"));
            Long empresaId = companyScope.getCurrentEmpresaId();
            if (empresaId != null && (g.getEmpresa() == null || !empresaId.equals(g.getEmpresa().getId())))
                return ResponseEntity.status(403).body(ResponseDTO.error("Gasto no pertenece a esta empresa"));
            if (body.containsKey("concepto"))      g.setConcepto(body.get("concepto").toString().trim());
            if (body.containsKey("monto"))         g.setMonto(Integer.parseInt(body.get("monto").toString()));
            if (body.containsKey("categoria"))     g.setCategoria((String) body.get("categoria"));
            if (body.containsKey("notas"))         g.setNotas((String) body.get("notas"));
            if (body.containsKey("comprobanteUrl"))g.setComprobanteUrl((String) body.get("comprobanteUrl"));
            if (body.containsKey("fecha") && body.get("fecha") != null)
                g.setFecha(LocalDate.parse(body.get("fecha").toString()));
            return ResponseEntity.ok(ResponseDTO.success("Gasto actualizado", gastoRepository.save(g)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_IT','EMPRENDEDOR','ADMIN_CLIENTE','GERENTE')")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            Gasto g = gastoRepository.findById(id).orElse(null);
            if (g == null)
                return ResponseEntity.badRequest().body(ResponseDTO.error("Gasto no encontrado"));
            Long empresaId = companyScope.getCurrentEmpresaId();
            if (empresaId != null && (g.getEmpresa() == null || !empresaId.equals(g.getEmpresa().getId())))
                return ResponseEntity.status(403).body(ResponseDTO.error("Gasto no pertenece a esta empresa"));
            gastoRepository.deleteById(id);
            return ResponseEntity.ok(ResponseDTO.success("Gasto eliminado", null));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al eliminar"));
        }
    }
}
