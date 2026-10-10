package com.hotclick.exception;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** 400 con errores por campo ({@code data.campos}: campo → mensaje). */
public class CamposInvalidosException extends RuntimeException {

    private final transient Map<String, String> campos;

    public CamposInvalidosException(String mensaje, Map<String, String> campos) {
        super(mensaje);
        this.campos = Collections.unmodifiableMap(new LinkedHashMap<>(campos));
    }

    public Map<String, String> getCampos() { return campos; }
}
