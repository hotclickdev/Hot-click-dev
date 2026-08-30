package com.hotclick.model;
import com.hotclick.utils.Constants;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Tracks shopping carts that were filled but never converted to an order.
 * items stores a JSON array: [{productoId, cantidad, precio, nombre, imagenUrl}]
 * Status transitions: PENDIENTE → EMAIL_ENVIADO → RECUPERADO | VENCIDO
 */
@Entity
@Table(name = "hot_click_carrito_abandonado_tb")
public class CarritoAbandonado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "session_id", nullable = false, length = 128)
    private String sessionId;

    @Column(name = "items", columnDefinition = "TEXT", nullable = false)
    private String items;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "status", length = 20, nullable = false)
    private String status = "PENDIENTE";

    @Column(name = "token_recuperacion", length = 36)
    private String tokenRecuperacion;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now(Constants.ZONA_CR);
        updatedAt  = createdAt;
        if (tokenRecuperacion == null || tokenRecuperacion.isBlank()) {
            tokenRecuperacion = java.util.UUID.randomUUID().toString();
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now(Constants.ZONA_CR);
    }

    public Long getId()                  { return id; }
    public void setId(Long id)           { this.id = id; }

    public Long getUserId()              { return userId; }
    public void setUserId(Long userId)   { this.userId = userId; }

    public String getSessionId()                   { return sessionId; }
    public void setSessionId(String sessionId)     { this.sessionId = sessionId; }

    public String getItems()             { return items; }
    public void setItems(String items)   { this.items = items; }

    public String getEmail()             { return email; }
    public void setEmail(String email)   { this.email = email; }

    public String getStatus()            { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTokenRecuperacion() { return tokenRecuperacion; }
    public void setTokenRecuperacion(String tokenRecuperacion) { this.tokenRecuperacion = tokenRecuperacion; }

    public LocalDateTime getCreatedAt()             { return createdAt; }
    public void setCreatedAt(LocalDateTime c)       { this.createdAt = c; }

    public LocalDateTime getUpdatedAt()             { return updatedAt; }
    public void setUpdatedAt(LocalDateTime u)       { this.updatedAt = u; }
}
