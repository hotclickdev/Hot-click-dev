package com.hotclick.service.fiscal.fec;

import java.util.List;

/** Datos planos (sin entidades JPA) que viajan entre la agregación, el armado del XML y el servicio. */
public final class FecModelos {

    private FecModelos() {}

    /** El negocio al que HotClick le compra. {@code situacion} es el valor de SituacionFiscal. */
    public record Vendedor(Long empresaId, String situacion, String cedula, String nombre,
                           String actividad, String correo) {}

    /** {@code cabys} null = sin CAByS válido (línea genérica). */
    public record LineaCompra(String cabys, String detalle, long monto) {}

    /** Lo que HotClick le compró a un negocio en la quincena: ventas del negocio menos la comisión. */
    public record CompraEmpresa(Vendedor vendedor, long ventas, long comision, long monto, List<LineaCompra> lineas) {}

    public enum Resultado { GENERADA, YA_EXISTIA, OMITIDA }

    public record Item(Long empresaId, Resultado resultado, String motivo, long monto) {}

    public record Reporte(boolean activa, String mensaje, FecPeriodo periodo, List<Item> items) {}
}
