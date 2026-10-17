package com.hotclick.security.staging;

import com.hotclick.security.HotclickUserDetails;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class StagingJwtFilterTest {

    private static final String SECRETO = "s".repeat(40);

    @AfterEach
    void limpiar() { SecurityContextHolder.clearContext(); }

    private static String token(String secreto) {
        return Jwts.builder().claim("email", "admin@staging.test").claim("role", "ADMIN")
            .signWith(Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
            .compact();
    }

    @Test
    void tokenValidoDejaHotclickUserDetailsYMarca() throws Exception {
        var req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + token(SECRETO));
        new StagingJwtFilter(SECRETO).doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth.getPrincipal()).isInstanceOf(HotclickUserDetails.class);
        assertThat(auth.getName()).isEqualTo("admin@staging.test");
        assertThat(auth.getAuthorities()).extracting("authority").containsExactly("ROLE_ADMIN");
        assertThat(req.getAttribute(StagingJwtFilter.ATTR_STAGING_AUTH)).isEqualTo(Boolean.TRUE);
    }

    @Test
    void tokenConOtraLlaveNoAutenticaNiMarca() throws Exception {
        var req = new MockHttpServletRequest();
        req.addHeader("Authorization", "Bearer " + token("x".repeat(40)));
        new StagingJwtFilter(SECRETO).doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(req.getAttribute(StagingJwtFilter.ATTR_STAGING_AUTH)).isNull();
    }
}
