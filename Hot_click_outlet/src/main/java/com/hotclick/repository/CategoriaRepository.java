package com.hotclick.repository;

import com.hotclick.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByEstado(Integer estado);

    List<Categoria> findByAdminClienteIdAndEstado(Long adminId, Integer estado);

    List<Categoria> findByCategoriaPadreIdAndEstado(Long padreId, Integer estado);

    List<Categoria> findByNombreCategoriaContainingIgnoreCaseAndEstado(String nombre, Integer estado);
}
