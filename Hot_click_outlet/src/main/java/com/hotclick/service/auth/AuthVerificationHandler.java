package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.legal.MayoriaEdad;
import com.hotclick.model.Usuario;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TurnstileService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthVerificationHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthVerificationHandler.class);

    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private EmailVerificationService    emailVerificationService;
    @Autowired private AuthSupport                 authSupport;
    @Autowired private TurnstileService            turnstileService;
    @Autowired private SecurityAuditService        securityAuditService;

    /** Piso de tiempo del alta: un duplicado tarda lo mismo que un alta nueva (0 = sin piso). */
    @org.springframework.beans.factory.annotation.Value("${hotclick.registro.respuesta-min-ms:900}")
    long respuestaMinMs;

    public ResponseEntity<ResponseDTO> sendVerification(Usuario usuario, String turnstileToken, HttpServletRequest httpRequest) {
        if (!turnstileService.verify(turnstileToken, securityAuditService.getIp(httpRequest))) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Verificación anti-bot fallida. Intentá de nuevo."));
        }
        long inicio = System.nanoTime();
        try {
            prepararAltaSiAplica(usuario);
            emailVerificationService.iniciarRegistro(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Código de verificación enviado a tu correo", null));
        } catch (com.hotclick.exception.RegistroDuplicadoException e) {
            // Sin correo ni cédula en el log: es un caso esperado y el log no debe servir de oráculo.
            log.info("[send-verification] alta rechazada por duplicado");
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[send-verification] {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(mensajePublico(e)));
        } finally {
            com.hotclick.security.RespuestaUniforme.esperarMinimo(inicio, respuestaMinMs);
        }
    }

    static final String MSG_GENERICO = "No se pudo enviar el código. Revisá tus datos e intentá de nuevo.";
    static final String MSG_CONTRASENA = "La contraseña debe tener entre 8 y 128 caracteres";

    /**
     * ESC-3: solo los mensajes de validación propios llegan al cliente. Errores de base de datos,
     * de integraciones o inesperados (con SQL, tablas o datos personales) quedan en el log.
     */
    static String mensajePublico(Exception e) {
        boolean propio = e instanceof IllegalArgumentException || e instanceof IllegalStateException
            || e instanceof com.hotclick.exception.IntegracionExternaException;
        String msg = e.getMessage();
        if (!propio || msg == null || msg.isBlank() || msg.length() > 200) return MSG_GENERICO;
        return msg;
    }

    /** Alta nueva (trae contraseña): exige 18 años y hashea. Reenvío solo con correo: no. */
    private void prepararAltaSiAplica(Usuario usuario) {
        String clave = usuario.getContrasenaHash();
        if (clave == null || clave.isBlank()) {
            return;
        }
        if (clave.length() < AuthSupport.CONTRASENA_MIN || clave.length() > AuthSupport.CONTRASENA_MAX) {
            throw new IllegalArgumentException(MSG_CONTRASENA);
        }
        MayoriaEdad.exigir(usuario.getDeclaraMayoriaEdad());
        usuario.setContrasenaHash(passwordEncoder.encode(clave));
    }

    public ResponseEntity<ResponseDTO> verifyRegistration(Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        try {
            Usuario nuevo = emailVerificationService.verificarYRegistrar(correo.trim(), codigo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Cuenta creada exitosamente", authSupport.buildAuthResponse(nuevo)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }
}
