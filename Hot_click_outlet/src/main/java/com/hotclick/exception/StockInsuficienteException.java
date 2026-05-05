package com.hotclick.exception;

public class StockInsuficienteException extends RuntimeException {

    private final int stockDisponible;
    private final int cantidadSolicitada;

    public StockInsuficienteException(String nombreProducto, int stockDisponible, int cantidadSolicitada) {
        super(String.format(
            "Stock insuficiente para '%s': disponible=%d, solicitado=%d",
            nombreProducto, stockDisponible, cantidadSolicitada
        ));
        this.stockDisponible    = stockDisponible;
        this.cantidadSolicitada = cantidadSolicitada;
    }

    public int getStockDisponible()    { return stockDisponible; }
    public int getCantidadSolicitada() { return cantidadSolicitada; }
}
