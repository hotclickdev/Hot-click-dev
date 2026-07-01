package com.hotclick.controller;

import com.hotclick.dto.AiProductoGeneradoDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AiGenerationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Generación de fichas de producto con IA a partir de una foto.
 * Protegido por SecurityConfig: /api/admin/** requiere ADMIN, EMPRENDEDOR.
 */
@RestController
@RequestMapping("/api/admin/productos")
public class AiProductoController {

    @Autowired private AiGenerationService aiGenerationService;
    @Autowired private CompanyScope        companyScope;

    @PostMapping(value = "/generar-ia", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseDTO> generarFichaConIa(
            @RequestPart("imagen") MultipartFile imagen,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String marca) {

        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) {
            return ResponseEntity.badRequest()
                .body(ResponseDTO.error("No se pudo determinar el contexto de empresa."));
        }

        AiProductoGeneradoDTO resultado = aiGenerationService.generarFichaProducto(
            empresaId, imagen, categoria, marca);

        return ResponseEntity.ok(ResponseDTO.success("Ficha generada con IA", resultado));
    }
}
