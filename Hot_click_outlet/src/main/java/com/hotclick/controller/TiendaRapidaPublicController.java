package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.TiendaRapidaAceptarDTO;
import jakarta.validation.Valid;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.consola.IpConsentimientoHasher;
import com.hotclick.service.consola.TiendaRapidaService;
import com.hotclick.service.PasswordResetService;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/public/tienda-rapida")
public class TiendaRapidaPublicController {

    private final TiendaRapidaService tiendas;
    private final ClientIpResolver ips;
    private final IpConsentimientoHasher hasher;
    private final PasswordResetService claves;
    private static final Logger log = LoggerFactory.getLogger(TiendaRapidaPublicController.class);

    /** S1-18: piso de tiempo al aceptar; un correo o cédula ya usados tardan lo mismo que un alta nueva. */
    @org.springframework.beans.factory.annotation.Value("${hotclick.registro.respuesta-min-ms:900}")
    long respuestaMinMs;

    public TiendaRapidaPublicController(TiendaRapidaService tiendas, ClientIpResolver ips, IpConsentimientoHasher hasher,
                                        PasswordResetService claves) {
        this.tiendas = tiendas;
        this.claves = claves;
        this.ips = ips;
        this.hasher = hasher;
    }

    @GetMapping("/{token}")
    public ResponseEntity<ResponseDTO> ver(@PathVariable String token) {
        return ResponseEntity.ok(ResponseDTO.success("Tienda rápida", tiendas.ver(token)));
    }

    /** Acepta la responsabilidad del negocio, guarda los datos y consume el enlace. */
    @PostMapping("/{token}")
    public ResponseEntity<ResponseDTO> aceptar(@PathVariable String token, @Valid @RequestBody TiendaRapidaAceptarDTO body,
                                               HttpServletRequest request) {
        long inicio = System.nanoTime();
        try {
            return aceptarSinPiso(token, body, request);
        } catch (com.hotclick.exception.RegistroDuplicadoException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage(), e.datosRespuesta()));
        } finally {
            com.hotclick.security.RespuestaUniforme.esperarMinimo(inicio, respuestaMinMs);
        }
    }

    private ResponseEntity<ResponseDTO> aceptarSinPiso(String token, TiendaRapidaAceptarDTO body, HttpServletRequest request) {
        Map<String, Object> datos = tiendas.aceptar(
            token, Boolean.TRUE.equals(body.acepto()), body.versionLegal(), hasher.hash(ips.resolve(request)),
            body.persona(), body.cedula(), body.correo(), body.telefono());
        // Ya confirmado: se manda el código para definir la contraseña. Si el correo falla, la tienda
        // queda guardada y el dueño puede pedirlo de nuevo en /recuperar-contrasena.
        try {
            claves.enviarCodigo(String.valueOf(datos.get("correo")));
        } catch (RuntimeException e) {
            log.warn("[tienda-rapida] no se pudo enviar el código para definir la clave: {}", e.getClass().getSimpleName());
        }
        return ResponseEntity.ok(ResponseDTO.success("Datos guardados", datos));
    }
}
