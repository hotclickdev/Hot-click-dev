package com.hotclick.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lanzada cuando una empresa alcanza el límite de su plan (productos, usuarios, etc.).
 * HTTP 402 Payment Required — el cliente debe hacer upgrade de plan.
 */
@ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
public class PlanLimitException extends RuntimeException {

    public PlanLimitException(String message) {
        super(message);
    }
}
