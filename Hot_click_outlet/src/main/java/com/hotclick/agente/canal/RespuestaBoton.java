package com.hotclick.agente.canal;

import java.util.Optional;

/** Interpreta los ids de botón que devuelve el webhook (button_reply, list_reply, postback). */
public record RespuestaBoton(Tipo tipo, Long productoId) {

    public enum Tipo { COMPRAR, VER_MAS, HABLAR_CON_PERSONA }

    /** @return vacío si el texto no es un id de botón conocido (es texto libre del cliente). */
    public static Optional<RespuestaBoton> parsear(String idOTexto) {
        if (idOTexto == null) return Optional.empty();
        String s = idOTexto.trim();
        if (s.equals(Boton.ID_PERSONA)) return Optional.of(new RespuestaBoton(Tipo.HABLAR_CON_PERSONA, null));
        int i = s.indexOf(':');
        if (i <= 0 || i == s.length() - 1) return Optional.empty();
        Tipo tipo = switch (s.substring(0, i)) {
            case "comprar" -> Tipo.COMPRAR;
            case "ver" -> Tipo.VER_MAS;
            default -> null;
        };
        if (tipo == null) return Optional.empty();
        try {
            long id = Long.parseLong(s.substring(i + 1));
            return id > 0 ? Optional.of(new RespuestaBoton(tipo, id)) : Optional.empty();
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
}
