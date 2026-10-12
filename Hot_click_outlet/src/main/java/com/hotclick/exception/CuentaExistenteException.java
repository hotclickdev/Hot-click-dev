package com.hotclick.exception;

/**
 * Checkout como invitado con un correo que ya tiene cuenta: nunca se adjunta la compra a esa cuenta sin
 * iniciar sesión. 409 con {@code data.codigo = "CUENTA_EXISTENTE"} y el login como siguiente paso.
 */
public class CuentaExistenteException extends RuntimeException {

    public static final String CODIGO = "CUENTA_EXISTENTE";
    public static final String SIGUIENTE_PASO = "/login?redirect=%2Fcheckout";

    public CuentaExistenteException() {
        super("Ese correo ya tiene una cuenta. Iniciá sesión para terminar tu compra.");
    }
}
