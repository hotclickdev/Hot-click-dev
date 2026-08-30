package com.hotclick.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body de POST /api/public/chat. Tipos incorrectos los rechaza Jackson (400).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class PublicChatRequest {

    @Size(max = 500, message = "El mensaje no puede superar 500 caracteres")
    private String message;

    @Min(0)
    @Max(10_000)
    private Integer offset;

    @Size(max = 12)
    @Valid
    private List<HistoryItem> history;

    @Size(max = 500)
    private String context;

    @Size(max = 5)
    private List<Long> focusIds;

    private Long productoId;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HistoryItem {
        private String rol;
        @Size(max = 500)
        private String texto;

        public String getRol() { return rol; }
        public void setRol(String rol) { this.rol = rol; }
        public String getTexto() { return texto; }
        public void setTexto(String texto) { this.texto = texto; }
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Integer getOffset() { return offset; }
    public void setOffset(Integer offset) { this.offset = offset; }

    public List<HistoryItem> getHistory() { return history; }
    public void setHistory(List<HistoryItem> history) { this.history = history; }

    public String getContext() { return context; }
    public void setContext(String context) { this.context = context; }

    public List<Long> getFocusIds() { return focusIds; }
    public void setFocusIds(List<Long> focusIds) { this.focusIds = focusIds; }

    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
}
