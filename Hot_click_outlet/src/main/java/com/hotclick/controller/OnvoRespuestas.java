package com.hotclick.controller;

import com.hotclick.service.onvo.OnvoMarketplaceClient;
import com.hotclick.service.onvo.OnvoOnboardingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

/** Traduce los errores de ONVO a respuestas con código estable (409 / 503 / 400). */
final class OnvoRespuestas {

    private OnvoRespuestas() {}

    static ResponseEntity<?> ejecutar(Supplier<ResponseEntity<?>> accion) {
        try {
            return accion.get();
        } catch (OnvoOnboardingService.ConflictoOnvo e) {
            return error(HttpStatus.CONFLICT, e.code(), e.getMessage());
        } catch (OnvoMarketplaceClient.OnvoNoConfiguradoException e) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, OnvoOnboardingService.CODIGO_NO_CONFIGURADO, e.getMessage());
        }
    }

    static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("success", false);
        err.put("code", code);
        err.put("message", message);
        return ResponseEntity.status(status).body(err);
    }
}
