package com.hotclick.security;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Enmascara secretos que viajan en la ruta antes de loguearla, auditarla o mandarla a Sentry (QA-122-2):
 * el token del enlace de tienda rápida y el de una invitación de equipo quedan como sus primeros 4 caracteres + «…».
 *
 * <p>Invitación de equipo: el token ya NO va en el path (va en el body de POST /api/auth/equipo-invitacion/consultar,
 * /aceptar-cuenta-nueva y POST /api/equipo-invitaciones/aceptar; el enlace del correo lo lleva en el fragmento
 * {@code #t=}). Se enmascaran igual las formas viejas (path con token, query {@code ?t=} / {@code ?token=},
 * fragmento) por si alguien llama con un enlace anterior o un cliente lo pone donde no debe.
 */
public final class RutaLogSegura {

    private static final String FIN = "(?:[/?#]|$)";
    private static final Pattern TOKEN_TIENDA_RAPIDA = Pattern.compile("(/tienda-rapida/)([^/?#]+)");
    /** Path viejo /api/auth/equipo-invitacion/{token}[/aceptar-cuenta-nueva]; los segmentos fijos nuevos no se tocan. */
    private static final Pattern TOKEN_INVITACION_AUTH =
        Pattern.compile("(/equipo-invitacion/)(?!(?:consultar|aceptar-cuenta-nueva)" + FIN + ")([^/?#]+)");
    /** Path viejo /api/equipo-invitaciones/{token}/aceptar; el segmento fijo nuevo "aceptar" no se toca. */
    private static final Pattern TOKEN_INVITACION_SESION =
        Pattern.compile("(/equipo-invitaciones/)(?!aceptar" + FIN + ")([^/?#]+)");
    /** Ruta de la SPA vieja /equipo/invitacion/{token}. */
    private static final Pattern TOKEN_INVITACION_SPA = Pattern.compile("(/equipo/invitacion/)([^/?#]+)");
    /** ?t= / &t= / #t= / token= en cualquier ruta de invitación. */
    private static final Pattern TOKEN_INVITACION_PARAM = Pattern.compile("([?&#](?:t|token)=)([^&#\\s]+)");
    private static final int VISIBLES = 4;

    private RutaLogSegura() {}

    public static String enmascarar(String ruta) {
        if (ruta == null) return null;
        String r = reemplazar(TOKEN_TIENDA_RAPIDA, ruta);
        r = reemplazar(TOKEN_INVITACION_AUTH, r);
        r = reemplazar(TOKEN_INVITACION_SESION, r);
        r = reemplazar(TOKEN_INVITACION_SPA, r);
        if (r.contains("invitacion")) r = reemplazar(TOKEN_INVITACION_PARAM, r);
        return r;
    }

    private static String reemplazar(Pattern p, String s) {
        Matcher m = p.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String token = m.group(2);
            String visible = token.length() <= VISIBLES ? "" : token.substring(0, VISIBLES);
            m.appendReplacement(sb, Matcher.quoteReplacement(m.group(1) + visible + "…"));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
