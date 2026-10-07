package com.hotclick.service.consola;

import com.hotclick.service.wallet.AggregatorCommissionMath;
import com.hotclick.service.wallet.AggregatorCommissionMath.Resultado;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Cierre de quincena: comisión sobre productos, envío aparte, y qué sí sale del banco. */
public final class QuincenaCalculo {

    private QuincenaCalculo() {}

    public record Linea(long productos, long comision, long envio, long neto,
                        long pasarela, long operar, boolean saleDelBanco, boolean marcado) {}

    public static Linea dePedido(long total, long envio, BigDecimal pct, boolean minimo, long minCrc, int pctGateway,
                                 boolean efectivo, Long efectivoAnotado, boolean cuentaAprobada, boolean cuentaNueva) {
        long envioAcotado = Math.max(0L, Math.min(Math.max(0L, envio), Math.max(0L, total)));
        long productos = Math.max(0L, total) - envioAcotado;
        Resultado resultado = AggregatorCommissionMath.calcular(productos, pct, minimo, minCrc, pctGateway);
        boolean cuadra = !efectivo || (efectivoAnotado != null && efectivoAnotado == total);
        long neto = resultado.neto() + envioAcotado;
        return new Linea(productos, resultado.totalComision(), envioAcotado, neto,
            resultado.comisionGw(), resultado.comisionSaas(),
            saleDelBanco(efectivo, cuentaAprobada, cuentaNueva, cuadra, neto),
            efectivo && !cuadra);
    }

    /** El efectivo del mensajero no se gira otra vez. Una cuenta de esta quincena espera a la siguiente. */
    public static boolean saleDelBanco(boolean efectivo, boolean cuentaAprobada, boolean cuentaNueva,
                                       boolean cuadra, long neto) {
        if (efectivo || !cuadra) return false;
        return cuentaAprobada && !cuentaNueva && neto > 0;
    }

    public static boolean registradaEnQuincena(LocalDateTime creada, LocalDate hoy) {
        if (creada == null || hoy == null) return true;
        LocalDate dia = creada.toLocalDate();
        return !dia.isBefore(inicio(hoy)) && !dia.isAfter(fin(hoy));
    }

    public static LocalDate inicio(LocalDate hoy) {
        return hoy.getDayOfMonth() <= 15 ? hoy.withDayOfMonth(1) : hoy.withDayOfMonth(16);
    }

    public static LocalDate fin(LocalDate hoy) {
        return hoy.getDayOfMonth() <= 15 ? hoy.withDayOfMonth(15) : hoy.withDayOfMonth(hoy.lengthOfMonth());
    }
}
