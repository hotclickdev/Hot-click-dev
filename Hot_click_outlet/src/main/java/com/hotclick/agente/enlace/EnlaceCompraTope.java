package com.hotclick.agente.enlace;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * AG-14 H-04: tope de enlaces de compra vigentes sin pagar por conversación y por contacto. Un enlace abierto reserva
 * stock, así que sin tope un contacto podía pedir muchos y retener inventario. Al crear uno nuevo por encima del tope
 * vence el más viejo sin pagar (en vez de rechazar): el cliente que cambió de idea no queda bloqueado hasta las 24 h
 * y el atacante nunca retiene más de {@code maxVigentes} reservas a la vez. Los enlaces con pedido no se tocan.
 */
@Service
public class EnlaceCompraTope {

    /** Valor que no coincide con ninguna conversación real cuando el enlace no trae sesión. */
    private static final UUID SIN_SESION = new UUID(0L, 0L);

    private final EnlaceCompraRepository repo;
    private final EnlaceCompraReserva reserva;
    private final int maxVigentes;

    public EnlaceCompraTope(EnlaceCompraRepository repo, EnlaceCompraReserva reserva,
                            @Value("${hotclick.agente.enlace.max-vigentes:3}") int maxVigentes) {
        this.repo = repo;
        this.reserva = reserva;
        this.maxVigentes = Math.max(1, maxVigentes);
    }

    /**
     * Deja espacio para un enlace nuevo: vence los más viejos que sobren.
     * @return cuántos enlaces venció
     */
    public int hacerEspacio(Long empresaId, UUID sesionId, String canal, String contacto, LocalDateTime ahora) {
        UUID sesion = sesionId != null ? sesionId : SIN_SESION;
        String contactoNorm = contacto == null ? "" : contacto;
        List<Long> vigentes = empresaId == null
            ? repo.idsVigentesSinPedidoHotClick(sesion, canal, contactoNorm, ahora)
            : repo.idsVigentesSinPedido(sesion, empresaId, canal, contactoNorm, ahora);
        int sobran = vigentes.size() - (maxVigentes - 1);
        int vencidos = 0;
        for (int i = 0; i < sobran; i++) {
            if (reserva.invalidarSinPagar(vigentes.get(i))) vencidos++;
        }
        return vencidos;
    }
}
