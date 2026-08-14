package org.dawn.backend.service.shared;

import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LockGuardTests {

    @Mock ProductRepository productRepository;
    @Mock SupplierRepository supplierRepository;

    @InjectMocks LockGuard lockGuard;

    private Product product(Boolean isActive, Boolean categoryActive) {
        Product p = new Product();
        p.setIsActive(isActive);
        Category c = new Category();
        c.setIsActive(categoryActive);
        p.setCategory(c);
        return p;
    }

    @Test
    void assertProductsActive_productInactive_throws() {
        when(productRepository.findByIdsWithCategory(List.of(1L))).thenReturn(List.of(product(false, true)));

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> lockGuard.assertProductsActive(List.of(1L)));
        assertEquals(ErrorCode.PRODUCT_INACTIVE.code(), ex.getCode());
    }

    @Test
    void assertProductsActive_categoryInactive_throws() {
        when(productRepository.findByIdsWithCategory(List.of(1L))).thenReturn(List.of(product(true, false)));

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> lockGuard.assertProductsActive(List.of(1L)));
        assertEquals(ErrorCode.CATEGORY_INACTIVE.code(), ex.getCode());
    }

    @Test
    void assertProductsActive_active_ok() {
        when(productRepository.findByIdsWithCategory(List.of(1L))).thenReturn(List.of(product(true, true)));

        assertDoesNotThrow(() -> lockGuard.assertProductsActive(List.of(1L)));
    }

    @Test
    void assertProductsActive_empty_ok() {
        assertDoesNotThrow(() -> lockGuard.assertProductsActive(List.of()));
    }

    @Test
    void assertSupplierActive_inactive_throws() {
        Supplier s = new Supplier();
        s.setIsActive(false);
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(s));

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> lockGuard.assertSupplierActive(1L));
        assertEquals(ErrorCode.SUPPLIER_INACTIVE.code(), ex.getCode());
    }

    @Test
    void assertSupplierActive_missing_throws() {
        when(supplierRepository.findById(1L)).thenReturn(Optional.empty());

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> lockGuard.assertSupplierActive(1L));
        assertEquals(ErrorCode.SUPPLIER_INACTIVE.code(), ex.getCode());
    }

    @Test
    void assertSupplierActive_active_ok() {
        Supplier s = new Supplier();
        s.setIsActive(true);
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(s));

        assertDoesNotThrow(() -> lockGuard.assertSupplierActive(1L));
        assertDoesNotThrow(() -> lockGuard.assertSupplierActive(null));
    }
}