package com.hotclick.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Ningún mecanismo (header X-Tenant-Slug ni TenantContext de JWT) resolvió una empresa. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class TenantNotFoundException extends RuntimeException {

    public TenantNotFoundException(String message) {
        super(message);
    }
}
