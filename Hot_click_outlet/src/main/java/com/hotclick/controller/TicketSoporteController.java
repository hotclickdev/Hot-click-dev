package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.TicketSoporteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Creación de tickets desde vendedores (Ayuda).
 * El inbox de plataforma vive en {@link AdminTicketSoporteController}.
 */
@RestController
@com.hotclick.security.PermiteLector // acción personal / de comprador
@RequestMapping("/api/soporte/tickets")
public class TicketSoporteController {

    private static final Logger log = LoggerFactory.getLogger(TicketSoporteController.class);

    private final TicketSoporteService ticketSoporteService;
    private final SupabaseStorageService supabaseStorageService;
    private static final com.hotclick.service.storage.StorageImageValidator IMAGEN =
        new com.hotclick.service.storage.StorageImageValidator();
    @org.springframework.beans.factory.annotation.Autowired
    private com.hotclick.security.CompanyScope companyScope;

    public TicketSoporteController(
            TicketSoporteService ticketSoporteService,
            SupabaseStorageService supabaseStorageService) {
        this.ticketSoporteService = ticketSoporteService;
        this.supabaseStorageService = supabaseStorageService;
    }

    @PostMapping("/fotos")
    public ResponseEntity<ResponseDTO> subirFoto(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se recibió ningún archivo"));
        }
        try {
            // #475: tipo (content-type + magic bytes) y tamaño (10 MB) se validan antes de tocar el storage
            IMAGEN.validarArchivo(file);
            // aislado por negocio: la carpeta sale del token, nunca del request
            Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
            String carpeta = empresaId != null ? "Soporte/Tickets/empresa-" + empresaId
                : "Soporte/Tickets/usuario-" + companyScope.getCurrentUserId();
            String url = supabaseStorageService.subirImagen(file, carpeta);
            return ResponseEntity.ok(ResponseDTO.success("Foto subida", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[soporte/tickets/fotos] Error al subir: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("Error al subir foto: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@RequestBody Map<String, String> body) {
        String titulo = body != null ? body.get("titulo") : null;
        String descripcion = body != null ? body.get("descripcion") : null;
        String fotoUrl = body != null ? body.get("fotoUrl") : null;
        return ResponseEntity.ok(ResponseDTO.success(
            "Ticket enviado con éxito",
            ticketSoporteService.crear(titulo, descripcion, fotoUrl)));
    }
}
