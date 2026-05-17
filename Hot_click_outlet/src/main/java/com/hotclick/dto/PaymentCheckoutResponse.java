package com.hotclick.dto;

public class PaymentCheckoutResponse {

    private Long pedidoId;
    private String numeroPedido;
    private String redirectUrl;
    private String estadoPago;
    private Integer total;
    private String proveedor;

    public PaymentCheckoutResponse() {}

    public PaymentCheckoutResponse(Long pedidoId, String numeroPedido,
                                   String redirectUrl, String estadoPago,
                                   Integer total, String proveedor) {
        this.pedidoId = pedidoId;
        this.numeroPedido = numeroPedido;
        this.redirectUrl = redirectUrl;
        this.estadoPago = estadoPago;
        this.total = total;
        this.proveedor = proveedor;
    }

    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long pedidoId) { this.pedidoId = pedidoId; }

    public String getNumeroPedido() { return numeroPedido; }
    public void setNumeroPedido(String numeroPedido) { this.numeroPedido = numeroPedido; }

    public String getRedirectUrl() { return redirectUrl; }
    public void setRedirectUrl(String redirectUrl) { this.redirectUrl = redirectUrl; }

    public String getEstadoPago() { return estadoPago; }
    public void setEstadoPago(String estadoPago) { this.estadoPago = estadoPago; }

    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }

    public String getProveedor() { return proveedor; }
    public void setProveedor(String proveedor) { this.proveedor = proveedor; }
}
