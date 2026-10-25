package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.RegisterRequest;
import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.UpgradeEmprendedorDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.legal.MayoriaEdad;
import com.hotclick.model.CodigoOtp;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.EmprendedorRegistroService;
import com.hotclick.service.OtpService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(AuthRegistrationService.class);

    @Autowired private UsuarioService               usuarioService;
    @Autowired private UsuarioRepository            usuarioRepository;
    @Autowired private PasswordEncoder              passwordEncoder;
    @Autowired private EmprendedorRegistroService   emprendedorRegistroService;
    @Autowired private OtpService                   otpService;
    @Autowired private TelegramService              telegramService;
    @Autowired private AuthSupport                  authSupport;
    @Autowired private AuthRegistroEmpresaHandler   registroEmpresaHandler;
    @Autowired private AuthNuevoNegocioHandler      nuevoNegocioHandler;
    @Autowired private TurnstileService             turnstileService;
    @Autowired private SecurityAuditService         securityAuditService;

    public ResponseEntity<ResponseDTO> register(RegisterRequest req, HttpServletRequest httpRequest) {
        if (!turnstileService.verify(req.getTurnstileToken(), securityAuditService.getIp(httpRequest))) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Verificación anti-bot fallida. Intentá de nuevo."));
        }
        try {
            MayoriaEdad.exigir(req.getDeclaraMayoriaEdad());
            Usuario usuario = new Usuario();
            usuario.setNombre(req.getNombre().trim());
            usuario.setApellidoPaterno(""); // P1-04: la columna es NOT NULL; antes daba 500 con el SQL
            usuario.setCorreo(com.hotclick.utils.CorreoNormalizer.normalizar(req.getCorreo()));
            usuario.setContrasenaHash(passwordEncoder.encode(req.getContrasena()));
            if (req.getTelefono() != null) usuario.setTelefono(req.getTelefono().trim());
            Usuario nuevo = usuarioService.registrarSolicitud(usuario);
            telegramService.enviar(String.format(
                "👤 *NUEVO REGISTRO*\n\n*Nombre:* %s\n*Correo:* %s\n*Teléfono:* %s",
                nuevo.getNombre(),
                nuevo.getCorreo(),
                nuevo.getTelefono() != null ? nuevo.getTelefono() : "—"));
            return ResponseEntity.ok(ResponseDTO.success(
                "Solicitud enviada. Un administrador revisará y activará tu cuenta pronto.", nuevo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(mensajeSeguro(e, "No se pudo completar el registro. Revisá los datos e intentá de nuevo.")));
        }
    }

    /**
     * Upgrades an authenticated USUARIO_FINAL to EMPRENDEDOR by registering their business.
     * Used after social login (Clerk) when the user wants to sell on HOTCLICK.
     */
    public ResponseEntity<ResponseDTO> upgradeEmprendedor(UpgradeEmprendedorDTO dto, HttpServletRequest request) {
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            Usuario upgraded = emprendedorRegistroService.upgradeExistingUser(
                usuario,
                dto.getNombreEmpresa(),
                dto.getNombreComercial(),
                dto.getTelefonoEmpresa(),
                dto.getCorreoEmpresa(),
                dto.getCedulaJuridica(),
                dto.getInscritoHacienda(),
                dto.getRegimenTributario(),
                dto.getNombreHacienda(),
                dto.ubicacionDespacho()
            );
            upgraded = usuarioRepository.findByCorreo(upgraded.getCorreo())
                .orElse(upgraded);
            AuthResponse resp = authSupport.buildAuthResponse(upgraded);
            return ResponseEntity.ok(ResponseDTO.success("Negocio registrado exitosamente", resp));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[upgrade-emprendedor] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al registrar el negocio"));
        }
    }

    public ResponseEntity<ResponseDTO> registroEmpresa(RegistroEmpresaDTO dto, HttpServletRequest httpRequest) {
        return registroEmpresaHandler.registroEmpresa(dto, httpRequest);
    }

    public ResponseEntity<ResponseDTO> reenviarCodigoNegocio(HttpServletRequest request) {
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            otpService.enviarOtp(usuario, Constants.OTP_TIPO_REGISTRO);
            return ResponseEntity.ok(ResponseDTO.success("Código reenviado a " + usuario.getCorreo(), null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[reenviar-codigo-negocio] {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(mensajeSeguro(e, "Error al reenviar el código")));
        }
    }

    public ResponseEntity<ResponseDTO> verificarCorreoNegocio(Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        try {
            Usuario usuario = usuarioService.buscarPorCorreo(correo.trim().toLowerCase())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
            CodigoOtp otp = otpService.verificarOtp(usuario, Constants.OTP_TIPO_REGISTRO, codigo.trim());
            otpService.marcarUsado(otp);
            usuario.setCorreoVerificado(true);
            usuarioRepository.save(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Correo verificado correctamente", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(mensajeSeguro(e, "No se pudo verificar el correo")));
        }
    }

    public ResponseEntity<?> nuevoNegocio(RegistroEmpresaDTO dto, HttpServletRequest request) {
        return nuevoNegocioHandler.nuevoNegocio(dto, request);
    }

    /**
     * P1-04: al cliente solo llegan mensajes de reglas de negocio; errores de base de datos, SQL o
     * constraints se registran en el log y el cliente recibe un texto genérico.
     */
    static String mensajeSeguro(Exception e, String generico) {
        boolean deNegocio = e instanceof IllegalArgumentException || e instanceof IllegalStateException
            || e.getClass().getName().startsWith("com.hotclick.");
        String msg = e.getMessage();
        if (!deNegocio || msg == null || msg.isBlank()) {
            if (!deNegocio) log.warn("[auth-registro] error técnico ocultado al cliente: {}", e.toString());
            return generico;
        }
        return msg;
    }
}
