package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.consola.IpConsentimientoHasher;
import com.hotclick.service.consola.TiendaRapidaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/tienda-rapida")
public class TiendaRapidaPublicController {

    private final TiendaRapidaService tiendas;
    private final ClientIpResolver ips;
    private final IpConsentimientoHasher hasher;

    public TiendaRapidaPublicController(TiendaRapidaService tiendas, ClientIpResolver ips, IpConsentimientoHasher hasher) {
        this.tiendas = tiendas;
        this.ips = ips;
        this.hasher = hasher;
    }

    @GetMapping("/{token}")
    public ResponseEntity<ResponseDTO> ver(@PathVariable String token) {
        return ResponseEntity.ok(ResponseDTO.success("Tienda rápida", tiendas.ver(token)));
    }

    /** Acepta la responsabilidad del negocio, guarda los datos y consume el enlace. */
    @PostMapping("/{token}")
    public ResponseEntity<ResponseDTO> aceptar(@PathVariable String token, @RequestBody Map<String, Object> body,
                                               HttpServletRequest request) {
        boolean acepto = Boolean.TRUE.equals(body.get("acepto"));
        return ResponseEntity.ok(ResponseDTO.success("Datos guardados", tiendas.aceptar(
            token, acepto, texto(body.get("versionLegal")), hasher.hash(ips.resolve(request)),
            texto(body.get("persona")), texto(body.get("cedula")), texto(body.get("correo")),
            texto(body.get("telefono")), texto(body.get("clave")))));
    }

    private static String texto(Object valor) {
        return valor == null ? null : valor.toString();
    }
}
