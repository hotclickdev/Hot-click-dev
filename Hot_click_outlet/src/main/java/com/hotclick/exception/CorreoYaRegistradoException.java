package com.hotclick.exception;

/**
 * Registro de negocio con un correo que ya tiene cuenta (compradora, social o un intento anterior a medias).
 * Se responde 409 con {@code data.codigo = "CORREO_YA_REGISTRADO"} y el siguiente paso: iniciar sesión y
 * completar el negocio en /registrar-negocio (upgrade atómico de la cuenta existente).
 */
public class CorreoYaRegistradoException extends IllegalArgumentException {

    public static final String CODIGO = "CORREO_YA_REGISTRADO";
    public static final String SIGUIENTE_PASO = "/login?redirect=%2Fregistrar-negocio";

    public CorreoYaRegistradoException() {
        super("El correo ya está registrado. Iniciá sesión con esa cuenta y completá los datos de tu negocio.");
    }
}
