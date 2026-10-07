package com.hotclick.service.consola;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.SancionPlataforma;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.SancionPlataformaRepository;
import com.hotclick.utils.Constants;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ConsolaFichaService {

    private final EmpresaRepository empresaRepo;
    private final SancionPlataformaRepository sancionRepo;
    private final SancionPlataformaService sancionService;
    private final MetodoCobroRepository metodoRepo;
    private final PedidoRepository pedidoRepo;
    private final NotaOperadorService notaService;
    private final ConsolaMembresiaLectura membresiaLectura;

    @PersistenceContext
    private EntityManager em;

    public ConsolaFichaService(EmpresaRepository empresaRepo,
                               SancionPlataformaRepository sancionRepo,
                               SancionPlataformaService sancionService,
                               MetodoCobroRepository metodoRepo,
                               PedidoRepository pedidoRepo,
                               NotaOperadorService notaService,
                               ConsolaMembresiaLectura membresiaLectura) {
        this.empresaRepo = empresaRepo;
        this.sancionRepo = sancionRepo;
        this.sancionService = sancionService;
        this.metodoRepo = metodoRepo;
        this.pedidoRepo = pedidoRepo;
        this.notaService = notaService;
        this.membresiaLectura = membresiaLectura;
    }

    @Transactional
    public Map<String, Object> armar(Long empresaId) {
        sancionService.cerrarVencidas();
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("empresaId", empresaId);
        mapa.put("motivos", motivos(empresa));
        mapa.put("sancion", sancionRepo.findFirstByEmpresaIdAndActivaTrueOrderByCreadaDesc(empresaId).map(this::sancion).orElse(null));
        mapa.put("sanciones", sancionService.listar(empresaId));
        mapa.put("vendidos", vendidos(empresaId));
        mapa.put("notas", notaService.deEmpresa(empresaId));
        mapa.put("membresia", membresiaLectura.leer(empresaId));
        return mapa;
    }

    private List<String> motivos(Empresa empresa) {
        List<String> motivos = new ArrayList<>();
        sancionRepo.findFirstByEmpresaIdAndActivaTrueOrderByCreadaDesc(empresa.getId())
            .ifPresent(fila -> motivos.add("Sanción " + fila.getNivelAplicado().toLowerCase() + ": " + fila.getMotivo()));
        if (!tieneCuenta(empresa.getId())) motivos.add("Sin cuenta de cobro aprobada.");
        if (stockCero(empresa.getId()) && pedidosPagados(empresa.getId()) > 0) {
            motivos.add("Hay stock en cero y un pedido pagado.");
        }
        if (sinTocar(empresa.getId())) motivos.add("Hay un pedido pagado sin movimiento desde hace un día hábil.");
        return motivos;
    }

    private boolean tieneCuenta(Long empresaId) {
        return metodoRepo.findActivosByEmpresaId(empresaId).stream().anyMatch(m -> !m.isEnRevision());
    }

    private boolean stockCero(Long empresaId) {
        Number n = (Number) em.createNativeQuery("""
            SELECT COUNT(*) FROM hot_click_producto_tb
            WHERE fk_id_empresa = :id AND fk_id_estado = 1 AND COALESCE(stock_actual, 0) <= 0
            """).setParameter("id", empresaId).getSingleResult();
        return n.longValue() > 0;
    }

    private long pedidosPagados(Long empresaId) {
        Number n = (Number) em.createNativeQuery("""
            SELECT COUNT(*) FROM hot_click_pedido_tb
            WHERE fk_id_empresa = :id AND estado_pedido = 'PAGADO'
            """).setParameter("id", empresaId).getSingleResult();
        return n.longValue();
    }

    private boolean sinTocar(Long empresaId) {
        LocalDateTime limite = DiaHabil.haceUno(LocalDateTime.now(Constants.ZONA_CR));
        for (Pedido pedido : pedidoRepo.findPagadosSinMovimiento(limite)) {
            if (empresaId.equals(pedido.getEmpresaId())) return true;
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Long> vendidos(Long empresaId) {
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusDays(30);
        List<Object[]> filas = em.createNativeQuery("""
            SELECT i.fk_id_producto, COALESCE(SUM(i.cantidad), 0)
            FROM hot_click_pedido_item_tb i
            JOIN hot_click_pedido_tb p ON p.id_pedido = i.fk_id_pedido
            WHERE p.fk_id_empresa = :id
              AND p.fecha_pedido >= :desde
              AND p.estado_pedido IN ('PAGADO','ENVIADO','ENTREGADO','LISTO')
            GROUP BY i.fk_id_producto
            """).setParameter("id", empresaId).setParameter("desde", desde).getResultList();
        Map<Long, Long> vendidos = new HashMap<>();
        for (Object[] fila : filas) {
            vendidos.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
        }
        return vendidos;
    }

    private Map<String, Object> sancion(SancionPlataforma fila) {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("nivel", fila.getNivelAplicado());
        mapa.put("motivo", fila.getMotivo());
        mapa.put("fin", fila.getFin());
        mapa.put("adminEmail", fila.getAdminEmail());
        return mapa;
    }
}
