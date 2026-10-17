package com.hotclick.exception;

/**
 * Alta (comprador, negocio o tienda rápida) con datos que ya tienen cuenta. Regla del dueño (16-oct-2026):
 * <ul>
 *   <li>Correo ya registrado: se dice, con un único enlace «Recuperar cuenta» (el código de recuperación
 *       llega solo a ese correo). Ningún otro dato: ni negocio, ni plan.</li>
 *   <li>Cédula ya registrada: mensaje genérico, que no confirma si existe.</li>
 * </ul>
 * Status 400 en los dos casos, con el mismo piso de tiempo (RespuestaUniforme).
 */
public class RegistroDuplicadoException extends IllegalArgumentException {

    public static final String MENSAJE_CORREO = "Ese correo ya está registrado.";
    public static final String RUTA_RECUPERAR = "/recuperar-contrasena";

    public static final String MENSAJE =
        "No pudimos completar el registro; si ya tenés cuenta, iniciá sesión o recuperá el acceso";

    private final boolean porCorreo;

    private RegistroDuplicadoException(String mensaje, boolean porCorreo) {
        super(mensaje);
        this.porCorreo = porCorreo;
    }

    public static RegistroDuplicadoException porCorreo() {
        return new RegistroDuplicadoException(MENSAJE_CORREO, true);
    }

    public static RegistroDuplicadoException porCedula() {
        return new RegistroDuplicadoException(MENSAJE, false);
    }

    public boolean isPorCorreo() {
        return porCorreo;
    }

    /** Único dato extra permitido en la respuesta: el enlace a recuperar la cuenta, solo si es por correo. */
    public java.util.Map<String, Object> datosRespuesta() {
        return porCorreo ? java.util.Map.of("recuperar", RUTA_RECUPERAR) : null;
    }
}
