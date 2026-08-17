package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Helpers comunes de los flujos multi-paso del bot de Telegram.
 * Extraído bit-idéntico de TelegramFlujoService — no cambia comportamiento.
 */
@Service
public class TelegramFlujoSupport {

    public static final int  PAGINA          = 8;
    public static final int  MAX_FOTOS       = 5;
    public static final long MAX_FOTO_BYTES  = 10L * 1024 * 1024;
    public static final List<String> METODOS_PAGO = List.of("SINPE", "EFECTIVO", "TARJETA");

    public static final String BTN_CANCELAR = "flx:x";

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private PedidoRepository              pedidoRepository;
    @Autowired private UsuarioRepository             usuarioRepository;
    @Autowired private ObjectMapper                  objectMapper;

    /**
     * PROPIETARIO o ADMIN de la empresa. Incluye al dueño directo (usuario.empresaId)
     * aunque no tenga fila en miembro_empresa — mismo criterio que empresaValidada.
     */
    public boolean esPropietarioOAdmin(Usuario usuario, Long empresaId) {
        if (usuario == null || empresaId == null) return false;
        if (empresaId.equals(usuario.getEmpresaId())) return true;
        return miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(usuario.getId(), empresaId, 1)
            .map(m -> "PROPIETARIO".equals(m.getRolEnEmpresa()) || "ADMIN".equals(m.getRolEnEmpresa()))
            .orElse(false);
    }

    /** true si NO puede gestionar (y ya se le avisó). */
    public boolean denegarSiNoGestiona(TelegramVinculacion v, Long empresaId) {
        if (esPropietarioOAdmin(v.getUsuario(), empresaId)) return false;
        bot.enviarMensaje(v.getChatId(), "Solo el propietario o un administrador del negocio puede usar esta función.");
        return true;
    }

    public boolean clientePerteneceAEmpresa(Long clienteId, Long empresaId) {
        if (pedidoRepository.existsByUsuarioFinalIdAndEmpresaId(clienteId, empresaId)) return true;
        return usuarioRepository.findById(clienteId)
            .map(u -> u.getEmpresaRegistro() != null && empresaId.equals(u.getEmpresaRegistro().getId()))
            .orElse(false);
    }

    /**
     * Borrador vigente del chat, o null (avisando al usuario) si no hay, está
     * corrupto o venció.
     */
    public TelegramFlujoEstado estadoVigente(TelegramVinculacion v) {
        Optional<TelegramFlujoEstado> opt = TelegramFlujoEstado.deserializar(v.getContexto(), objectMapper);
        if (opt.isEmpty()) {
            if (TelegramFlujoEstado.esBorrador(v.getContexto())) {
                limpiar(v);
                bot.enviarMensaje(v.getChatId(), "Se perdió el borrador anterior. Escribí /menu para empezar de nuevo.");
            }
            return null;
        }
        if (opt.get().vencido(ahora())) {
            limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Ese borrador venció. Escribí /menu para empezar de nuevo.");
            return null;
        }
        return opt.get();
    }

    public void guardar(TelegramVinculacion v, TelegramFlujoEstado e) {
        v.setContexto(e.serializar(objectMapper));
        vinculacionRepository.save(v);
    }

    public void limpiar(TelegramVinculacion v) {
        v.setContexto(null);
        vinculacionRepository.save(v);
    }

    public void cancelar(TelegramVinculacion v) {
        limpiar(v);
        bot.enviarMensaje(v.getChatId(), "Listo, cancelado. Escribí /menu cuando me necesités.");
    }

    public LocalDateTime ahora() {
        return LocalDateTime.now(Constants.ZONA_CR);
    }

    public String nombreCompleto(Usuario u) {
        String nombre = u.getNombre() != null ? u.getNombre() : "";
        String apellido = u.getApellidoPaterno() != null ? u.getApellidoPaterno() : "";
        return (nombre + " " + apellido).trim();
    }

    /** "Ana Mora 8888-8888" → ["Ana Mora", "8888-8888"]; sin teléfono → ["texto completo", null]. */
    public static String[] separarNombreTelefono(String texto) {
        String limpio = texto.trim();
        java.util.regex.Matcher m = java.util.regex.Pattern
            .compile("^(.*?)\\s*([\\d][\\d\\-\\s]{6,})$").matcher(limpio);
        if (m.matches() && !m.group(1).isBlank()) {
            return new String[]{m.group(1).trim(), m.group(2).trim()};
        }
        return new String[]{limpio, null};
    }

    /** Parsea un entero tolerando ₡, puntos, comas y espacios; null si no cumple el rango. */
    public static Integer parseEntero(String texto, int min, int max) {
        if (texto == null) return null;
        String limpio = texto.replaceAll("[₡.,\\s]", "");
        if (limpio.isEmpty() || !limpio.matches("\\d{1,9}")) return null;
        int valor = Integer.parseInt(limpio);
        return (valor >= min && valor <= max) ? valor : null;
    }

    public static Long parseLong(String texto) {
        try {
            return Long.parseLong(texto.trim());
        } catch (Exception e) {
            return null;
        }
    }

    public static String recortar(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    public static String colones(Object monto) {
        long valor = monto instanceof Number n ? n.longValue() : 0;
        return String.format("₡%,d", valor);
    }

    /** Quita caracteres que rompen el Markdown de Telegram en valores dinámicos. */
    public static String esc(String s) {
        return s == null ? "" : s.replaceAll("[*_`\\[\\]]", "");
    }
}
