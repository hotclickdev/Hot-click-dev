package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TelegramConfigService {

    private static final Logger log = LoggerFactory.getLogger(TelegramConfigService.class);
    private static final char[] ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int LARGO_CODIGO = 8;
    static final int MINUTOS_EXPIRA = 10;

    private final SecureRandom random = new SecureRandom();

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private TelegramClienteBotService bot;

    public Map<String, Object> generarCodigo(Usuario usuario) {
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
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("deepLink", "https://t.me/" + bot.getBotUsername() + "?start=" + codigo);
        out.put("codigo", codigo);
        out.put("expiraEnMin", MINUTOS_EXPIRA);
        out.put("botUsername", bot.getBotUsername());
        return out;
    }

    public Map<String, Object> estado(Long usuarioId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("configurado", bot.isConfigured());
        out.put("botUsername", bot.getBotUsername());
        vinculacionRepository.findByUsuarioId(usuarioId).ifPresentOrElse(v -> {
            out.put("vinculado", TelegramVinculacion.ACTIVA.equals(v.getEstado()));
            out.put("telegramUsername", v.getTelegramUsername());
            out.put("fechaVinculacion", v.getFechaVinculacion() != null ? v.getFechaVinculacion().toString() : null);
        }, () -> out.put("vinculado", false));
        return out;
    }

    public void desvincular(Long usuarioId) {
        vinculacionRepository.findByUsuarioId(usuarioId).ifPresent(this::revocar);
    }

    public List<Map<String, Object>> equipoVinculado(Long empresaId) {
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
        return out;
    }

    public boolean revocarMiembro(Long usuarioId, Long empresaId) {
        if (!miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)) {
            return false;
        }
        vinculacionRepository.findByUsuarioId(usuarioId).ifPresent(v -> {
            revocar(v);
            log.info("[telegram] vinculación de usuario {} revocada por gestor de empresa {}", usuarioId, empresaId);
        });
        return true;
    }

    public String registrarWebhook() {
        return bot.configurarWebhook();
    }

    public boolean puedeGestionarEquipo(boolean adminIt, Long usuarioId, Long empresaId) {
        if (adminIt) return true;
        if (usuarioId == null) return false;
        return miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)
            .map(MiembroEmpresa::getRolEnEmpresa)
            .map(rol -> "PROPIETARIO".equals(rol) || "ADMIN".equals(rol))
            .orElse(false);
    }

    private void revocar(TelegramVinculacion v) {
        v.setEstado(TelegramVinculacion.REVOCADA);
        v.setChatId(null);
        v.setContexto(null);
        v.setCodigo(null);
        v.setCodigoExpira(null);
        vinculacionRepository.save(v);
    }

    private String generarCodigoAleatorio() {
        StringBuilder sb = new StringBuilder(LARGO_CODIGO);
        for (int i = 0; i < LARGO_CODIGO; i++) {
            sb.append(ALFABETO_CODIGO[random.nextInt(ALFABETO_CODIGO.length)]);
        }
        return sb.toString();
    }
}
