package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.ResultadoAltaCupo;
import com.hotclick.dto.UbicacionDespachoAlta;
import com.hotclick.service.AltaEmprendedorNotificador;
import com.hotclick.service.BodegaDespachoInicialService;
import com.hotclick.service.CupoEmprendedorService;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.ModeracionAdminAvisoService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthNuevoNegocioHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthNuevoNegocioHandler.class);

    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private RolRepository            rolRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private CupoEmprendedorService   cupoEmprendedorService;
    @Autowired private AltaEmprendedorNotificador altaEmprendedorNotificador;
    @Autowired private JwtUtil                  jwtUtil;
    @Autowired private RefreshTokenService      refreshTokenService;
    @Autowired private UsuarioService           usuarioService;
    @Autowired private AuthSupport              authSupport;
    @Autowired private ModeracionAdminAvisoService moderacionAdminAvisoService;
    @Autowired private BodegaDespachoInicialService bodegaDespachoInicialService;

    @Transactional
    public ResponseEntity<?> nuevoNegocio(RegistroEmpresaDTO dto, HttpServletRequest request) {
        try {
            Usuario currentUser = authSupport.usuarioFromRequest(request);
            long negocios = miembroEmpresaRepository.countEmpresasByUsuarioId(currentUser.getId());
            if (negocios < 1) {
                // S2-multinegocio: «Crear otro» solo para cuentas que ya tienen al menos un negocio.
                return ResponseEntity.status(403).body(ResponseDTO.error("Esta opción es para cuentas que ya tienen un negocio."));
            }
            if (negocios >= 20) {
                return conCodigo(409, CODIGO_CUPO_NEGOCIOS, "Alcanzaste el límite de 20 negocios por cuenta");
            }

            ResponseEntity<?> validacion = validarDto(dto);
            if (validacion != null) return validacion;
            Optional<UbicacionDespachoAlta> ubicacion = bodegaDespachoInicialService.normalizar(dto.ubicacionDespacho());

            AltaNegocio alta = crearEmpresa(dto);
            miembroEmpresaRepository.save(new MiembroEmpresa(currentUser, alta.empresa(), "PROPIETARIO"));
            asegurarRolEmprendedor(currentUser);
            ubicacion.ifPresent(u -> bodegaDespachoInicialService.crear(alta.empresa(), currentUser, u));

            notificacionEmailService.enviarBienvenidaEmprendedor(
                currentUser.getCorreo(), currentUser.getNombre(),
                alta.empresa().getNombreComercial());
            altaEmprendedorNotificador.notificar(
                alta.empresa().getNombreComercial(), alta.empresa().getCorreoEmpresa(),
                alta.cupo());

            return ResponseEntity.ok(ResponseDTO.success("Negocio creado exitosamente", buildAuthResponse(currentUser, alta.empresa())));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[nuevo-negocio] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al crear el negocio"));
        }
    }

    /** Códigos estables para «Crear otro negocio» (Frontend #172, punto 10). */
    public static final String CODIGO_NOMBRE_EN_USO = "NOMBRE_NEGOCIO_EN_USO";
    public static final String CODIGO_CUPO_NEGOCIOS = "CUPO_NEGOCIOS";

    static ResponseEntity<java.util.Map<String, Object>> conCodigo(int status, String code, String message) {
        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("success", false);
        body.put("code", code);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }

    private ResponseEntity<?> validarDto(RegistroEmpresaDTO dto) {
        if (dto.getNombreEmpresa() == null || dto.getNombreEmpresa().isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre del negocio es requerido"));
        }
        if (dto.getCorreoEmpresa() == null || dto.getCorreoEmpresa().isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo oficial del negocio es requerido"));
        }
        if (nombreEnUso(dto.getNombreEmpresa())) {
            return conCodigo(409, CODIGO_NOMBRE_EN_USO, "Ese nombre de negocio ya está en uso. Probá con otro.");
        }
        String correoEmpresa = dto.getCorreoEmpresa().trim().toLowerCase();
        if (empresaRepository.existsByCorreoEmpresa(correoEmpresa)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Ese correo de negocio ya está en uso"));
        }
        return null;
    }

    /**
     * Nombre único normalizado (mayúsculas, tildes, espacios). Chequeo en Java mientras no esté
     * feat/negocio-nombre-unico (columna nombre_normalizado + índice único) del Desarrollador.
     */
    boolean nombreEnUso(String nombre) {
        String n = com.hotclick.service.negocio.NombreNegocioNormalizador.normalizar(nombre);
        return empresaRepository.findAllNombres().stream()
            .anyMatch(x -> n.equals(com.hotclick.service.negocio.NombreNegocioNormalizador.normalizar(x)));
    }

    private AltaNegocio crearEmpresa(RegistroEmpresaDTO dto) {
        String slug = authSupport.slugify(dto.getNombreEmpresa());
        int i = 2;
        String base = slug;
        while (empresaRepository.existsBySlug(slug)) { slug = base + "-" + i++; }

        String correoEmpresa = dto.getCorreoEmpresa().trim().toLowerCase();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa(dto.getNombreEmpresa().trim());
        empresa.setNombreComercial(dto.getNombreComercial() != null && !dto.getNombreComercial().isBlank()
            ? dto.getNombreComercial().trim() : dto.getNombreEmpresa().trim());
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(correoEmpresa);
        empresa.setTelefonoEmpresa(dto.getTelefonoEmpresa());
        // TODO(#41): plan inicial del negocio nuevo sin decidir. Hoy entra como Emprendedor y cuenta
        // para el cupo de 70 (reserva atómica). Pyme/Negocio Plus: cada empresa tiene su propia
        // suscripción (Suscripcion por empresa_id), se cobra por separado al cambiar de plan.
        ResultadoAltaCupo cupo = cupoEmprendedorService.aplicarAlta(empresa, correoEmpresa);
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa.setEstado(Constants.ESTADO_ACTIVO);
        Empresa guardada = empresaRepository.save(empresa);
        moderacionAdminAvisoService.avisarEmpresaPendiente(
            guardada.getId(),
            guardada.getNombreComercial() != null ? guardada.getNombreComercial() : guardada.getNombreEmpresa());
        return new AltaNegocio(guardada, cupo);
    }

    private record AltaNegocio(Empresa empresa, ResultadoAltaCupo cupo) {}

    private void asegurarRolEmprendedor(Usuario currentUser) {
        boolean tieneRol = currentUser.getRoles().stream()
            .anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));
        if (!tieneRol) {
            rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
                .ifPresent(r -> { currentUser.getRoles().add(r); usuarioService.guardar(currentUser); });
        }
    }

    private AuthResponse buildAuthResponse(Usuario currentUser, Empresa empresa) {
        String rol         = Constants.ROL_EMPRENDEDOR;
        String accessToken = jwtUtil.generateToken(currentUser.getCorreo(), currentUser.getId(), rol, empresa.getId(), empresa.getSlug());
        refreshTokenService.crear(currentUser);
        String nombre      = currentUser.getNombre() != null ? currentUser.getNombre() : currentUser.getCorreo().split("@")[0];
        AuthResponse resp  = new AuthResponse(accessToken, null, currentUser.getId(), currentUser.getCorreo(), rol, nombre);
        resp.setEmpresaId(empresa.getId());
        resp.setEmpresaSlug(empresa.getSlug());
        resp.setEmpresaNombre(empresa.getNombreEmpresa());
        return resp;
    }
}
