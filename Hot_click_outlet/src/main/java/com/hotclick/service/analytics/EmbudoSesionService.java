package com.hotclick.service.analytics;

import com.hotclick.dto.EmbudoRegistroRequest;
import com.hotclick.dto.EmbudoResumen;
import com.hotclick.model.EmbudoSesion;
import com.hotclick.repository.CarritoAbandonadoRepository;
import com.hotclick.repository.EmbudoSesionRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class EmbudoSesionService {

    private static final Set<String> ESTADOS_PAGADOS = Set.of(
        Constants.PEDIDO_PAGADO,
        Constants.PEDIDO_CONFIRMADO,
        Constants.PEDIDO_PREPARANDO,
        Constants.PEDIDO_EN_PREPARACION,
        Constants.PEDIDO_ENVIADO,
        Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENTREGADO,
        Constants.PEDIDO_COMPLETADO
    );

    private final EmbudoSesionRepository embudoRepo;
    private final PedidoRepository pedidoRepo;
    private final CarritoAbandonadoRepository carritoRepo;

    public EmbudoSesionService(
            EmbudoSesionRepository embudoRepo,
            PedidoRepository pedidoRepo,
            CarritoAbandonadoRepository carritoRepo) {
        this.embudoRepo = embudoRepo;
        this.pedidoRepo = pedidoRepo;
        this.carritoRepo = carritoRepo;
    }

    @Transactional
    public void registrar(EmbudoRegistroRequest req) {
        String key = req.sessionKey().trim();
        String paso = req.paso().trim();
        String motivo = motivoEnBlanco(req.motivo());
        validar(key, paso, motivo, req.monto());
        EmbudoSesion sesion = embudoRepo.findBySessionKey(key).orElseGet(() -> nueva(key));
        if (!aplicar(sesion, paso, motivo, req.monto())) return;
        guardar(sesion, key, paso, motivo, req.monto());
    }

    @Transactional(readOnly = true)
    public EmbudoResumen resumen(int diasPedidos) {
        int dias = diasPedidos == 30 ? 30 : 7;
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusDays(dias);
        LocalDateTime hasta = LocalDateTime.now(Constants.ZONA_CR).plusDays(1);
        return armar(dias, desde, hasta);
    }

    private EmbudoResumen armar(int dias, LocalDateTime desde, LocalDateTime hasta) {
        Map<String, Long> pasos = mapa(embudoRepo.contarPorPasoDesde(desde));
        Map<String, Long> motivos = mapa(embudoRepo.contarMotivosDesde(desde));
        return new EmbudoResumen(
            dias,
            alMenos(pasos, EmbudoPasos.VISITA),
            alMenos(pasos, EmbudoPasos.PRODUCTO),
            alMenos(pasos, EmbudoPasos.CARRITO),
            alMenos(pasos, EmbudoPasos.CHECKOUT),
            alMenos(pasos, EmbudoPasos.PAGO_INTENTO),
            pedidoRepo.countPorEstadosEnPeriodo(desde, hasta, ESTADOS_PAGADOS),
            motivos.getOrDefault(EmbudoPasos.BUSQUEDA_VACIA, 0L),
            motivos.getOrDefault(EmbudoPasos.ERROR_DATOS, 0L),
            motivos.getOrDefault(EmbudoPasos.ERROR_ENTREGA, 0L),
            motivos.getOrDefault(EmbudoPasos.SIN_COMPROBANTE, 0L),
            motivos.getOrDefault(EmbudoPasos.PAGO_FALLIDO, 0L),
            motivos.getOrDefault(EmbudoPasos.PAGO_CANCELADO, 0L),
            carritoRepo.countByStatusAndCreatedAtGreaterThanEqual("PENDIENTE", desde),
            carritoRepo.countByStatusAndCreatedAtGreaterThanEqual("EMAIL_ENVIADO", desde)
        );
    }

    private void guardar(EmbudoSesion sesion, String key, String paso, String motivo, Integer monto) {
        try {
            embudoRepo.save(sesion);
        } catch (DataIntegrityViolationException e) {
            if (sesion.getId() != null) throw e;
            reintentar(key, paso, motivo, monto);
        }
    }

    private void reintentar(String key, String paso, String motivo, Integer monto) {
        EmbudoSesion existente = embudoRepo.findBySessionKey(key).orElseThrow();
        if (aplicar(existente, paso, motivo, monto)) embudoRepo.save(existente);
    }

    static boolean aplicar(EmbudoSesion sesion, String paso, String motivo, Integer monto) {
        int entrante = EmbudoPasos.orden(paso);
        int actual = EmbudoPasos.orden(sesion.getPaso());
        if (entrante < actual) return false;
        boolean cambio = avanzarOMotivo(sesion, paso, motivo, entrante > actual);
        if (monto != null && !monto.equals(sesion.getMontoCarrito())) {
            sesion.setMontoCarrito(monto);
            cambio = true;
        }
        if (cambio) sesion.setActualizadoEn(LocalDateTime.now(Constants.ZONA_CR));
        return cambio;
    }

    private static boolean avanzarOMotivo(EmbudoSesion sesion, String paso, String motivo, boolean avanza) {
        if (avanza) {
            sesion.setPaso(paso);
            sesion.setMotivo(motivo);
            return true;
        }
        if (motivo != null && !motivo.equals(sesion.getMotivo())) {
            sesion.setMotivo(motivo);
            return true;
        }
        return false;
    }

    private static void validar(String key, String paso, String motivo, Integer monto) {
        if (!EmbudoPasos.claveValida(key)) {
            throw new IllegalArgumentException("La sesión no es un identificador válido");
        }
        if (EmbudoPasos.orden(paso) < 0) {
            throw new IllegalArgumentException("Paso de embudo desconocido");
        }
        if (motivo != null && !EmbudoPasos.motivoValido(motivo)) {
            throw new IllegalArgumentException("Motivo de embudo desconocido");
        }
        if (monto != null && monto < 0) {
            throw new IllegalArgumentException("El monto no puede ser negativo");
        }
    }

    private static EmbudoSesion nueva(String key) {
        EmbudoSesion sesion = new EmbudoSesion();
        sesion.setSessionKey(key);
        return sesion;
    }

    private static String motivoEnBlanco(String motivo) {
        if (motivo == null || motivo.isBlank()) return null;
        return motivo.trim();
    }

    private static Map<String, Long> mapa(List<Object[]> filas) {
        Map<String, Long> out = new HashMap<>();
        for (Object[] fila : filas) {
            if (fila[0] == null) continue;
            out.put(String.valueOf(fila[0]), ((Number) fila[1]).longValue());
        }
        return out;
    }

    private static long alMenos(Map<String, Long> porPaso, String desdePaso) {
        int minimo = EmbudoPasos.orden(desdePaso);
        long total = 0;
        for (Map.Entry<String, Long> entrada : porPaso.entrySet()) {
            if (EmbudoPasos.orden(entrada.getKey()) >= minimo) total += entrada.getValue();
        }
        return total;
    }
}
