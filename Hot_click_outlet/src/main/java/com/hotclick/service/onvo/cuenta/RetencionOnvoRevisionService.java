package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.PedidoRetencionOnvo;
import com.hotclick.repository.PedidoRetencionOnvoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

/** Cola de retenciones de ONVO que no se pudieron confirmar: las resuelve un ADMIN a mano. */
@Service
public class RetencionOnvoRevisionService {

    public static final int MAX_LISTA = 100;

    public enum Resolucion { RESUELTA, NO_HAY, DECISION_INVALIDA }

    private final PedidoRetencionOnvoRepository repo;

    public RetencionOnvoRevisionService(PedidoRetencionOnvoRepository repo) { this.repo = repo; }

    /** Las más antiguas primero, con tope. */
    public List<PedidoRetencionOnvo> porRevisar() {
        return repo.findByEstadoOrderByCreadoEnAsc(PedidoRetencionOnvo.POR_REVISAR, PageRequest.of(0, MAX_LISTA));
    }

    /**
     * CONFIRMAR_RETENIDA: ONVO sí retuvo (la marca pasa a RETENIDA). PLATAFORMA: se cobró a la plataforma (se quita
     * la marca). No acredita nada solo: el ajuste del wallet, si hace falta, lo hace el ADMIN.
     */
    public Resolucion resolver(Long pedidoId, String decision) {
        PedidoRetencionOnvo marca = repo.findByPedidoId(pedidoId).filter(PedidoRetencionOnvo::porRevisar).orElse(null);
        if (marca == null) return Resolucion.NO_HAY;
        if ("CONFIRMAR_RETENIDA".equals(decision)) {
            marca.setEstado(PedidoRetencionOnvo.RETENIDA);
            repo.save(marca);
            return Resolucion.RESUELTA;
        }
        if ("PLATAFORMA".equals(decision)) {
            repo.borrarPorPedido(pedidoId);
            return Resolucion.RESUELTA;
        }
        return Resolucion.DECISION_INVALIDA;
    }
}
