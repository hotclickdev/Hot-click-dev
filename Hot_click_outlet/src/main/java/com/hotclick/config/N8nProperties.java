package com.hotclick.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "n8n.webhook")
public class N8nProperties {

    private String pedidoNuevo = "";
    private String pedidoEntregado = "";
    private String carritoAbandonado = "";
    private String usuarioRegistrado = "";

    public String getPedidoNuevo() { return pedidoNuevo; }
    public void setPedidoNuevo(String pedidoNuevo) { this.pedidoNuevo = pedidoNuevo; }

    public String getPedidoEntregado() { return pedidoEntregado; }
    public void setPedidoEntregado(String pedidoEntregado) { this.pedidoEntregado = pedidoEntregado; }

    public String getCarritoAbandonado() { return carritoAbandonado; }
    public void setCarritoAbandonado(String carritoAbandonado) { this.carritoAbandonado = carritoAbandonado; }

    public String getUsuarioRegistrado() { return usuarioRegistrado; }
    public void setUsuarioRegistrado(String usuarioRegistrado) { this.usuarioRegistrado = usuarioRegistrado; }
}
