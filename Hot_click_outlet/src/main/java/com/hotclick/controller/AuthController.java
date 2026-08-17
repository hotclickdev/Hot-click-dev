package com.hotclick.controller;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.RegisterRequest;
import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.UpgradeEmprendedorDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.auth.AuthLoginService;
import com.hotclick.service.auth.AuthRegistrationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthRegistrationService authRegistrationService;
    @Autowired private AuthLoginService        authLoginService;

    // ── Registro ──────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> register(@Valid @RequestBody RegisterRequest req) {
        return authRegistrationService.register(req);
    }

    /**
     * Upgrades an authenticated USUARIO_FINAL to EMPRENDEDOR by registering their business.
     * Used after social login (Clerk) when the user wants to sell on HOTCLICK.
     */
    @PostMapping("/upgrade-emprendedor")
    public ResponseEntity<ResponseDTO> upgradeEmprendedor(@RequestBody UpgradeEmprendedorDTO dto,
                                                          HttpServletRequest request) {
        return authRegistrationService.upgradeEmprendedor(dto, request);
    }

    @PostMapping("/registro-empresa")
    public ResponseEntity<ResponseDTO> registroEmpresa(@RequestBody RegistroEmpresaDTO dto, HttpServletRequest httpRequest) {
        return authRegistrationService.registroEmpresa(dto, httpRequest);
    }

    @PostMapping("/reenviar-codigo-negocio")
    public ResponseEntity<ResponseDTO> reenviarCodigoNegocio(HttpServletRequest request) {
        return authRegistrationService.reenviarCodigoNegocio(request);
    }

    @PostMapping("/verificar-correo-negocio")
    public ResponseEntity<ResponseDTO> verificarCorreoNegocio(@RequestBody Map<String, String> body) {
        return authRegistrationService.verificarCorreoNegocio(body);
    }

    // ── Cambiar negocio activo desde sesión ya autenticada ───────────────────

    @PostMapping("/cambiar-negocio")
    public ResponseEntity<?> cambiarNegocio(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        return authLoginService.cambiarNegocio(body, request);
    }

    // ── Listar negocios del usuario autenticado ───────────────────────────────

    @GetMapping("/mis-negocios")
    public ResponseEntity<?> misNegocios(HttpServletRequest request) {
        return authLoginService.misNegocios(request);
    }

    // ── Seleccionar empresa tras login multi-negocio ──────────────────────────

    @PostMapping("/seleccionar-empresa")
    public ResponseEntity<?> seleccionarEmpresa(@RequestBody Map<String, Object> body) {
        return authLoginService.seleccionarEmpresa(body);
    }

    // ── Crear segundo negocio desde cuenta existente ──────────────────────────

    @PostMapping("/nuevo-negocio")
    public ResponseEntity<?> nuevoNegocio(@RequestBody RegistroEmpresaDTO dto, HttpServletRequest request) {
        return authRegistrationService.nuevoNegocio(dto, request);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody JwtRequest request, HttpServletRequest httpRequest) {
        return authLoginService.login(request, httpRequest);
    }

    // ── Refresh access token ──────────────────────────────────────────────────

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        return authLoginService.refresh(body);
    }

    // ── Logout — revoca refresh token ─────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<ResponseDTO> logout(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        return authLoginService.logout(body, httpRequest);
    }

    // ── Cambiar contraseña (autenticado) ──────────────────────────────────────

    @PostMapping("/change-password")
    public ResponseEntity<ResponseDTO> changePassword(@RequestBody Map<String, String> body,
                                                      HttpServletRequest request) {
        return authLoginService.changePassword(body, request);
    }

    // ── 2FA ───────────────────────────────────────────────────────────────────

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        return authLoginService.verify2FA(body, httpRequest);
    }

    @PostMapping("/2fa/email/send")
    public ResponseEntity<ResponseDTO> sendLoginEmailOtp(@RequestBody Map<String, String> body) {
        return authLoginService.sendLoginEmailOtp(body);
    }

    @PostMapping("/2fa/email/enable")
    public ResponseEntity<ResponseDTO> enableEmailOtp(HttpServletRequest request) {
        return authLoginService.enableEmailOtp(request);
    }

    @PostMapping("/2fa/email/activate")
    public ResponseEntity<ResponseDTO> activateEmailOtp(@RequestBody Map<String, String> body,
                                                         HttpServletRequest request) {
        return authLoginService.activateEmailOtp(body, request);
    }

    @PostMapping("/2fa/email/disable")
    public ResponseEntity<ResponseDTO> disableEmailOtp(@RequestBody Map<String, String> body,
                                                        HttpServletRequest request) {
        return authLoginService.disableEmailOtp(body, request);
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<ResponseDTO> setup2FA(HttpServletRequest request) {
        return authLoginService.setup2FA(request);
    }

    @PostMapping("/2fa/activate")
    public ResponseEntity<ResponseDTO> activate2FA(@RequestBody Map<String, String> body,
                                                    HttpServletRequest request) {
        return authLoginService.activate2FA(body, request);
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<ResponseDTO> disable2FA(@RequestBody Map<String, String> body,
                                                   HttpServletRequest request) {
        return authLoginService.disable2FA(body, request);
    }

    @PostMapping("/2fa/recovery-codes/regenerate")
    public ResponseEntity<ResponseDTO> regenerateRecoveryCodes(@RequestBody Map<String, String> body,
                                                               HttpServletRequest request) {
        return authLoginService.regenerateRecoveryCodes(body, request);
    }

    @GetMapping("/2fa/status")
    public ResponseEntity<ResponseDTO> status2FA(HttpServletRequest request) {
        return authLoginService.status2FA(request);
    }

    // ── Verificación por correo ───────────────────────────────────────────────

    @PostMapping("/send-verification")
    public ResponseEntity<ResponseDTO> sendVerification(@RequestBody Usuario usuario) {
        return authLoginService.sendVerification(usuario);
    }

    @PostMapping("/verify-registration")
    public ResponseEntity<ResponseDTO> verifyRegistration(@RequestBody Map<String, String> body) {
        return authLoginService.verifyRegistration(body);
    }

    // ── Recuperar contraseña ──────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<ResponseDTO> forgotPassword(@RequestBody Map<String, String> body) {
        return authLoginService.forgotPassword(body);
    }

    @PostMapping("/verify-code")
    public ResponseEntity<ResponseDTO> verifyCode(@RequestBody Map<String, String> body) {
        return authLoginService.verifyCode(body);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ResponseDTO> resetPassword(@RequestBody Map<String, String> body) {
        return authLoginService.resetPassword(body);
    }
}
