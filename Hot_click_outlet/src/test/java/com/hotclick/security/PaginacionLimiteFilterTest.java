package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class PaginacionLimiteFilterTest {

    private int status(String page, String size) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/productos");
        if (page != null) req.setParameter("page", page);
        if (size != null) req.setParameter("size", size);
        MockHttpServletResponse res = new MockHttpServletResponse();
        new PaginacionLimiteFilter().doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void pageGiganteDa400() throws Exception {
        assertThat(status("999999999", null)).isEqualTo(400);
        assertThat(status("abc", null)).isEqualTo(400);
        assertThat(status("-1", null)).isEqualTo(400);
        assertThat(status("0", "0")).isEqualTo(400);
        assertThat(status("3", "20")).isEqualTo(200);
        assertThat(status(null, null)).isEqualTo(200);
    }
}
