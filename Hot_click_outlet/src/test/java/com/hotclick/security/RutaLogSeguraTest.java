package com.hotclick.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QA-122-2: el token del enlace no llega entero a logs ni auditoría")
class RutaLogSeguraTest {

    @Test
    void enmascaraTokenDeTiendaRapida() {
        String enlace = "AbCd" + "EfGhIjKlMnOpQrStUvWx";
        assertThat(RutaLogSegura.enmascarar("/api/public/tienda-rapida/" + enlace))
            .isEqualTo("/api/public/tienda-rapida/AbCd…").doesNotContain(enlace.substring(4));
        assertThat(RutaLogSegura.enmascarar("/tienda-rapida/" + enlace + "?x=1")).isEqualTo("/tienda-rapida/AbCd…?x=1");
        assertThat(RutaLogSegura.enmascarar("/api/productos/12")).isEqualTo("/api/productos/12");
        assertThat(RutaLogSegura.enmascarar(null)).isNull();
    }

    @Test
    void enmascaraTokenDeInvitacionDeEquipoEnPathViejoQueryYFragmento() {
        String t = "AbCd" + "EfGhIjKlMnOpQrStUvWxYz0123456789abc";
        String resto = t.substring(4);
        assertThat(RutaLogSegura.enmascarar("/api/auth/equipo-invitacion/" + t)).isEqualTo("/api/auth/equipo-invitacion/AbCd…");
        assertThat(RutaLogSegura.enmascarar("/api/auth/equipo-invitacion/" + t + "/aceptar-cuenta-nueva"))
            .isEqualTo("/api/auth/equipo-invitacion/AbCd…/aceptar-cuenta-nueva");
        assertThat(RutaLogSegura.enmascarar("/api/equipo-invitaciones/" + t + "/aceptar"))
            .isEqualTo("/api/equipo-invitaciones/AbCd…/aceptar");
        assertThat(RutaLogSegura.enmascarar("/equipo/invitacion/" + t)).isEqualTo("/equipo/invitacion/AbCd…");
        assertThat(RutaLogSegura.enmascarar("/equipo/invitacion?t=" + t + "&x=1")).isEqualTo("/equipo/invitacion?t=AbCd…&x=1");
        assertThat(RutaLogSegura.enmascarar("/equipo/invitacion#t=" + t)).isEqualTo("/equipo/invitacion#t=AbCd…");
        assertThat(RutaLogSegura.enmascarar("/api/auth/equipo-invitacion/consultar?token=" + t))
            .isEqualTo("/api/auth/equipo-invitacion/consultar?token=AbCd…");
        assertThat(RutaLogSegura.enmascarar("/api/auth/equipo-invitacion/" + t + "?token=" + t)).doesNotContain(resto);
    }

    @Test
    void lasRutasNuevasSinTokenNoSeAlteran() {
        assertThat(RutaLogSegura.enmascarar("/api/auth/equipo-invitacion/consultar")).isEqualTo("/api/auth/equipo-invitacion/consultar");
        assertThat(RutaLogSegura.enmascarar("/api/auth/equipo-invitacion/aceptar-cuenta-nueva"))
            .isEqualTo("/api/auth/equipo-invitacion/aceptar-cuenta-nueva");
        assertThat(RutaLogSegura.enmascarar("/api/equipo-invitaciones/aceptar")).isEqualTo("/api/equipo-invitaciones/aceptar");
        assertThat(RutaLogSegura.enmascarar("/equipo/invitacion")).isEqualTo("/equipo/invitacion");
        // t= en una ruta que no es de invitación no se toca
        assertThat(RutaLogSegura.enmascarar("/api/productos?t=abcdefghij")).isEqualTo("/api/productos?t=abcdefghij");
    }
}
