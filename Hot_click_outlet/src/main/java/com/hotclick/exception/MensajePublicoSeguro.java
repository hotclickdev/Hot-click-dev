package com.hotclick.exception;

/**
 * Marca una excepción cuyo mensaje se escribió para el usuario (validación o regla de negocio propia) y puede
 * mostrarse tal cual. Las excepciones de este paquete ya cuentan como tales; esta marca sirve para las que
 * viven en otro paquete (p. ej. el aviso de moderación). Ver {@link com.hotclick.utils.ErrorPublico}.
 */
public interface MensajePublicoSeguro {
}
