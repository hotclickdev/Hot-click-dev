package com.hotclick.repository;

import com.hotclick.model.PublicacionFacebook;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PublicacionFacebookRepository extends JpaRepository<PublicacionFacebook, Long> {
    List<PublicacionFacebook> findAllByOrderByFechaCreacionDesc();
    List<PublicacionFacebook> findByEstadoPublicacionOrderByFechaCreacionDesc(String estado);
    Optional<PublicacionFacebook> findByProductoId(Long productoId);
}
