package com.hotclick.controller;

import com.hotclick.dto.CotizacionClienteRequestDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.CotizacionCliente;
import com.hotclick.model.Empresa;
import com.hotclick.repository.CotizacionClienteRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.utils.Constants;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;

@SuppressWarnings("null")
@RestController
@RequestMapping("/api/cotizaciones/clientes")
@PreAuthorize("hasRole('ADMIN')")
public class CotizacionClienteController {

    @Autowired private CotizacionClienteRepository clienteRepository;
    @Autowired private EmpresaRepository           empresaRepository;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        Long empresaId = TenantContext.get();
        return ResponseEntity.ok(ResponseDTO.success("ok",
            clienteRepository.findByEmpresaIdAndEstadoOrderByNombreComercialAsc(empresaId, Constants.ESTADO_ACTIVO)));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@Valid @RequestBody CotizacionClienteRequestDTO dto) {
        Long empresaId = TenantContext.get();
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada"));

        CotizacionCliente cliente = new CotizacionCliente();
        cliente.setEmpresa(empresa);
        mapear(cliente, dto);
        cliente.setEstado(Constants.ESTADO_ACTIVO);

        return ResponseEntity.ok(ResponseDTO.success("Cliente creado", clienteRepository.save(cliente)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody CotizacionClienteRequestDTO dto) {
        Long empresaId = TenantContext.get();
        CotizacionCliente cliente = clienteRepository.findById(id)
            .filter(c -> c.getEmpresa().getId().equals(empresaId))
            .orElseThrow(() -> new NoSuchElementException("Cliente no encontrado"));

        mapear(cliente, dto);
        return ResponseEntity.ok(ResponseDTO.success("Actualizado", clienteRepository.save(cliente)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        Long empresaId = TenantContext.get();
        CotizacionCliente cliente = clienteRepository.findById(id)
            .filter(c -> c.getEmpresa().getId().equals(empresaId))
            .orElseThrow(() -> new NoSuchElementException("Cliente no encontrado"));

        cliente.setEstado(Constants.ESTADO_INACTIVO);
        clienteRepository.save(cliente);
        return ResponseEntity.ok(ResponseDTO.success("Eliminado", null));
    }

    private void mapear(CotizacionCliente c, CotizacionClienteRequestDTO dto) {
        c.setNombreComercial(dto.getNombreComercial());
        c.setRazonSocial(dto.getRazonSocial());
        c.setCedulaJuridica(dto.getCedulaJuridica());
        c.setCorreo(dto.getCorreo());
        c.setTelefono(dto.getTelefono());
        c.setDireccion(dto.getDireccion());
        c.setContactoPrincipal(dto.getContactoPrincipal());
    }
}
