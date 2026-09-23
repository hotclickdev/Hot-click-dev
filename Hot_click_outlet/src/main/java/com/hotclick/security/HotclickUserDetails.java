package com.hotclick.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.time.LocalDateTime;
import java.util.Collection;

/**
 * UserDetails con el corte de invalidación de sesiones del usuario, para que
 * JwtRequestFilter pueda rechazar access tokens emitidos antes de un cambio
 * de contraseña sin pegarle a la base en cada request (viaja con el objeto
 * cacheado en userDetailsCache).
 */
public class HotclickUserDetails extends User {

    private final LocalDateTime sesionesInvalidadasEn;

    public HotclickUserDetails(String username, String password,
                                Collection<? extends GrantedAuthority> authorities,
                                LocalDateTime sesionesInvalidadasEn) {
        super(username, password, authorities);
        this.sesionesInvalidadasEn = sesionesInvalidadasEn;
    }

    public LocalDateTime getSesionesInvalidadasEn() {
        return sesionesInvalidadasEn;
    }
}
