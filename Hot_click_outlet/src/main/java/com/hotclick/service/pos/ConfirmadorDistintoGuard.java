package com.hotclick.service.pos;

import com.hotclick.exception.AutoconfirmacionSinpeException;
import com.hotclick.model.PosQrSesion;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Cuatro ojos en caja: quien confirma un SINPE manual no puede ser quien generó la venta.
 * Mismo mecanismo que {@code AutocompraNegocioGuard} (PR #232): guard + excepción 403 con código.
 * Fail-closed: sin autor de la sesión o sin confirmador identificado, también se rechaza.
 */
@Component
public class ConfirmadorDistintoGuard {

    public boolean esQuienGenero(PosQrSesion sesion, Long confirmadorId) {
        Long autor = sesion != null && sesion.getUsuario() != null ? sesion.getUsuario().getId() : null;
        return autor == null || confirmadorId == null || Objects.equals(autor, confirmadorId);
    }

    public void exigirConfirmadorDistinto(PosQrSesion sesion, Long confirmadorId) {
        if (esQuienGenero(sesion, confirmadorId)) throw new AutoconfirmacionSinpeException();
    }
}
