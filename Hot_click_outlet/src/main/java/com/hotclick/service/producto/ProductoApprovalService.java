package com.hotclick.service.producto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.SolicitudAprobacion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SolicitudAprobacionRepository;
import com.hotclick.service.TelegramNotificacionClienteService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class ProductoApprovalService {

    private final ProductoRepository productoRepository;
    private final EmpresaRepository empresaRepository;
    private final SolicitudAprobacionRepository solicitudAprobacionRepository;
    private final TelegramNotificacionClienteService telegramNotificacionClienteService;
    private final ObjectMapper objectMapper;
    private final ProductoAccessGuard productoAccessGuard;

    public ProductoApprovalService(ProductoRepository productoRepository,
                                   EmpresaRepository empresaRepository,
                                   SolicitudAprobacionRepository solicitudAprobacionRepository,
                                   TelegramNotificacionClienteService telegramNotificacionClienteService,
                                   ObjectMapper objectMapper,
                                   ProductoAccessGuard productoAccessGuard) {
        this.productoRepository = productoRepository;
        this.empresaRepository = empresaRepository;
        this.solicitudAprobacionRepository = solicitudAprobacionRepository;
        this.telegramNotificacionClienteService = telegramNotificacionClienteService;
        this.objectMapper = objectMapper;
        this.productoAccessGuard = productoAccessGuard;
    }

    public ProductoCreationResult aplicarReglasPublicacion(Producto producto, Empresa empresa) {
        String mensaje = "Producto creado";
        boolean empresaPublicada = empresa != null
            && "ACTIVO".equals(empresa.getEstadoEmpresa())
            && Boolean.TRUE.equals(empresa.getVisibilidadPublica());
        if (empresa != null && !productoAccessGuard.isAdminIT() && !empresaPublicada) {
            producto.setVisibleCatalogo(false);
            producto = productoRepository.save(producto);
            mensaje = "Producto creado — se publicará en el catálogo cuando tu negocio sea aprobado";
        }
        return new ProductoCreationResult(mensaje, producto);
    }

    public Optional<OfertaApprovalResult> solicitarAprobacionOfertaSiCorresponde(Producto producto,
                                                                                  Long productoId,
                                                                                  boolean enOferta,
                                                                                  Integer porcentajeDescuento,
                                                                                  Integer precioOferta)
        throws JsonProcessingException {
        if (!enOferta || productoAccessGuard.isAdminIT()) {
            return Optional.empty();
        }

        boolean yaPendiente = solicitudAprobacionRepository
            .findByEmpresa_IdOrderByFechaSolicitudDesc(producto.getEmpresaId()).stream()
            .anyMatch(s -> "OFERTA".equals(s.getTipoEntidad())
                && "PENDIENTE".equals(s.getEstadoSolicitud())
                && productoId.equals(s.getIdEntidad()));
        if (yaPendiente) {
            return Optional.of(new OfertaApprovalResult(
                409,
                "Ya tenés una promoción pendiente de revisión para este producto",
                null
            ));
        }

        Empresa empresa = empresaRepository.findById(producto.getEmpresaId()).orElse(null);
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("enOferta", enOferta);
        snapshot.put("porcentajeDescuento", porcentajeDescuento);
        snapshot.put("precioOferta", precioOferta);

        SolicitudAprobacion solicitud = new SolicitudAprobacion();
        solicitud.setTipoEntidad("OFERTA");
        solicitud.setAccionSolicitada("APLICAR");
        solicitud.setIdEntidad(productoId);
        solicitud.setEmpresa(empresa);
        solicitud.setUsuarioPide(productoAccessGuard.getCurrentUser());
        solicitud.setDatosSnapshot(objectMapper.writeValueAsString(snapshot));
        solicitudAprobacionRepository.save(solicitud);

        if (empresa != null) {
            telegramNotificacionClienteService.notificarSolicitudEnviada(
                empresa.getId(), "Tu promoción", producto.getNombreProducto());
        }

        return Optional.of(new OfertaApprovalResult(
            200,
            "Promoción enviada — pendiente de aprobación",
            Map.of("pendiente", true)
        ));
    }

    public record ProductoCreationResult(String mensaje, Producto producto) {
    }

    public record OfertaApprovalResult(int statusCode, String mensaje, Map<String, Object> data) {
    }
}
