package com.hotclick.repository;

import com.hotclick.model.ProductoImagen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoImagenRepository extends JpaRepository<ProductoImagen, Long> {

    List<ProductoImagen> findByProductoIdOrderByPosicionAsc(Long productoId);

    Optional<ProductoImagen> findByProductoIdAndEsPrincipalTrue(Long productoId);
}
