package com.hotclick.exception;

public class StockInsuficienteException extends RuntimeException {

    private final int stockDisponible;
    private final int cantidadSolicitada;

    public StockInsuficienteException(String nombreProducto, int stockDisponible, int cantidadSolicitada) {
        // CMP-3: sin revelar el stock total al comprador; los números quedan en los getters (y en logs).
        super(String.format("Stock insuficiente para '%s': no hay unidades suficientes para tu pedido", nombreProducto));
        this.stockDisponible    = stockDisponible;
        this.cantidadSolicitada = cantidadSolicitada;
    }

    public int getStockDisponible()    { return stockDisponible; }
    public int getCantidadSolicitada() { return cantidadSolicitada; }
}
