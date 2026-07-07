package com.hotclick.controller;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Endpoints del panel para vincular Telegram (Configuración → Telegram).
 *
 * Flujo de vinculación (Telegram no permite escribirle a un número de teléfono;
 * el usuario siempre inicia el chat):
 *   1. POST /api/telegram/vincular → código de un solo uso (10 min) + deep link
 *   2. El usuario toca t.me/{bot}?start={codigo} → Telegram manda /start CODIGO al webhook
 *   3. El bot guarda el chat_id y la vinculación queda ACTIVA
 */
@RestController
@RequestMapping("/api/telegram")
public class TelegramConfigController {

    private static final Logger log = LoggerFactory.getLogger(TelegramConfigController.class);

    /** Sin O/0/I/1 para que sea fácil de teclear si el deep link no abre. */
    private static final char[] ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int LARGO_CODIGO = 8;
    private static final int MINUTOS_EXPIRA = 10;

    private final SecureRandom random = new SecureRandom();

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private CompanyScope                  companyScope;

    // ── Vinculación propia ────────────────────────────────────────────────────

    @PostMapping("/vincular")
    public ResponseEntity<?> generarCodigo() {
        Usuario usuario = companyScope.getCurrentUser();
        if (usuario == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        if (!bot.isConfigured() || bot.getBotUsername() == null || bot.getBotUsername().isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "El bot de Telegram no está configurado en el servidor."));
        }

        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(usuario.getId())
            .orElseGet(() -> {
                TelegramVinculacion nueva = new TelegramVinculacion();
                nueva.setUsuario(usuario);
                return nueva;
            });

        String codigo = generarCodigoAleatorio();
        v.setCodigo(codigo);
        v.setCodigoExpira(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(MINUTOS_EXPIRA));
        if (!TelegramVinculacion.ACTIVA.equals(v.getEstado())) {
            v.setEstado(TelegramVinculacion.PENDIENTE);
        }
        vinculacionRepository.save(v);

        return ResponseEntity.ok(Map.of(
            "deepLink",    "https://t.me/" + bot.getBotUsername() + "?start=" + codigo,
            "codigo",      codigo,
            "expiraEnMin", MINUTOS_EXPIRA,
            "botUsername", bot.getBotUsername()
        ));
    }

    @GetMapping("/estado")
    public ResponseEntity<?> estado() {
        Usuario usuario = companyScope.getCurrentUser();
        if (usuario == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("configurado", bot.isConfigured());
        out.put("botUsername", bot.getBotUsername());

        vinculacionRepository.findByUsuarioId(usuario.getId()).ifPresentOrElse(v -> {
            out.put("vinculado", TelegramVinculacion.ACTIVA.equals(v.getEstado()));
            out.put("telegramUsername", v.getTelegramUsername());
            out.put("fechaVinculacion", v.getFechaVinculacion() != null ? v.getFechaVinculacion().toString() : null);
        }, () -> out.put("vinculado", false));

        return ResponseEntity.ok(out);
    }

    @DeleteMapping("/vincular")
    public ResponseEntity<?> desvincular() {
        Usuario usuario = companyScope.getCurrentUser();
        if (usuario == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        vinculacionRepository.findByUsuarioId(usuario.getId()).ifPresent(v -> {
            v.setEstado(TelegramVinculacion.REVOCADA);
            v.setChatId(null);
            v.setContexto(null);
            v.setCodigo(null);
            v.setCodigoExpira(null);
            vinculacionRepository.save(v);
        });
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── Gestión del equipo (solo PROPIETARIO/ADMIN de la empresa) ─────────────

    @GetMapping("/equipo")
    public ResponseEntity<?> equipoVinculado() {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null || !puedeGestionarEquipo(empresaId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (TelegramVinculacion v : vinculacionRepository.findActivasPorEmpresa(empresaId)) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("usuarioId", v.getUsuario().getId());
            fila.put("nombre", v.getUsuario().getNombre());
            fila.put("correo", v.getUsuario().getCorreo());
            fila.put("telegramUsername", v.getTelegramUsername());
            fila.put("fechaVinculacion", v.getFechaVinculacion() != null ? v.getFechaVinculacion().toString() : null);
            out.add(fila);
        }
        return ResponseEntity.ok(out);
    }

    @DeleteMapping("/equipo/{usuarioId}")
    public ResponseEntity<?> revocarMiembro(@PathVariable Long usuarioId) {
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null || !puedeGestionarEquipo(empresaId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        // El objetivo debe ser miembro de la MISMA empresa — nunca revocar cross-tenant
        if (!miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        vinculacionRepository.findByUsuarioId(usuarioId).ifPresent(v -> {
            v.setEstado(TelegramVinculacion.REVOCADA);
            v.setChatId(null);
            v.setContexto(null);
            v.setCodigo(null);
            v.setCodigoExpira(null);
            vinculacionRepository.save(v);
            log.info("[telegram] vinculación de usuario {} revocada por gestor de empresa {}", usuarioId, empresaId);
        });
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── Setup del webhook (solo ADMIN de plataforma) ──────────────────────────

    @PostMapping("/admin/webhook")
    public ResponseEntity<?> registrarWebhook() {
        if (!companyScope.isAdminIT()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (!bot.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "TELEGRAM_CLIENT_BOT_TOKEN no está configurado."));
        }
        try {
            String respuesta = bot.configurarWebhook();
            return ResponseEntity.ok(Map.of("telegram", respuesta != null ? respuesta : ""));
        } catch (Exception e) {
            log.error("[telegram] setWebhook falló — {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean puedeGestionarEquipo(Long empresaId) {
        if (companyScope.isAdminIT()) return true;
        Long usuarioId = companyScope.getCurrentUserId();
        if (usuarioId == null) return false;
        return miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)
            .map(MiembroEmpresa::getRolEnEmpresa)
            .map(rol -> "PROPIETARIO".equals(rol) || "ADMIN".equals(rol))
            .orElse(false);
    }

    private String generarCodigoAleatorio() {
        StringBuilder sb = new StringBuilder(LARGO_CODIGO);
        for (int i = 0; i < LARGO_CODIGO; i++) {
            sb.append(ALFABETO_CODIGO[random.nextInt(ALFABETO_CODIGO.length)]);
        }
        return sb.toString();
    }
}
