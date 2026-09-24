package com.hotclick.service.auth;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.ResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthLoginHandler {

    @Autowired private AuthCredentialLoginHandler credentialLoginHandler;
    @Autowired private AuthRefreshHandler         refreshHandler;
    @Autowired private AuthPasswordChangeHandler  passwordChangeHandler;

    public ResponseEntity<?> login(JwtRequest request, HttpServletRequest httpRequest) {
        return credentialLoginHandler.login(request, httpRequest);
    }

    public ResponseEntity<?> refresh(Map<String, String> body,
                                     HttpServletRequest request,
                                     HttpServletResponse response) {
        return refreshHandler.refresh(body, request, response);
    }

    public ResponseEntity<ResponseDTO> logout(Map<String, String> body,
                                              HttpServletRequest httpRequest,
                                              HttpServletResponse response) {
        return refreshHandler.logout(body, httpRequest, response);
    }

    public ResponseEntity<ResponseDTO> changePassword(Map<String, String> body, HttpServletRequest request) {
        return passwordChangeHandler.changePassword(body, request);
    }
}
