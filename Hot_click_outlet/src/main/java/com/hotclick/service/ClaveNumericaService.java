package com.hotclick.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Clave numérica de 50 dígitos (Hacienda CR, igual en 4.3 y 4.4):
 * 506 + dd + MM + yy + cédula emisor (12) + consecutivo (20) + situación + seguridad (8).
 */
@Service
public class ClaveNumericaService {

    private static final String PAIS = "506";
    private static final String SITUACION_NORMAL = "1";
    private static final SecureRandom RNG = new SecureRandom();
    private static final DateTimeFormatter FECHA_FMT = DateTimeFormatter.ofPattern("ddMMyy");

    /**
     * @param cedulaEmisor      cédula del emisor; se rellena con ceros a la izquierda hasta 12
     * @param numeroConsecutivo consecutivo de 20 dígitos (sucursal + terminal + tipo + secuencia)
     * @param fechaEmision      fecha del comprobante en hora de Costa Rica
     */
    public String generar(String cedulaEmisor, String numeroConsecutivo, LocalDateTime fechaEmision) {
        return armar(cedulaEmisor, numeroConsecutivo, fechaEmision, generarSeguridad());
    }

    /** Número consecutivo: sucursal 001 + terminal 00001 + tipo (2) + secuencia (10). */
    public static String buildNumeroConsecutivo(String tipoComprobante, long secuencial) {
        String seq = String.format("%010d", secuencial);
        return "001" + "00001" + tipoComprobante + seq;
    }

    String armar(String cedulaEmisor, String numeroConsecutivo, LocalDateTime fechaEmision, String seguridad) {
        String clave = PAIS
            + fechaEmision.format(FECHA_FMT)
            + normalizarCedula(cedulaEmisor)
            + normalizarConsecutivo(numeroConsecutivo)
            + SITUACION_NORMAL
            + seguridad;

        if (clave.length() != 50 || !clave.chars().allMatch(Character::isDigit)) {
            throw new IllegalStateException(
                "Clave numérica generada con longitud incorrecta: " + clave.length() +
                " (esperado 50). Revisar formato de cédula y consecutivo."
            );
        }
        return clave;
    }

    private static String normalizarCedula(String cedula) {
        String solo = cedula == null ? "" : cedula.replaceAll("[^0-9]", "");
        if (solo.length() > 12) solo = solo.substring(solo.length() - 12);
        return String.format("%12s", solo).replace(' ', '0');
    }

    private static String normalizarConsecutivo(String consec) {
        String solo = consec == null ? "" : consec.replaceAll("[^0-9]", "");
        if (solo.length() > 20) solo = solo.substring(solo.length() - 20);
        return String.format("%20s", solo).replace(' ', '0');
    }

    private static String generarSeguridad() {
        int n = RNG.nextInt(100_000_000);
        if (n == 0) n = 1;
        return String.format("%08d", n);
    }
}
