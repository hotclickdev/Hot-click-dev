package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthTotpHandler {

    @Autowired private AuthTotpVerifyHandler   verifyHandler;
    @Autowired private AuthTotpSetupHandler    setupHandler;
    @Autowired private AuthTotpRecoveryHandler recoveryHandler;

    public ResponseEntity<?> verify2FA(Map<String, String> body, HttpServletRequest httpRequest) {
        return verifyHandler.verify2FA(body, httpRequest);
    }

    public ResponseEntity<ResponseDTO> setup2FA(HttpServletRequest request) {
        return setupHandler.setup2FA(request);
    }

    public ResponseEntity<ResponseDTO> activate2FA(Map<String, String> body, HttpServletRequest request) {
        return setupHandler.activate2FA(body, request);
    }

    public ResponseEntity<ResponseDTO> disable2FA(Map<String, String> body, HttpServletRequest request) {
        return setupHandler.disable2FA(body, request);
    }

    public ResponseEntity<ResponseDTO> regenerateRecoveryCodes(Map<String, String> body, HttpServletRequest request) {
        return recoveryHandler.regenerateRecoveryCodes(body, request);
    }

    public ResponseEntity<ResponseDTO> status2FA(HttpServletRequest request) {
        return setupHandler.status2FA(request);
    }
}
