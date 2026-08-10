package org.dawn.backend.repository.catalog;

import org.dawn.backend.entity.catalog.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    boolean existsBySku(String sku);
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Product> findByBrandId(Long brandId, Pageable pageable);
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);
    Page<Product> findByIsActiveTrue(Pageable pageable);
    List<Product> findByIsActiveTrue();
    long countByIsActiveTrue();
    Page<Product> findByNameContainingIgnoreCaseAndIsActiveTrue(String name, Pageable pageable);

    @Query("""
            SELECT p FROM Product p WHERE
              (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:brandId IS NULL OR p.brand.id = :brandId)
              AND (:categoryId IS NULL OR (:categoryId = 0 AND p.category IS NULL) OR p.category.id = :categoryId)
            """)
    Page<Product> searchProducts(
            @Param("search") String search,
            @Param("brandId") Long brandId,
            @Param("categoryId") Long categoryId,
            Pageable pageable);
}
