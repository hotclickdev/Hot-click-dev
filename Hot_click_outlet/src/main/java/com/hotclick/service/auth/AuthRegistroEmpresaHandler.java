package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.EmprendedorRegistroService;
import com.hotclick.service.OtpService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TurnstileService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthRegistroEmpresaHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthRegistroEmpresaHandler.class);

    @Autowired private EmprendedorRegistroService emprendedorRegistroService;
    @Autowired private OtpService                  otpService;
    @Autowired private SecurityAuditService        securityAuditService;
    @Autowired private TurnstileService            turnstileService;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<ResponseDTO> registroEmpresa(RegistroEmpresaDTO dto, HttpServletRequest httpRequest) {
        if (!turnstileService.verify(dto.getTurnstileToken(), securityAuditService.getIp(httpRequest))) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Verificación anti-bot fallida. Intentá de nuevo."));
        }
        try {
            Usuario emprendedor = emprendedorRegistroService.registrar(dto);
            boolean otpEnviado = false;
            String otpError = null;
            try {
                otpService.enviarOtp(emprendedor, Constants.OTP_TIPO_REGISTRO);
                otpEnviado = true;
            } catch (Exception e) {
                log.error("[registro-empresa] Error al enviar OTP a {}: {}", emprendedor.getCorreo(), e.getMessage(), e);
                otpError = e.getMessage();
            }
            AuthResponse authResponse = authSupport.buildAuthResponse(emprendedor);
            Map<String, Object> resultado = buildRegistroResultado(authResponse, otpEnviado, otpError);
            return ResponseEntity.ok(ResponseDTO.success("Empresa registrada exitosamente", resultado));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[registro-empresa] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al registrar la empresa"));
        }
    }

    private Map<String, Object> buildRegistroResultado(AuthResponse authResponse, boolean otpEnviado, String otpError) {
        Map<String, Object> resultado = new HashMap<>();
        resultado.put("accessToken",  authResponse.getAccessToken());
        resultado.put("refreshToken", authResponse.getRefreshToken());
        resultado.put("id",           authResponse.getId());
        resultado.put("correo",       authResponse.getCorreo());
        resultado.put("rol",          authResponse.getRol());
        resultado.put("nombre",       authResponse.getNombre());
        resultado.put("empresaId",    authResponse.getEmpresaId());
        resultado.put("empresaSlug",  authResponse.getEmpresaSlug());
        resultado.put("empresaNombre",authResponse.getEmpresaNombre());
        resultado.put("otpEnviado",   otpEnviado);
        if (otpError != null) resultado.put("otpError", otpError);
        return resultado;
    }
}
