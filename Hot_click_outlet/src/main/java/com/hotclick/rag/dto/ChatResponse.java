package com.hotclick.rag.dto;

import java.util.List;

/**
 * Respuesta del asistente de compras.
 *
 * {@code sesionId} debe ser guardado por el frontend (localStorage / cookie)
 * y reenviado en el siguiente ChatRequest para preservar el historial.
 *
 * {@code productos} contiene los artículos que el motor RAG recuperó como
 * contexto; el frontend los renderiza como tarjetas interactivas de compra.
 */
public class ChatResponse {

    private String                respuesta;
    private String                sesionId;
    private List<ProductoContexto> productos;
    private List<String>          categorias;

    public ChatResponse() {}

    public ChatResponse(String respuesta, String sesionId,
                        List<ProductoContexto> productos, List<String> categorias) {
        this.respuesta  = respuesta;
        this.sesionId   = sesionId;
        this.productos  = productos;
        this.categorias = categorias;
    }

    public String                 getRespuesta() { return respuesta; }
    public void                   setRespuesta(String respuesta) { this.respuesta = respuesta; }

    public String                 getSesionId()  { return sesionId; }
    public void                   setSesionId(String sesionId) { this.sesionId = sesionId; }

    public List<ProductoContexto> getProductos() { return productos; }
    public void                   setProductos(List<ProductoContexto> productos) { this.productos = productos; }

    public List<String>           getCategorias() { return categorias; }
    public void                   setCategorias(List<String> categorias) { this.categorias = categorias; }
}
