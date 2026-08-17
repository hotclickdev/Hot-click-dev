package com.hotclick.service.auth;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthLoginService {

    @Autowired private AuthLoginHandler            loginHandler;
    @Autowired private AuthTenantSwitchHandler     tenantSwitchHandler;
    @Autowired private AuthTotpHandler             totpHandler;
    @Autowired private AuthEmailOtpHandler         emailOtpHandler;
    @Autowired private AuthPasswordRecoveryHandler passwordRecoveryHandler;
    @Autowired private AuthVerificationHandler     verificationHandler;

    public ResponseEntity<?> login(JwtRequest request, HttpServletRequest httpRequest) {
        return loginHandler.login(request, httpRequest);
    }

    public ResponseEntity<?> refresh(Map<String, String> body) {
        return loginHandler.refresh(body);
    }

    public ResponseEntity<ResponseDTO> logout(Map<String, String> body, HttpServletRequest httpRequest) {
        return loginHandler.logout(body, httpRequest);
    }

    public ResponseEntity<ResponseDTO> changePassword(Map<String, String> body, HttpServletRequest request) {
        return loginHandler.changePassword(body, request);
    }

    public ResponseEntity<?> cambiarNegocio(Map<String, Object> body, HttpServletRequest request) {
        return tenantSwitchHandler.cambiarNegocio(body, request);
    }

    public ResponseEntity<?> misNegocios(HttpServletRequest request) {
        return tenantSwitchHandler.misNegocios(request);
    }

    public ResponseEntity<?> seleccionarEmpresa(Map<String, Object> body) {
        return tenantSwitchHandler.seleccionarEmpresa(body);
    }

    public ResponseEntity<?> verify2FA(Map<String, String> body, HttpServletRequest httpRequest) {
        return totpHandler.verify2FA(body, httpRequest);
    }

    public ResponseEntity<ResponseDTO> sendLoginEmailOtp(Map<String, String> body) {
        return emailOtpHandler.sendLoginEmailOtp(body);
    }

    public ResponseEntity<ResponseDTO> enableEmailOtp(HttpServletRequest request) {
        return emailOtpHandler.enableEmailOtp(request);
    }

    public ResponseEntity<ResponseDTO> activateEmailOtp(Map<String, String> body, HttpServletRequest request) {
        return emailOtpHandler.activateEmailOtp(body, request);
    }

    public ResponseEntity<ResponseDTO> disableEmailOtp(Map<String, String> body, HttpServletRequest request) {
        return emailOtpHandler.disableEmailOtp(body, request);
    }

    public ResponseEntity<ResponseDTO> setup2FA(HttpServletRequest request) {
        return totpHandler.setup2FA(request);
    }

    public ResponseEntity<ResponseDTO> activate2FA(Map<String, String> body, HttpServletRequest request) {
        return totpHandler.activate2FA(body, request);
    }

    public ResponseEntity<ResponseDTO> disable2FA(Map<String, String> body, HttpServletRequest request) {
        return totpHandler.disable2FA(body, request);
    }

    public ResponseEntity<ResponseDTO> regenerateRecoveryCodes(Map<String, String> body, HttpServletRequest request) {
        return totpHandler.regenerateRecoveryCodes(body, request);
    }

    public ResponseEntity<ResponseDTO> status2FA(HttpServletRequest request) {
        return totpHandler.status2FA(request);
    }

    public ResponseEntity<ResponseDTO> sendVerification(Usuario usuario) {
        return verificationHandler.sendVerification(usuario);
    }

    public ResponseEntity<ResponseDTO> verifyRegistration(Map<String, String> body) {
        return verificationHandler.verifyRegistration(body);
    }

    public ResponseEntity<ResponseDTO> forgotPassword(Map<String, String> body) {
        return passwordRecoveryHandler.forgotPassword(body);
    }

    public ResponseEntity<ResponseDTO> verifyCode(Map<String, String> body) {
        return passwordRecoveryHandler.verifyCode(body);
    }

    public ResponseEntity<ResponseDTO> resetPassword(Map<String, String> body) {
        return passwordRecoveryHandler.resetPassword(body);
    }
}
