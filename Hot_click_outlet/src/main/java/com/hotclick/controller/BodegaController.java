package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Bodega;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import com.hotclick.utils.CoordenadaMapa;
import com.hotclick.utils.InputSanitizer;
import com.hotclick.utils.TelefonoBodega;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/bodegas")
public class BodegaController {

    private static final Logger log = LoggerFactory.getLogger(BodegaController.class);
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");
    /** Mismo texto que {@code ERROR_GUARDAR_BODEGA} del front; no se devuelve el mensaje crudo de la excepción. */
    static final String MENSAJE_ERROR_GUARDAR = "No se pudo guardar la bodega.";
    /** Mismo texto que el 403 de {@code TenantAccessDeniedException} para recursos sin empresa. */
    static final String MENSAJE_SIN_EMPRESA = "Acceso denegado: recurso sin empresa asignada";

    @Autowired private BodegaRepository  bodegaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private CompanyScope      companyScope;
    @Autowired private com.hotclick.repository.EmpresaRepository empresaRepository;
    @Autowired private com.hotclick.service.TenantService         tenantService;
    @Autowired private InputSanitizer    sanitizer;
    @Autowired private com.hotclick.service.UbicacionDespachoService ubicacionDespachoService;

    @Transactional(readOnly = true)
    @GetMapping
    public ResponseEntity<ResponseDTO> listar(@RequestParam(required = false) Long empresaId) {
        var dtos = bodegasVisibles(empresaId).stream().map(b -> {
            var m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", b.getId());
            m.put("nombreBodega", b.getNombreBodega());
            m.put("direccionExacta", b.getDireccionExacta());
            m.put("telefono", b.getTelefono());
            m.put("correoContacto", b.getCorreoContacto());
            m.put("encargadoNombre", b.getEncargadoNombre());
            m.put("provincia", b.getProvincia());
            m.put("canton", b.getCanton());
            m.put("distrito", b.getDistrito());
            m.put("permiteRetiroCliente", b.getPermiteRetiroCliente());
            m.put("aceptaEfectivo", b.getAceptaEfectivo());
            m.put("latitud", b.getLatitud());
            m.put("longitud", b.getLongitud());
            m.put("horarioApertura", horaTexto(b.getHorarioApertura()));
            m.put("horarioCierre", horaTexto(b.getHorarioCierre()));
            m.put("estado", b.getEstado());
            if (b.getEmpresa() != null) {
                m.put("empresaId", b.getEmpresa().getId());
                m.put("empresaNombre", b.getEmpresa().getNombreEmpresa());
                m.put("empresaLogoUrl", b.getEmpresa().getLogoUrl());
            }
            return m;
        }).toList();
        return ResponseEntity.ok(ResponseDTO.success("Bodegas", dtos));
    }

    @GetMapping("/ubicacion-despacho")
    public ResponseEntity<ResponseDTO> ubicacionDespacho() {
        var estado = ubicacionDespachoService.estadoDe(companyScope.getCurrentEmpresaIdOrOwn());
        return ResponseEntity.ok(ResponseDTO.success("Ubicación de despacho", estado));
    }

