package com.hotclick.controller;

import com.hotclick.dto.CompraD105Resumen;
import com.hotclick.dto.ReporteD105;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.d105.CompraD105Service;
import com.hotclick.service.d105.CompraXmlD105Parser;
import com.hotclick.service.d105.FotoCompra;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/admin/d105")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('global.metrics')")
public class CompraD105Controller {

    private final CompraD105Service service;
    private final CompanyScope companyScope;

    public CompraD105Controller(CompraD105Service service, CompanyScope companyScope) {
        this.service = service;
        this.companyScope = companyScope;
    }

    @PostMapping(value = "/compras", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseDTO> cargar(@RequestParam("archivo") MultipartFile archivo,
                                              @RequestParam(value = "foto", required = false) MultipartFile foto) {
        if (archivo == null || archivo.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El archivo está vacío"));
        }
        if (archivo.getSize() > CompraXmlD105Parser.MAX_XML_BYTES) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El XML no puede superar 2 MB"));
        }
        String nombre = archivo.getOriginalFilename() == null ? "" : archivo.getOriginalFilename().toLowerCase();
        if (!nombre.endsWith(".xml")) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El archivo debe ser XML"));
        }
        try {
            CompraD105Resumen guardada = service.cargar(
                archivo.getBytes(), foto, companyScope.getCurrentUserId());
            return ResponseEntity.ok(ResponseDTO.success("Compra registrada", guardada));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se pudo leer el archivo"));
        }
    }

    @GetMapping("/compras")
    public ResponseEntity<Page<CompraD105Resumen>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listar(page, size));
    }

    @GetMapping("/compras/{id}/foto")
    public ResponseEntity<byte[]> foto(@PathVariable Long id) {
        FotoCompra foto = service.foto(id);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(foto.contentType()))
            .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
            .body(foto.bytes());
    }

    @GetMapping("/reporte")
    public ResponseEntity<ResponseDTO> reporte(@RequestParam int anio, @RequestParam String trimestre) {
        try {
            ReporteD105 reporte = service.reporte(anio, trimestre);
            return ResponseEntity.ok(ResponseDTO.success("Compras netas del trimestre", reporte));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
