package com.hotclick.controller;

import com.hotclick.model.Usuario;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.telegram.TelegramConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/telegram")
public class TelegramConfigController {

    private static final Logger log = LoggerFactory.getLogger(TelegramConfigController.class);

    @Autowired private TelegramClienteBotService bot;
    @Autowired private CompanyScope companyScope;
    @Autowired private TelegramConfigService telegramConfigService;
    @Autowired private TelegramAbusoService abusoService;

    @com.hotclick.security.PermiteLector // acción personal / de comprador
    @PostMapping("/vincular")
    public ResponseEntity<?> generarCodigo() {
        Usuario usuario = companyScope.getCurrentUser();
        if (usuario == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!bot.isConfigured() || bot.getBotUsername() == null || bot.getBotUsername().isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "TELEGRAM_CLIENT_BOT_USERNAME no está configurado."));
        }
        return ResponseEntity.ok(telegramConfigService.generarCodigo(usuario));
    }

    @GetMapping("/estado")
    public ResponseEntity<?> estado() {
        Usuario usuario = companyScope.getCurrentUser();
        if (usuario == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(telegramConfigService.estado(usuario.getId()));
    }

    @com.hotclick.security.PermiteLector // acción personal / de comprador
    @DeleteMapping("/vincular")
    public ResponseEntity<?> desvincular() {
        Usuario usuario = companyScope.getCurrentUser();
        if (usuario == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        telegramConfigService.desvincular(usuario.getId());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/equipo")
    public ResponseEntity<?> equipoVinculado() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null || !telegramConfigService.puedeGestionarEquipo(
                companyScope.isAdminIT(), companyScope.getCurrentUserId(), empresaId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(telegramConfigService.equipoVinculado(empresaId));
    }

    @DeleteMapping("/equipo/{usuarioId}")
    public ResponseEntity<?> revocarMiembro(@PathVariable Long usuarioId) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null || !telegramConfigService.puedeGestionarEquipo(
                companyScope.isAdminIT(), companyScope.getCurrentUserId(), empresaId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!telegramConfigService.revocarMiembro(usuarioId, empresaId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /**
     * Auditor 8 M-A: único camino para salir del bloqueo de 365 días del bot. Solo admin de
     * plataforma (además de la regla de URL /api/telegram/admin/** con ROLE_ADMIN; impersonando no
     * cuenta como admin). Auditado en hot_click_auditoria_admin_tb.
     */
    @PostMapping("/admin/desbloquear/{usuarioId}")
    public ResponseEntity<?> desbloquear(@PathVariable Long usuarioId) {
        if (!companyScope.isAdminIT()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return switch (abusoService.desbloquear(usuarioId)) {
            case NO_ENCONTRADA -> ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            case SIN_BLOQUEO -> ResponseEntity.ok(Map.of("ok", true, "desbloqueado", false));
            case DESBLOQUEADA -> ResponseEntity.ok(Map.of("ok", true, "desbloqueado", true));
        };
    }

    @PostMapping("/admin/webhook")
    public ResponseEntity<?> registrarWebhook() {
        if (!companyScope.isAdminIT()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!bot.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "TELEGRAM_CLIENT_BOT_TOKEN no está configurado."));
        }
        if (!bot.isWebhookSecretValido()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "TELEGRAM_CLIENT_WEBHOOK_SECRET vacío o inválido (A-Za-z0-9_-, 1-256)."));
        }
        try {
            String respuesta = telegramConfigService.registrarWebhook();
            return ResponseEntity.ok(Map.of("telegram", respuesta != null ? respuesta : ""));
        } catch (Exception e) {
            log.error("[telegram] setWebhook falló — {}: {}", e.getClass().getSimpleName(), com.hotclick.service.telegram.TelegramTexto.sinToken(e.getMessage()));
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", "setWebhook falló, ver logs"));
        }
    }
}
