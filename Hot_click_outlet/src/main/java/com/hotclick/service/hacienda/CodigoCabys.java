package com.hotclick.service.hacienda;

public final class CodigoCabys {

    private CodigoCabys() {}

    public static boolean valido(String codigo) {
        return codigo != null && codigo.matches("\\d{13}");
    }
}
