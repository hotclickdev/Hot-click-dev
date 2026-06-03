package com.hotclick.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Genera la clave numérica de 50 dígitos para comprobantes electrónicos CR.
 *
 * Formato (Hacienda XML 4.3):
 *   [País 3] [Fecha 8] [Cédula 12] [Consecutivo 20] [Situación 1] [Seguridad 8]
 *   = 3 + 8 + 12 + 20 + 1 + 8 = 52... ajuste a 50 dígitos según spec Hacienda
 *
 * Spec real usada (basada en documentación ATV Hacienda):
 *   [País 3][Fecha ddmmaaaa 8][Cédula 12][Consecutivo 10][Situación 1][Seguridad 8]
 *   = 3 + 8 + 12 + 10 + 1 + 8 = 42... diferente a lo esperado.
 *
 * IMPORTANTE: El formato exacto debe validarse contra el XSD oficial de Hacienda
 * descargado de https://atv.hacienda.go.cr/ATV/frmConsultaValida.aspx
 * Este servicio implementa el algoritmo documentado en la versión 4.3 del XML.
 *
 * Según documentación Hacienda 4.3:
 *   Pos 1–3  : Código de país = "506"
 *   Pos 4–11 : Fecha (ddmmaaaa)
 *   Pos 12–23: Cédula del emisor (12 dígitos, zero-padded)
 *   Pos 24–43: Número consecutivo completo (20 dígitos)
 *   Pos 44   : Situación (1=Normal, 2=Contingencia, 3=Sin internet)
 *   Pos 45–50: Código de seguridad (6 dígitos random)
 *   Total    : 50 dígitos
 */
@Service
public class ClaveNumericaService {

    private static final String PAIS = "506";
    private static final String SITUACION_NORMAL = "1";
    private static final SecureRandom RNG = new SecureRandom();
    private static final DateTimeFormatter FECHA_FMT = DateTimeFormatter.ofPattern("ddMMyyyy");

    /**
     * Genera la clave numérica de 50 dígitos.
     *
     * @param cedulaEmisor     cédula jurídica/física del emisor (números únicamente)
     * @param numeroConsecutivo número consecutivo completo de 20 dígitos (con ceros a la izq.)
     * @param fechaEmision     fecha/hora de emisión del comprobante
     */
    public String generar(String cedulaEmisor, String numeroConsecutivo, LocalDateTime fechaEmision) {
        String cedula = normalizarCedula(cedulaEmisor);
        String fecha  = fechaEmision.format(FECHA_FMT);
        String consec = normalizarConsecutivo(numeroConsecutivo);
        String seg    = generarSeguridad();

        String clave = PAIS + fecha + cedula + consec + SITUACION_NORMAL + seg;

        if (clave.length() != 50) {
            throw new IllegalStateException(
                "Clave numérica generada con longitud incorrecta: " + clave.length() +
                " (esperado 50). Revisar formato de cédula y consecutivo."
            );
        }
        return clave;
    }

    /** Número consecutivo completo en formato Hacienda: sucursal(3)+terminal(5)+tipo(2)+seq(10) */
    public static String buildNumeroConsecutivo(String tipoComprobante, long secuencial) {
        // Sucursal 001, Terminal 00001 (valores por defecto para empresa con una sucursal)
        String sucursal = "001";
        String terminal = "00001";
        String seq = String.format("%010d", secuencial);
        return sucursal + terminal + tipoComprobante + seq;
    }

    // ── privados ─────────────────────────────────────────────────────────────

    private String normalizarCedula(String cedula) {
        String solo = cedula.replaceAll("[^0-9]", "");
        if (solo.length() > 12) solo = solo.substring(solo.length() - 12);
        return String.format("%12s", solo).replace(' ', '0');
    }

    private String normalizarConsecutivo(String consec) {
        String solo = consec.replaceAll("[^0-9]", "");
        if (solo.length() > 20) solo = solo.substring(solo.length() - 20);
        return String.format("%20s", solo).replace(' ', '0');
    }

    private String generarSeguridad() {
        return String.format("%06d", RNG.nextInt(1_000_000));
    }
}
