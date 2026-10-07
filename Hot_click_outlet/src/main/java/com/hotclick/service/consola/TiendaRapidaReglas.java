package com.hotclick.service.consola;

/** Datos que acepta una tienda temporal: plazo, persona y el enlace. */
public final class TiendaRapidaReglas {

    public static final int DIAS_CORTO = 30;
    public static final int DIAS_LARGO = 60;
    public static final String ESPERANDO = "ESPERANDO";
    public static final String LISTA = "LISTA";
    public static final String VENCIDA = "VENCIDA";
    public static final String ESTADO_EMPRESA = "TEMPORAL";

    private TiendaRapidaReglas() {}

    public static int dias(Integer valor) {
        if (valor == null || (valor != DIAS_CORTO && valor != DIAS_LARGO)) {
            throw new IllegalArgumentException("El plazo es de 30 o 60 días.");
        }
        return valor;
    }

    public static String nombre(String valor, String etiqueta) {
        String limpio = valor == null ? "" : valor.replaceAll("[<>]", "").trim();
        if (limpio.length() < 2 || limpio.length() > 80) {
            throw new IllegalArgumentException(etiqueta + " necesita entre 2 y 80 caracteres.");
        }
        return limpio;
    }

    public static String telefono(String valor) {
        String digitos = valor == null ? "" : valor.replaceAll("\\D", "");
        if (digitos.startsWith("506") && digitos.length() > 8) digitos = digitos.substring(3);
        if (digitos.length() != 8) {
            throw new IllegalArgumentException("El teléfono es de Costa Rica, de 8 dígitos.");
        }
        return digitos;
    }

    public static String cedula(String valor) {
        String digitos = valor == null ? "" : valor.replaceAll("\\D", "");
        if (digitos.length() < 9 || digitos.length() > 12) {
            throw new IllegalArgumentException("La cédula va con 9 a 12 dígitos.");
        }
        return digitos;
    }

    public static String correo(String valor) {
        String limpio = valor == null ? "" : valor.trim().toLowerCase();
        if (limpio.length() > 100 || !limpio.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("El correo no parece válido.");
        }
        return limpio;
    }

    public static String clave(String valor) {
        if (valor == null || valor.length() < 8 || valor.length() > 72) {
            throw new IllegalArgumentException("La contraseña necesita entre 8 y 72 caracteres.");
        }
        return valor;
    }

    public static String token(String valor) {
        if (valor == null || !valor.matches("[A-Za-z0-9_-]{20,64}")) {
            throw new IllegalArgumentException("Ese enlace no sirve.");
        }
        return valor;
    }
}
