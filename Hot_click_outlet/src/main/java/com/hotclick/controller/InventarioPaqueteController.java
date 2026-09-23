package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.inventario.ImportarLineasResultado;
import com.hotclick.dto.inventario.PaqueteAsignarRequest;
import com.hotclick.dto.inventario.PaqueteInventarioCreateRequest;
import com.hotclick.dto.inventario.PaqueteLineaRequest;
import com.hotclick.service.inventario.InventarioPaqueteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/inventario")
@PreAuthorize("hasRole('ADMIN')")
public class InventarioPaqueteController {

    /** Tope explícito de líneas por import (SCALE1 / LIMIT 500). */
    private static final int MAX_LINEAS_IMPORT = 500;

    private final InventarioPaqueteService service;

    public InventarioPaqueteController(InventarioPaqueteService service) {
        this.service = service;
    }

    @PostMapping("/paquetes")
    public ResponseEntity<ResponseDTO> crear(
            @Valid @RequestBody PaqueteInventarioCreateRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.success("Paquete creado", service.crearPaquete(req, correo(user))));
    }

    @GetMapping("/paquetes")
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Paquetes", service.listar()));
    }

    @GetMapping("/paquetes/{id}")
    public ResponseEntity<ResponseDTO> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Paquete", service.obtener(id)));
    }

    @PostMapping("/paquetes/{id}/lineas")
    public ResponseEntity<ResponseDTO> agregarLinea(
            @PathVariable Long id,
            @Valid @RequestBody PaqueteLineaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResponseDTO.success("Línea agregada", service.agregarLinea(id, request)));
    }

    @PutMapping("/paquetes/{id}/lineas/{lineaId}")
    public ResponseEntity<ResponseDTO> actualizarLinea(
            @PathVariable Long id,
            @PathVariable Long lineaId,
            @Valid @RequestBody PaqueteLineaRequest request) {
        return ResponseEntity.ok(ResponseDTO.success("Línea actualizada",
                service.actualizarLinea(id, lineaId, request)));
    }

    @DeleteMapping("/paquetes/{id}/lineas/{lineaId}")
    public ResponseEntity<ResponseDTO> eliminarLinea(
            @PathVariable Long id,
            @PathVariable Long lineaId) {
        service.eliminarLinea(id, lineaId);
        return ResponseEntity.ok(ResponseDTO.success("Línea eliminada", null));
    }

    @PostMapping("/paquetes/{id}/cerrar")
    public ResponseEntity<ResponseDTO> cerrar(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Paquete cerrado", service.cerrar(id)));
    }

    @PostMapping("/paquetes/{id}/reabrir")
    public ResponseEntity<ResponseDTO> reabrir(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Paquete reabierto", service.reabrir(id)));
    }

    @PostMapping("/paquetes/{id}/asignar")
    public ResponseEntity<ResponseDTO> asignar(
            @PathVariable Long id,
            @Valid @RequestBody PaqueteAsignarRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ResponseDTO.success("Paquete asignado",
                service.asignar(id, req.getEmpresaId(), correo(user))));
    }

    @GetMapping("/lookup")
    public ResponseEntity<ResponseDTO> lookup(
            @RequestParam String barcode,
            @RequestParam Long paqueteId) {
        return ResponseEntity.ok(ResponseDTO.success("Lookup", service.lookup(barcode, paqueteId)));
    }

    @PostMapping("/imagen")
    public ResponseEntity<ResponseDTO> subirImagen(@RequestParam("file") MultipartFile file) {
        try {
            String url = service.subirImagen(file);
            return ResponseEntity.ok(ResponseDTO.success("Imagen subida", java.util.Map.of("url", url)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se pudo subir la imagen: " + e.getMessage()));
        }
    }

    @PostMapping("/paquetes/{id}/importar/preview")
    public ResponseEntity<ResponseDTO> importarPreview(
            @PathVariable Long id,
            // maxResults / LIMIT 500 — tope explícito (SCALE1)
            @RequestBody List<PaqueteLineaRequest> lineas) {
        ResponseEntity<ResponseDTO> rechazo = rechazoSiImportExcede(lineas);
        if (rechazo != null) {
            return rechazo;
        }
        ImportarLineasResultado result = service.previewImportar(id, lineas);
        return ResponseEntity.ok(ResponseDTO.success("Preview importación", result));
    }

    @PostMapping("/paquetes/{id}/importar/confirmar")
    public ResponseEntity<ResponseDTO> importarConfirmar(
            @PathVariable Long id,
            // maxResults / LIMIT 500 — tope explícito (SCALE1)
            @RequestBody List<PaqueteLineaRequest> lineas) {
        ResponseEntity<ResponseDTO> rechazo = rechazoSiImportExcede(lineas);
        if (rechazo != null) {
            return rechazo;
        }
        ImportarLineasResultado result = service.confirmarImportar(id, lineas);
        if (!result.getErrores().isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Importación con errores", result));
        }
        return ResponseEntity.ok(ResponseDTO.success("Importación confirmada", result));
    }

    /**
     * Rechaza importaciones oversized (no truncar). El servicio también valida;
     * aquí devolvemos 400 claro antes de procesar.
     */
    private static ResponseEntity<ResponseDTO> rechazoSiImportExcede(List<PaqueteLineaRequest> lineas) {
        int size = lineas == null ? 0 : lineas.size();
        if (size > MAX_LINEAS_IMPORT) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                    "Máximo " + MAX_LINEAS_IMPORT + " líneas por importación (recibidas: " + size + ")"));
        }
        return null;
    }

    private static String correo(UserDetails user) {
        return user != null ? user.getUsername() : "sistema";
    }
}
