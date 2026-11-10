package com.hotclick.service.suscripcion;

import com.hotclick.repository.PlanRepository;
import com.hotclick.utils.PaginasCompletas;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lector compartido de GET /api/planes y GET /api/billing/planes: TODOS los planes activos (sin filtrar por nombre),
 * leídos en páginas de {@link #TAMANO_PAGINA} con orden estable (precio_mensual, id) hasta la última página.
 *
 * <p>Todas las páginas corren en UNA transacción de solo lectura que, como primera sentencia, pide REPEATABLE READ
 * con {@link SnapshotLecturaPg} ({@code SET TRANSACTION}, no de sesión) y lo verifica: en Postgres todas las páginas
 * ven el snapshot tomado en la primera consulta, así un alta, baja o cambio de precio concurrente no produce faltantes
 * ni duplicados entre páginas. El aislamiento no se pide con {@code @Transactional(isolation=...)} porque eso termina
 * en {@code Connection.setTransactionIsolation}, que pgjdbc ejecuta como SET SESSION. Los planes se copian a
 * {@link PlanPublicoVista} dentro de la transacción.
 *
 * <p>REQUIRES_NEW (y no REQUIRED): con REQUIRED, si alguien lo llamara dentro de una transacción ya abierta (por
 * ejemplo READ COMMITTED, que ya hizo consultas), se uniría a ella y el SET TRANSACTION fallaría o no tendría efecto.
 * REQUIRES_NEW garantiza siempre una transacción propia y nueva con REPEATABLE READ. Los dos endpoints no abren
 * transacción (controladores sin @Transactional y spring.jpa.open-in-view=false), así que en ellos usa una sola conexión; solo un llamador con transacción propia
 * pagaría una conexión adicional del pool mientras la suya queda suspendida. La lectura no toma locks de fila.
 *
 * <p>Paginar acota el tamaño de cada consulta, no la memoria ni el tiempo: la lista completa queda en memoria. Si una
 * página falla, la excepción sube y no se devuelve una lista parcial.
 */
@Service
public class PlanesActivosLector {

    public static final Sort ORDEN = Sort.by(Sort.Order.asc("precioMensual"), Sort.Order.asc("id"));
    public static final int TAMANO_PAGINA = 50;

    private final PlanRepository planRepo;
    private final SnapshotLecturaPg snapshot;

    public PlanesActivosLector(PlanRepository planRepo, SnapshotLecturaPg snapshot) {
        this.planRepo = planRepo;
        this.snapshot = snapshot;
    }

    /**
     * Todos los activos desde {@code primera} hasta la última página, en una sola transacción REPEATABLE READ (Postgres).
     * {@code primera} tiene que ser la página 0, acotada y con {@link #ORDEN} (orden estable): si no, se rechaza.
     */
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public List<PlanPublicoVista> activos(Pageable primera) {
        if (primera == null || primera.isUnpaged() || primera.getPageNumber() != 0 || !ORDEN.equals(primera.getSort())) {
            throw new IllegalArgumentException("Se requiere la página 0 acotada con orden precioMensual, id");
        }
        snapshot.exigirRepeatableRead(); // primera sentencia de la transacción
        return PaginasCompletas.todas(planRepo::findByActivoTrue, primera).stream().map(PlanPublicoVista::de).toList();
    }
}