    /**
     * SEC-11: solo ADMIN o EMPRENDEDOR. La empresa sale de la sesión (cualquier empresa del body se
     * ignora); sin empresa en la sesión solo un IT Admin puede crear (bodega legacy sin empresa).
     */
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails ud) {
        Long eid = empresaDeLaSesion();
        if (eid == null && !esAdminSinImpersonar()) return sinEmpresa();
        // Verificación de límite de plan — propaga PlanLimitException → GlobalExceptionHandler (HTTP 403)
        if (eid != null) tenantService.verificarLimiteBodegas(eid);

        try {
            if (body.get("nombreBodega") == null || body.get("nombreBodega").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es obligatorio"));
            if (body.get("direccionExacta") == null || body.get("direccionExacta").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("La dirección es obligatoria"));
            if (body.get("telefono") == null || body.get("telefono").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El teléfono es obligatorio"));
            String telefono = TelefonoBodega.normalizar(body.get("telefono"));
            var empresa = eid != null ? empresaRepository.findById(eid).orElse(null) : null;
            Bodega b = new Bodega();
            b.setNombreBodega(body.get("nombreBodega").trim());
            b.setDireccionExacta(body.get("direccionExacta").trim());
            b.setTelefono(telefono);
            b.setCorreoContacto(body.getOrDefault("correoContacto", ""));
            b.setEncargadoNombre(body.getOrDefault("encargadoNombre", ""));
            b.setProvincia(sanitizer.normalizeGeo(body.get("provincia")));
            b.setCanton(sanitizer.normalizeGeo(body.get("canton")));
            b.setDistrito(sanitizer.normalizeGeo(body.get("distrito")));
            b.setPermiteRetiroCliente(Boolean.parseBoolean(body.get("permiteRetiroCliente")));
            b.setAceptaEfectivo(Boolean.parseBoolean(body.get("aceptaEfectivo")));
            aplicarCoordenadas(b, body);
            b.setHorarioApertura(parseHora(body.get("horarioApertura"), "de apertura"));
            b.setHorarioCierre(parseHora(body.get("horarioCierre"), "de cierre"));
            b.setEstado(Constants.ESTADO_ACTIVO);
            b.setEmpresa(empresa);
            b.setAdminCliente(
                usuarioRepository.findByCorreo(ud.getUsername())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Admin no encontrado"))
            );
            return ResponseEntity.ok(ResponseDTO.success("Bodega creada", bodegaRepository.save(b)));
        } catch (IllegalArgumentException | RecursoNoEncontradoException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return errorGuardar("crear", e);
        }
    }

    /** SEC-11: mismas reglas que {@link #crear}. Las filas con teléfono inválido se omiten (SEC-08). */
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @PostMapping("/bulk")
    public ResponseEntity<ResponseDTO> importarBulk(
            @RequestBody List<Map<String, String>> items,
            @AuthenticationPrincipal UserDetails ud) {
        Long eid2 = empresaDeLaSesion();
        if (eid2 == null && !esAdminSinImpersonar()) return sinEmpresa();
        var admin = usuarioRepository.findByCorreo(ud.getUsername())
            .orElseThrow(() -> new RecursoNoEncontradoException("Admin no encontrado"));
        // Verifica que el lote completo quepa dentro del plan antes de procesar (HTTP 403 si no)
        if (eid2 != null) tenantService.verificarLimiteBodegasBulk(eid2, items.size());
        var empresa = eid2 != null ? empresaRepository.findById(eid2).orElse(null) : null;
        int ok = 0; int errors = 0;
        for (Map<String, String> item : items) {
            String nombre = item.get("nombreBodega");
            String dir    = item.get("direccionExacta");
            String tel    = item.get("telefono");
            if (nombre == null || nombre.isBlank() || dir == null || dir.isBlank() || tel == null || tel.isBlank()) {
                errors++;
                continue;
            }
            String telefono;
            try {
                telefono = TelefonoBodega.normalizar(tel);
            } catch (IllegalArgumentException e) {
                errors++;
                continue;
            }
            Bodega b = new Bodega();
            b.setNombreBodega(nombre.trim());
            b.setDireccionExacta(dir.trim());
            b.setTelefono(telefono);
            b.setCorreoContacto(item.getOrDefault("correoContacto", ""));
            b.setEncargadoNombre(item.getOrDefault("encargadoNombre", ""));
            b.setProvincia(sanitizer.normalizeGeo(item.get("provincia")));
            b.setCanton(sanitizer.normalizeGeo(item.get("canton")));
            b.setEstado(Constants.ESTADO_ACTIVO);
            b.setEmpresa(empresa);
            b.setAdminCliente(admin);
            bodegaRepository.save(b);
            ok++;
        }
        String msg = "Importadas: " + ok + " bodegas" + (errors > 0 ? ", omitidas por datos incompletos: " + errors : "");
        return ResponseEntity.ok(ResponseDTO.success(msg, Map.of("ok", ok, "errors", errors)));
    }

    /** SEC-11: solo ADMIN o EMPRENDEDOR de la empresa de la bodega (otra empresa → 403). */
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Bodega b = bodegaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega no encontrada"));
            companyScope.assertCanAccessNullable(b.getEmpresaId());
            if (body.get("nombreBodega") != null && !body.get("nombreBodega").isBlank())
                b.setNombreBodega(body.get("nombreBodega").trim());
            if (body.get("direccionExacta") != null && !body.get("direccionExacta").isBlank())
                b.setDireccionExacta(body.get("direccionExacta").trim());
            if (body.get("telefono") != null && !body.get("telefono").isBlank())
                b.setTelefono(TelefonoBodega.normalizar(body.get("telefono")));
            if (body.get("correoContacto") != null)
                b.setCorreoContacto(body.get("correoContacto"));
            if (body.get("encargadoNombre") != null)
                b.setEncargadoNombre(body.get("encargadoNombre"));
            if (body.containsKey("provincia"))
                b.setProvincia(sanitizer.normalizeGeo(body.get("provincia")));
            if (body.containsKey("canton"))
                b.setCanton(sanitizer.normalizeGeo(body.get("canton")));
            if (body.containsKey("distrito"))
                b.setDistrito(sanitizer.normalizeGeo(body.get("distrito")));
            if (body.containsKey("permiteRetiroCliente"))
                b.setPermiteRetiroCliente(Boolean.parseBoolean(body.get("permiteRetiroCliente")));
            if (body.containsKey("aceptaEfectivo"))
                b.setAceptaEfectivo(Boolean.parseBoolean(body.get("aceptaEfectivo")));
            if (body.containsKey("latitud") || body.containsKey("longitud"))
                aplicarCoordenadas(b, body);
            if (body.containsKey("horarioApertura"))
                b.setHorarioApertura(parseHora(body.get("horarioApertura"), "de apertura"));
            if (body.containsKey("horarioCierre"))
                b.setHorarioCierre(parseHora(body.get("horarioCierre"), "de cierre"));
            return ResponseEntity.ok(ResponseDTO.success("Bodega actualizada", bodegaRepository.save(b)));
        } catch (AccessDeniedException | com.hotclick.exception.TenantAccessDeniedException e) {
            throw e;
        } catch (IllegalArgumentException | RecursoNoEncontradoException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return errorGuardar("actualizar", e);
        }
    }

    /** SEC-11: solo ADMIN o EMPRENDEDOR de la empresa de la bodega (otra empresa → 403). */
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Bodega b = bodegaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Bodega no encontrada"));
            companyScope.assertCanAccessNullable(b.getEmpresaId());
            b.setEstado(Constants.ESTADO_INACTIVO);
            bodegaRepository.save(b);
            return ResponseEntity.ok(ResponseDTO.success("Bodega eliminada", null));
        } catch (AccessDeniedException | com.hotclick.exception.TenantAccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    private static void aplicarCoordenadas(Bodega bodega, Map<String, String> body) {
        String latitud = body.get("latitud");
        String longitud = body.get("longitud");
        boolean vacio = (latitud == null || latitud.isBlank()) && (longitud == null || longitud.isBlank());
        if (vacio) {
            bodega.setLatitud(null);
            bodega.setLongitud(null);
            return;
        }
        BigDecimal[] punto = CoordenadaMapa.parsear(latitud, longitud);
        if (punto == null) throw new IllegalArgumentException("La ubicación del mapa no es válida");
        bodega.setLatitud(punto[0]);
        bodega.setLongitud(punto[1]);
    }

    /** Acepta "HH:mm" o "HH:mm:ss"; vacío deja el horario sin definir. */
    private static LocalTime parseHora(String valor, String cual) {
        if (valor == null || valor.isBlank()) return null;
        try {
            return LocalTime.parse(valor.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Horario " + cual + " inválido: usá el formato HH:mm");
        }
    }

    private static String horaTexto(LocalTime hora) {
        return hora != null ? hora.format(FORMATO_HORA) : null;
    }

    /** Empresa de la sesión (JWT / impersonación); nunca la del body. */
    private Long empresaDeLaSesion() {
        return companyScope.getCurrentEmpresaIdOrOwn();
    }

    private boolean esAdminSinImpersonar() {
        return companyScope.isAdminIT() && !companyScope.isImpersonating();
    }

    private static ResponseEntity<ResponseDTO> sinEmpresa() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error(MENSAJE_SIN_EMPRESA));
    }

    private static ResponseEntity<ResponseDTO> errorGuardar(String accion, Exception e) {
        log.warn("[bodegas] Error al {} bodega: {}", accion, e.toString());
        return ResponseEntity.badRequest().body(ResponseDTO.error(MENSAJE_ERROR_GUARDAR));
    }

    /**
     * Bodegas que el usuario actual puede listar (con datos de contacto).
     * <ul>
     *   <li>IT Admin (sin impersonar): todas, o las de {@code empresaId} si lo pide
     *       (ej. al elegir a quién asignar un import).</li>
     *   <li>Usuario de empresa o sesión de soporte: solo las de su empresa. El query param
     *       se ignora y las bodegas legacy sin empresa no se incluyen.</li>
     *   <li>Cualquier otro (comprador o staff sin empresa): lista vacía.</li>
     * </ul>
     */
    private List<Bodega> bodegasVisibles(Long empresaIdSolicitada) {
        if (companyScope.isAdminIT()) {
            return empresaIdSolicitada != null
                ? bodegaRepository.findByEmpresaIdOrNoEmpresaAndEstado(empresaIdSolicitada, Constants.ESTADO_ACTIVO)
                : bodegaRepository.findByEstado(Constants.ESTADO_ACTIVO);
        }
        Long scopeEmpresaId = companyScope.getCurrentEmpresaId();
        if (scopeEmpresaId == null) return List.of();
        return bodegaRepository.findByEmpresaIdAndEstado(scopeEmpresaId, Constants.ESTADO_ACTIVO);
    }
}
