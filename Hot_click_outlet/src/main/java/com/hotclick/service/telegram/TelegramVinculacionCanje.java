package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Canje atómico del código de vinculación. Solo toca la base: ninguna llamada a Telegram vive aquí, así la
 * transacción es corta y los avisos los hace {@link TelegramVinculacionService} en afterCommit de la transacción exterior (o de inmediato si no hay).
 *
 * <p>El UPDATE condicional ({@code codigo = ? AND codigo_expira > ahora AND estado <> 'REVOCADA'}) toma el lock de la
 * fila: una revocación ya committeada deja 0 filas (no se reactiva) y dos canjes del mismo código no ganan los dos.
 */
@Component
public class TelegramVinculacionCanje {

    /** Resultado de un canje ganado: la vinculación ya ACTIVA y los chats a avisar tras el commit. */
    public record Canjeado(TelegramVinculacion vinculacion, Long chatAnterior, List<Long> chatsRevocados) { }

    @Autowired private TelegramVinculacionRepository vinculacionRepository;
    @Autowired private TelegramVinculacionPostLinkHelper postLink;

    /** @return vacío si el código no existe, venció, o la vinculación está REVOCADA / ya fue canjeada. */
    @Transactional
    public Optional<Canjeado> canjear(long chatId, String username, String codigo) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        Optional<TelegramVinculacion> opt = vinculacionRepository.findByCodigo(codigo);
        if (opt.isEmpty()) return Optional.empty();
        TelegramVinculacion previa = opt.get();
        Long id = previa.getId();
        Long chatAnterior = previa.getChatId();
        Long usuarioId = previa.getUsuario().getId();

        if (vinculacionRepository.canjearCodigo(id, codigo, chatId, username, ahora) != 1) {
            return Optional.empty();
        }

        // La fila quedó bloqueada por este UPDATE hasta el commit: ninguna revocación puede pisarla a mitad.
        TelegramVinculacion v = vinculacionRepository.findById(id).orElse(null);
        if (v == null || !TelegramVinculacion.ACTIVA.equals(v.getEstado())) {
            throw new IllegalStateException("canje inconsistente"); // rollback: no queda ACTIVA
        }
        List<Long> chatsRevocados = postLink.revocarVinculacionesPrevias(chatId, usuarioId);
        postLink.asignarEmpresaActiva(v);
        vinculacionRepository.save(v);
        return Optional.of(new Canjeado(v, chatAnterior, chatsRevocados));
    }
}
