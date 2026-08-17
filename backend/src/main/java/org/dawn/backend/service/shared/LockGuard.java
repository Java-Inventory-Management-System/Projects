package org.dawn.backend.service.shared;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.springframework.stereotype.Service;

import java.util.Collection;

@Service
@RequiredArgsConstructor
public class LockGuard {

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;

    public void assertProductsActive(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) return;
        for (Product product : productRepository.findByIdsWithCategory(productIds)) {
            if (!Boolean.TRUE.equals(product.getIsActive())) {
                throw new InvalidRequestException(ErrorCode.PRODUCT_INACTIVE);
            }
            if (product.getCategory() != null && !Boolean.TRUE.equals(product.getCategory().getIsActive())) {
                throw new InvalidRequestException(ErrorCode.CATEGORY_INACTIVE);
            }
        }
    }

    public void assertSupplierActive(Long supplierId) {
        if (supplierId == null) return;
        supplierRepository.findById(supplierId)
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .orElseThrow(() -> new InvalidRequestException(ErrorCode.SUPPLIER_INACTIVE));
    }
}