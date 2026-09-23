package com.hotclick.dto;

public class PaymentCheckoutResponse {

    private Long pedidoId;
    private String numeroPedido;
    private String redirectUrl;
    private String estadoPago;
    private Integer total;
    private String proveedor;
    private String sdkToken;
    private String orderNumber;
    private Boolean modoEmbebido;
    /** HMAC para POST /payments/guest/cancel — solo en checkout de invitado/sesión. */
    private String cancelToken;

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
        this.modoEmbebido = false;
    }

    public static PaymentCheckoutResponse embebido(Long pedidoId, String numeroPedido,
                                                   String redirectUrl, String estadoPago,
                                                   Integer total, String proveedor,
                                                   String sdkToken, String orderNumber) {
        PaymentCheckoutResponse r = new PaymentCheckoutResponse(
            pedidoId, numeroPedido, redirectUrl, estadoPago, total, proveedor);
        r.setSdkToken(sdkToken);
        r.setOrderNumber(orderNumber);
        r.setModoEmbebido(true);
        return r;
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

    public String getSdkToken() { return sdkToken; }
    public void setSdkToken(String sdkToken) { this.sdkToken = sdkToken; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public Boolean getModoEmbebido() { return modoEmbebido; }
    public void setModoEmbebido(Boolean modoEmbebido) { this.modoEmbebido = modoEmbebido; }

    public String getCancelToken() { return cancelToken; }
    public void setCancelToken(String cancelToken) { this.cancelToken = cancelToken; }
}
