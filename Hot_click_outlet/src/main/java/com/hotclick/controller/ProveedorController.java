package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Proveedor;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProveedorRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/proveedores")
public class ProveedorController {

    @Autowired private ProveedorRepository proveedorRepository;
    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private CompanyScope        companyScope;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    public ResponseEntity<?> listar() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        var lista = empresaId != null
            ? proveedorRepository.findByEmpresaIdAndEstadoOrderByNombreAsc(empresaId, Constants.ESTADO_ACTIVO)
            : proveedorRepository.findByEstadoOrderByNombreAsc(Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("OK", lista));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        try {
            Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
            String nombre = (String) body.get("nombre");
            if (nombre == null || nombre.isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es requerido"));

            Proveedor p = new Proveedor();
            p.setNombre(nombre.trim());
            p.setContacto((String) body.get("contacto"));
            p.setTelefono((String) body.get("telefono"));
            p.setCorreo((String) body.get("correo"));
            p.setNotas((String) body.get("notas"));
            p.setEstado(Constants.ESTADO_ACTIVO);

            if (empresaId != null) {
                empresaRepository.findById(empresaId).ifPresent(p::setEmpresa);
            }
            return ResponseEntity.ok(ResponseDTO.success("Proveedor creado", proveedorRepository.save(p)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al crear proveedor"));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor no encontrado"));

            if (body.containsKey("nombre"))   p.setNombre(body.get("nombre").toString().trim());
            if (body.containsKey("contacto")) p.setContacto((String) body.get("contacto"));
            if (body.containsKey("telefono")) p.setTelefono((String) body.get("telefono"));
            if (body.containsKey("correo"))   p.setCorreo((String) body.get("correo"));
            if (body.containsKey("notas"))    p.setNotas((String) body.get("notas"));

            return ResponseEntity.ok(ResponseDTO.success("Proveedor actualizado", proveedorRepository.save(p)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al actualizar"));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor no encontrado"));
            p.setEstado(Constants.ESTADO_INACTIVO);
            proveedorRepository.save(p);
            return ResponseEntity.ok(ResponseDTO.success("Proveedor eliminado", null));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
