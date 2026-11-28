package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioService;
import com.hotclick.service.fiscal.facturanegocio.XmlSeguro;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * "Mi dinero → Factura a HotClick". La empresa sale siempre de la sesión (CompanyScope); un registro de otro negocio
 * responde 404. Ver: todo el equipo (cajero incluido). Subir el XML: solo el propietario y nunca en sesión de soporte.
 */
@RestController
@RequestMapping("/api/empresa/facturas-hotclick")
public class EmpresaFacturaHotclickController {

    private final CompanyScope companyScope;
    private final PropietarioGuard propietarioGuard;
    private final FacturaNegocioService facturas;

    public EmpresaFacturaHotclickController(CompanyScope companyScope, PropietarioGuard propietarioGuard,
                                            FacturaNegocioService facturas) {
        this.companyScope = companyScope;
        this.propietarioGuard = propietarioGuard;
        this.facturas = facturas;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> resumen() {
        Long empresaId = companyScope.requireEmpresaId();
        return ResponseEntity.ok(ResponseDTO.success("Factura a HotClick", facturas.resumen(empresaId)));
    }

    @PostMapping(value = "/{id}/xml", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseDTO> subirXml(@PathVariable Long id,
                                                @RequestParam("xml") MultipartFile xml,
                                                @RequestParam(value = "respuesta", required = false) MultipartFile respuesta) {
        Long empresaId = companyScope.requireEmpresaId();
        if (companyScope.isImpersonating() || !propietarioGuard.puedeGestionarEmpresa(empresaId)) {
            return ResponseEntity.status(403).body(ResponseDTO.error("Solo el propietario del negocio puede subir la factura."));
        }
        if (demasiadoGrande(xml) || demasiadoGrande(respuesta)) {
            return ResponseEntity.status(413).body(ResponseDTO.error("Cada archivo puede pesar como máximo 1 MB."));
        }
        if (xml == null || xml.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Subí el XML de la factura."));
        }
        try {
            byte[] r = respuesta == null || respuesta.isEmpty() ? null : respuesta.getBytes();
            return ResponseEntity.ok(ResponseDTO.success("Factura revisada",
                facturas.subirXml(empresaId, id, xml.getBytes(), r)));
        } catch (FacturaNegocioService.LimiteSubidasException e) {
            return ResponseEntity.status(429).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ResponseDTO.error(e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("No se pudo leer el archivo."));
        }
    }

    private static boolean demasiadoGrande(MultipartFile f) {
        return f != null && f.getSize() > XmlSeguro.MAX_BYTES;
    }
}
