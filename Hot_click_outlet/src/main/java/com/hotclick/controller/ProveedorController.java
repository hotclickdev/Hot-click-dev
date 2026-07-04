package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.OrdenCompra;
import com.hotclick.model.Proveedor;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.OrdenCompraRepository;
import com.hotclick.repository.ProveedorRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/proveedores")
public class ProveedorController {

    @Autowired private ProveedorRepository   proveedorRepository;
    @Autowired private EmpresaRepository     empresaRepository;
    @Autowired private OrdenCompraRepository ordenCompraRepository;
    @Autowired private CompanyScope          companyScope;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    public ResponseEntity<?> listar() {
        Long empresaId = companyScope.getCurrentEmpresaId();
        var lista = empresaId != null
            ? proveedorRepository.findByEmpresa_IdAndEstadoOrderByNombreAsc(empresaId, Constants.ESTADO_ACTIVO)
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
            Object tipo = body.get("tipo");
            if ("MATERIA_PRIMA".equals(tipo)) p.setTipo("MATERIA_PRIMA");
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
            companyScope.assertCanAccessNullable(p.getEmpresa() != null ? p.getEmpresa().getId() : null);

            if (body.containsKey("nombre"))   p.setNombre(body.get("nombre").toString().trim());
            if (body.containsKey("contacto")) p.setContacto((String) body.get("contacto"));
            if (body.containsKey("telefono")) p.setTelefono((String) body.get("telefono"));
            if (body.containsKey("correo"))   p.setCorreo((String) body.get("correo"));
            if (body.containsKey("notas"))    p.setNotas((String) body.get("notas"));
            if (body.containsKey("tipo"))     p.setTipo("MATERIA_PRIMA".equals(body.get("tipo")) ? "MATERIA_PRIMA" : "PRODUCTO_TERMINADO");

            return ResponseEntity.ok(ResponseDTO.success("Proveedor actualizado", proveedorRepository.save(p)));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al actualizar"));
        }
    }

    /** Historial de precios pagados a este proveedor, a partir de sus órdenes de compra recibidas/pendientes. */
    @GetMapping("/{id}/historial-costos")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE','INVENTARIO')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> historialCostos(@PathVariable Long id) {
        Proveedor p = proveedorRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor no encontrado"));
        companyScope.assertCanAccessNullable(p.getEmpresa() != null ? p.getEmpresa().getId() : null);

        List<OrdenCompra> ordenes = ordenCompraRepository.findByProveedorIdConDetalles(id);
        List<Map<String, Object>> filas = ordenes.stream()
            .flatMap(o -> o.getItems().stream().map(item -> {
                Map<String, Object> fila = new LinkedHashMap<>();
                fila.put("numeroOrden",  o.getNumeroOrden());
                fila.put("fechaOrden",   o.getFechaOrden());
                fila.put("estadoOrden",  o.getEstado());
                fila.put("producto",     item.getProducto().getNombreProducto());
                fila.put("cantidad",     item.getCantidad());
                fila.put("precioUnitario", item.getPrecioUnitario());
                return fila;
            }))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ResponseDTO.success("OK", filas));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR','GERENTE')")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor no encontrado"));
            companyScope.assertCanAccessNullable(p.getEmpresa() != null ? p.getEmpresa().getId() : null);
            p.setEstado(Constants.ESTADO_INACTIVO);
            proveedorRepository.save(p);
            return ResponseEntity.ok(ResponseDTO.success("Proveedor eliminado", null));
        } catch (com.hotclick.exception.TenantAccessDeniedException e) {
            return ResponseEntity.status(403).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
